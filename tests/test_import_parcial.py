"""
Tests de la importacion parcial: el archivo se acepta siempre, las operaciones
buenas se guardan y las malas se le explican al usuario una a una.

POR QUE EXISTEN

El endpoint de subida construia las operaciones con el modelo de la base de
datos, saltandose el TradeCreate que si valida: una operacion incoherente de un
reporte de broker entraba sin rechistar y luego rompia las estadisticas.

Ademas, `float(celda_vacia)` lanzaba ValueError y la excepcion subia hasta el
endpoint: un solo dato raro en la fila 300 hacia que no se importara NINGUNA de
las 502 operaciones del archivo.

Ninguno de los dos fallos lo cubria ningun test.
"""

import io

import pytest

from app.fifo_engine import ClosedTrade
from app.import_validacion import (
    CODIGOS_RECHAZO,
    separa_repetidas,
    valida_trades_de_archivo,
)
from app.parsers.mt5_parser import MT5Parser
from app.trades import _pick_parser

MT5 = "sample_data/ReportHistory-35023263.xlsx"


def _trade(**cambios) -> ClosedTrade:
    """Una operacion buena, con lo que se quiera romperle cambiado."""
    base = dict(
        symbol="EURUSD",
        direction="long",
        quantity=0.1,
        entry_price=1.1,
        exit_price=1.2,
        pnl_bruto=1000.0,
    )
    base.update(cambios)
    return ClosedTrade(**base)


def _subir(client, cuenta, contenido: bytes, nombre="reporte.xlsx"):
    """Sube un archivo y devuelve la respuesta."""
    return client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": (nombre, io.BytesIO(contenido), "application/octet-stream")},
    )


# --- El archivo se acepta siempre ----------------------------------------


def test_archivo_limpio_no_devuelve_rechazos(client, cuenta):
    """El caso normal no cambia: la respuesta sigue siendo la de antes."""
    with open(MT5, "rb") as f:
        r = _subir(client, cuenta, f.read())

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo == {"trades_guardados": 20}


def test_rechazos_no_aparecen_si_no_hay(client, cuenta):
    """El frontend decide si hay aviso mirando `rechazos`; si no existe, no pinta nada."""
    with open(MT5, "rb") as f:
        cuerpo = _subir(client, cuenta, f.read()).json()

    assert "rechazos" not in cuerpo


def test_se_guardan_las_validas_aunque_haya_rechazos(client, cuenta, monkeypatch):
    """Lo que se puede guardar, se guarda. El archivo no se pierde entero."""
    import app.trades as modulo

    good = [_trade(position=str(i)) for i in range(3)]
    malas = [
        _trade(position="9", quantity=0),
        _trade(position="10", symbol=""),
        _trade(position="11", direction="buy"),
    ]
    monkeypatch.setattr(
        modulo, "_pick_parser",
        lambda ruta: _ParserFalso(good + malas),
    )

    r = _subir(client, cuenta, b"x")

    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["trades_guardados"] == 3
    assert cuerpo["trades_leidos"] == 6
    assert len(cuerpo["rechazos"]) == 3


class _ParserFalso:
    """Un parser que devuelve lo que se le pase, sin tocar disco."""

    def __init__(self, trades, filas=None):
        self._trades = trades
        self._filas = filas

    def parse(self, ruta):
        return list(self._trades)

    def parse_con_filas(self, ruta):
        if self._filas is None:
            return list(self._trades), [None] * len(self._trades)
        return list(self._trades), list(self._filas)


# --- Que se rechaza y por que --------------------------------------------


@pytest.mark.parametrize(
    "cambios, codigo",
    [
        ({"symbol": ""}, "symbol_empty"),
        ({"symbol": "   "}, "symbol_empty"),
        ({"symbol": "E" * 41}, "symbol_too_long"),
        ({"direction": "buy"}, "direction_invalid"),
        ({"direction": None}, "direction_invalid"),
        ({"quantity": 0}, "quantity_not_positive"),
        ({"quantity": -1}, "quantity_not_positive"),
        ({"quantity": None}, "quantity_unreadable"),
        ({"entry_price": 0}, "entry_price_not_positive"),
        ({"entry_price": None}, "entry_price_unreadable"),
        ({"exit_price": -0.5}, "exit_price_not_positive"),
        ({"exit_price": None}, "exit_price_unreadable"),
    ],
)
def test_cada_operacion_incoherente_rechaza_con_su_codigo(cambios, codigo):
    validas, rechazos = valida_trades_de_archivo([_trade(**cambios)])

    assert validas == []
    assert len(rechazos) == 1
    assert rechazos[0].codigo == codigo


def test_una_operacion_buena_pasa():
    validas, rechazos = valida_trades_de_archivo([_trade()])

    assert len(validas) == 1
    assert rechazos == []


def test_NaN_se_rechaza_y_no_pasa_como_valida():
    """NaN es 'verdadero' en Python, asi que una comparacion ingenua lo deja pasar.

    Con NaN, `cantidad <= 0` es False y la operacion entraba como buena con un
    NaN dentro, que luego hacia que TODAS las sumas de la cuenta dieran NaN.
    """
    validas, rechazos = valida_trades_de_archivo([_trade(quantity=float("nan"))])

    assert validas == []
    assert rechazos[0].codigo == "quantity_unreadable"


def test_se_informa_solo_del_primer_problema_de_cada_operacion():
    """Dos motivos a la vez sobre la misma fila solo confunden.

    Se arregla el primero, se vuelve a subir, y entonces aparece el segundo.
    """
    _, rechazos = valida_trades_de_archivo([_trade(symbol="", quantity=0)])

    assert len(rechazos) == 1
    assert rechazos[0].codigo == "symbol_empty"


def test_las_filas_vienen_en_el_mismo_orden_que_las_operaciones():
    """Si las filas se cruzaran, el usuario corregiria la fila equivocada."""
    trades = [
        _trade(symbol="AAA", quantity=0),
        _trade(symbol="BBB"),
        _trade(symbol="CCC", direction="buy"),
    ]

    _, rechazos = valida_trades_de_archivo(trades, filas=[7, 8, 9])

    assert [r.fila for r in rechazos] == [7, 9]
    assert [r.simbolo for r in rechazos] == ["AAA", "CCC"]


def test_sin_filas_conocidas_el_rechazo_no_inventa_una():
    """Un parser que no sabe contar filas deja None, y el frontend lo dira."""
    _, rechazos = valida_trades_de_archivo([_trade(quantity=0)])

    assert rechazos[0].fila is None


# --- Contrato con el frontend --------------------------------------------


def test_el_codigo_siempre_esta_en_la_lista():
    """Nada puede devolver un codigo que el frontend no sepa traducir."""
    _, rechazos = valida_trades_de_archivo(
        [
            _trade(symbol=""),
            _trade(symbol="E" * 41),
            _trade(direction="buy"),
            _trade(quantity=None),
            _trade(quantity=0),
            _trade(entry_price=None),
            _trade(entry_price=0),
            _trade(exit_price=None),
            _trade(exit_price=0),
        ]
    )

    for r in rechazos:
        assert r.codigo in CODIGOS_RECHAZO


def test_no_hay_texto_en_espanol_en_el_rechazo():
    """El backend manda codigos, no frases.

    Si alguien anade un 'motivo' redactado, el usuario que este en ingles leeria
    un mensaje que no entiende, y el texto existiria en dos sitios a la vez sin
    que ninguna comprobacion lo detectara.
    """
    _, rechazos = valida_trades_de_archivo(
        [_trade(quantity=0), _trade(symbol=""), _trade(entry_price=0)]
    )

    for r in rechazos:
        campos = set(r.model_dump())
        assert campos == {"fila", "simbolo", "fecha", "campo", "valor", "codigo"}, campos


def test_la_fecha_viene_en_iso_para_poder_formatearla():
    """La fecha no puede venir ya escrita: el formato depende del idioma."""
    from datetime import datetime

    _, rechazos = valida_trades_de_archivo(
        [_trade(quantity=0, entry_time=datetime(2026, 9, 25, 7, 58))]
    )

    assert rechazos[0].fecha == "2026-09-25T07:58:00"


# --- El parser no tumba el archivo entero --------------------------------


def test_una_celda_de_volumen_ilegible_no_tumba_el_archivo(client, cuenta, monkeypatch):
    """El fallo que mas dano hacia: un dato raro y se perdia TODO el archivo."""
    import pandas as pd

    import app.trades as modulo
    from app.parsers.file_reader import read_any_table

    raw = read_any_table(MT5)
    # Se cambia el volumen de la fila 10 (base 0) a una celda vacia.
    start = MT5Parser()._find_positions_header_row(raw)
    fila = start + 3
    dato = raw.copy()
    dato.iloc[fila, 4] = None

    original = read_any_table

    def _roto(ruta):
        return dato if ruta.endswith(".xlsx") else original(ruta)

    monkeypatch.setattr("app.parsers.mt5_parser.read_any_table", _roto)
    monkeypatch.setattr("app.parsers.file_reader.read_any_table", _roto)
    monkeypatch.setattr(modulo, "_pick_parser", lambda ruta: MT5Parser())

    # El archivo se lee entero y solo se cae la fila tocada.
    trades, filas = MT5Parser().parse_con_filas(MT5)
    validas, rechazos = valida_trades_de_archivo(trades, filas)

    assert len(trades) == 20
    assert len(rechazos) == 1
    assert rechazos[0].codigo == "quantity_unreadable"
    assert rechazos[0].fila == fila + 1  # el usuario ve las filas contando desde 1


def test_el_archivo_de_ejemplo_sigue_dando_20(client, cuenta):
    """Ningun cambio debe haber alterado el reporte real."""
    with open(MT5, "rb") as f:
        cuerpo = _subir(client, cuenta, f.read()).json()

    assert cuerpo["trades_guardados"] == 20


def test_parse_con_filas_da_las_mismas_operaciones_que_parse():
    """`parse` se sigue usando en otros sitios: no puede cambiar de resultado."""
    p = MT5Parser()
    con_filas, _ = p.parse_con_filas(MT5)

    assert [t.symbol for t in p.parse(MT5)] == [t.symbol for t in con_filas]


def test_las_filas_apuntan_a_donde_el_usuario_mira():
    """La fila que decimos es la de su Excel, contando desde 1."""
    _, filas = MT5Parser().parse_con_filas(MT5)

    assert filas[0] == 8  # la primera operacion esta en la fila 8 del archivo
    assert len(filas) == 20
    assert filas == sorted(filas)

# --- Subir el mismo archivo dos veces -------------------------------------
#
# El fallo mas grave en el uso diario: el usuario sube el reporte, ve algo raro
# y lo vuelve a subir "por si acaso". Las 20 operaciones entraban dos veces y las
# estadisticas quedaban al doble, pero seguian cuadrando entre si, asi que no
# habia forma de saber que estaban mal.


def _subir_dos_veces(client, cuenta):
    """Sube el reporte de ejemplo dos veces. Devuelve las dos respuestas."""
    with open(MT5, "rb") as f:
        primera = _subir(client, cuenta, f.read()).json()
    with open(MT5, "rb") as f:
        segunda = _subir(client, cuenta, f.read()).json()
    return primera, segunda


def test_subir_dos_veces_no_duplica(client, cuenta):
    primera, segunda = _subir_dos_veces(client, cuenta)

    assert primera["trades_guardados"] == 20
    # La segunda no guarda nada: si guardara, las estadisticas quedarian al doble.
    assert segunda["trades_guardados"] == 0


def test_la_segunda_subida_avisa_de_las_20_que_ya_tenia(client, cuenta):
    _, segunda = _subir_dos_veces(client, cuenta)

    ya = segunda["ya_importadas"]
    assert len(ya) == 20
    assert all(r["codigo"] == "already_imported" for r in ya)


def test_el_aviso_de_repetidas_dice_la_fila_del_archivo(client, cuenta):
    _, segunda = _subir_dos_veces(client, cuenta)

    filas = sorted(r["fila"] for r in segunda["ya_importadas"])
    assert filas == list(range(8, 28))  # las 20 del reporte, filas 8 a 27


def test_el_archivo_identico_se_marca_para_poder_ofrecer_reimportar(client, cuenta):
    _, segunda = _subir_dos_veces(client, cuenta)

    # Solo en este caso se puede prometer que reimportar no pierde nada.
    assert segunda["archivo_identico"] is True


def test_un_archivo_con_algo_nuevo_no_ofrece_borrar(client, cuenta, monkeypatch):
    """Con una sola operacion nueva, el boton de borrar NO debe aparecer.

    La segunda subida trae las 20 de siempre MAS dos que no estaban: el usuario
    tiene datos nuevos que perder, asi que no se le ofrece borrarlo todo.
    """
    from datetime import datetime

    import app.trades as modulo

    from app.fifo_engine import ClosedTrade

    def nuevas():
        return [
            ClosedTrade(
                symbol="GBPUSD", direction="long", quantity=0.5,
                entry_price=1.25, exit_price=1.30,
                entry_time=datetime(2026, 10, 1, 9, 0),
                exit_time=datetime(2026, 10, 1, 9, 30),
                pnl_bruto=250.0, position=f"NUEVA{i}",
            )
            for i in range(2)
        ]

    del_Reporte = MT5Parser().parse(MT5)

    # El parser devuelve una cosa distinta en cada llamada: la primera vez solo
    # el reporte, la segunda el reporte mas las dos nuevas.
    llamadas = {"n": 0}

    class _PorLlamada:
        def parse(self, ruta):
            llamadas["n"] += 1
            return list(del_Reporte if llamadas["n"] == 1 else del_Reporte + nuevas())

    monkeypatch.setattr(modulo, "_pick_parser", lambda ruta: _PorLlamada())

    _subir(client, cuenta, b"x")
    cuerpo = _subir(client, cuenta, b"x").json()

    assert cuerpo["trades_guardados"] == 2
    assert len(cuerpo["ya_importadas"]) == 20
    # Aqui NO se ofrece borrar: el usuario tiene operaciones nuevas que perder.
    assert cuerpo["archivo_identico"] is False


def test_otra_cuenta_no_cuenta_como_duplicado(make_client, otro_usuario, db_session):
    """El mismo ticket en OTRA cuenta es otra cuenta: no se debe descartar.

    Se crean dos cuentas del mismo usuario y se sube el MISMO reporte a las dos.
    Si la comparacion no mirara de que cuenta son, la segunda se quedaria vacia.
    """
    from app.models import Account

    cliente = make_client(otro_usuario)

    cuentas = [
        Account(
            user_id=otro_usuario.id,
            name=n,
            initial_balance=1000,
            currency="USD",
            source="manual",
        )
        for n in ("Primera", "Segunda")
    ]
    db_session.add_all(cuentas)
    db_session.commit()

    for acc in cuentas:
        with open(MT5, "rb") as f:
            cuerpo = _subir(cliente, acc, f.read()).json()
        assert cuerpo["trades_guardados"] == 20, f"la cuenta {acc.name} no importo"


def test_sin_ticket_se_compara_por_la_huella():
    """La plantilla manual deja el ticket vacio: ahi manda la huella."""
    from datetime import datetime

    t = ClosedTrade(
        symbol="EURUSD", direction="long", quantity=0.1,
        entry_price=1.1, exit_price=1.2,
        entry_time=datetime(2026, 1, 1, 10, 0),
        exit_time=datetime(2026, 1, 1, 10, 30),
        pnl_bruto=100.0,
    )

    nuevas, repetidas = separa_repetidas([t], [])
    assert len(nuevas) == 1 and repetidas == []

    nuevas, repetidas = separa_repetidas([t], [t])
    assert nuevas == [] and len(repetidas) == 1


def test_ruido_de_coma_floante_no_crea_una_operacion_nueva():
    """Un broker puede mandar 1.1000000000000001 y 1.1. Sin redondear, la misma
    operacion parecieria distinta y se importaria dos veces."""
    from datetime import datetime

    a = ClosedTrade(symbol="EURUSD", direction="long", quantity=0.1,
                    entry_price=1.1, exit_price=1.2,
                    entry_time=datetime(2026, 1, 1, 10, 0),
                    exit_time=datetime(2026, 1, 1, 10, 30), pnl_bruto=100.0)
    b = ClosedTrade(symbol="EURUSD", direction="long", quantity=0.1,
                    entry_price=1.1000000000000001, exit_price=1.2,
                    entry_time=datetime(2026, 1, 1, 10, 0),
                    exit_time=datetime(2026, 1, 1, 10, 30), pnl_bruto=100.0)

    _, repetidas = separa_repetidas([b], [a])
    assert len(repetidas) == 1


def test_dos_operaciones_iguales_sin_ticket_dentro_del_mismo_archivo():
    """Si el archivo trae dos identicas sin ticket, se avisa una e importa la otra.

    Si las dos se descartaran, el usuario perderia una operacion real. Si las dos
    entraran, seria un duplicado. Lo correcto es avisar e importar una."""
    from datetime import datetime

    def una():
        return ClosedTrade(symbol="EURUSD", direction="long", quantity=0.1,
                           entry_price=1.1, exit_price=1.2,
                           entry_time=datetime(2026, 1, 1, 10, 0),
                           exit_time=datetime(2026, 1, 1, 10, 30), pnl_bruto=100.0)

    nuevas, repetidas = separa_repetidas([una(), una()], [])

    assert len(nuevas) == 1
    assert len(repetidas) == 1


def test_operaciones_con_ticket_distinto_no_se_confunden():
    """Dos operaciones con los MISMOS datos pero tickets distintos son dos
    operaciones de verdad: abrir y cerrar en dos tramos, por ejemplo."""
    from datetime import datetime

    def una(ticket):
        return ClosedTrade(symbol="EURUSD", direction="long", quantity=0.1,
                           entry_price=1.1, exit_price=1.2,
                           entry_time=datetime(2026, 1, 1, 10, 0),
                           exit_time=datetime(2026, 1, 1, 10, 30),
                           pnl_bruto=100.0, position=ticket)

    nuevas, repetidas = separa_repetidas([una("111"), una("222")], [una("111")])

    assert len(nuevas) == 1
    assert len(repetidas) == 1


def test_el_codigo_de_repetida_no_se_confunde_con_los_de_dato_malo():
    """Son dos cosas distintas: una es un dato que hay que corregir, la otra es
    algo que ya tienes. Si compartieran codigo, el cliente no podria distinguirlas."""
    from app.import_validacion import CODIGOS_RECHAZO

    assert "already_imported" not in CODIGOS_RECHAZO
