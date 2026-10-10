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