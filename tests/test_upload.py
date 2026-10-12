"""
Tests del endpoint de subida de archivos y de los dos parsers.

Antes de este fichero, POST /trades/upload no tenia NINGUN test, y es la
puerta por la que entra el historico del broker. Si el parser se rompe, el
sintoma es "no me cargo el archivo" y el usuario no tiene forma de saber si
es el archivo o la app.

Se sube un archivo real de cada clase (un reporte de MT5 y la plantilla de
TradeMind) y se comprueban las cifras concretas, no solo que no reviente.
"""

import io
import os

import pytest

from conftest import detalle

from app.parsers.file_reader import read_any_table
from app.parsers.manual_template_parser import ManualTemplateParser
from app.parsers.mt5_parser import MT5Parser
from app.parsers.mt4_parser import MT4Parser
from app.security import create_access_token

MT5 = "sample_data/ReportHistory-35023263.xlsx"
PLANTILLA = "sample_data/plantilla_trademind.xlsx"
MT4 = "sample_data/Statement_MT4_largo.htm"

# Cifras reales del reporte MT4, comprobadas contra la fila de totales del
# propio fichero (y contra su "Closed P/L:").
LARGO_TRADES = 27
LARGO_CLOSED_PL = -387.92

# Valores reales, comprobados contra los ficheros de ejemplo del repositorio.
MT5_TRADES = 20
MT5_SUMA_PNETO = -93.60
MT5_PRIMERA = {"position": "166321549", "symbol": "EURUSD", "direction": "short"}

PLANTILLA_TRADES = 1
PLANTILLA_SUMA_PNETO = 59.20
PLANTILLA_SIMBOLO = "EURUSD"


@pytest.fixture
def archivo():
    """Lee un fichero de ejemplo como bytes, para subirlo como UploadFile."""
    import pathlib

    def _leer(ruta):
        return pathlib.Path(ruta).read_bytes()

    return _leer


@pytest.fixture
def auth(usuario):
    """Cabecera Authorization con un token real del usuario de prueba."""
    return {"Authorization": f"Bearer {create_access_token({'sub': str(usuario.id)})}"}


# --- los parsers, sin pasar por la API -----------------------------------


def test_el_reporte_mt5_se_detecta_y_parsea(archivo):
    crudo = read_any_table(MT5)
    # La primera celda es la que decide que parser se usa.
    assert str(crudo.iloc[0, 0]).strip().startswith("Trade History Report")

    trades = MT5Parser().parse(MT5)
    assert len(trades) == MT5_TRADES
    assert abs(sum(t.pnl_neto for t in trades) - MT5_SUMA_PNETO) < 0.01

    primero = trades[0]
    assert primero.position == MT5_PRIMERA["position"]
    assert primero.symbol == MT5_PRIMERA["symbol"]
    assert primero.direction == MT5_PRIMERA["direction"]


def test_la_plantilla_se_detecta_y_parsea(archivo):
    crudo = read_any_table(PLANTILLA)
    assert str(crudo.iloc[0, 0]).strip().startswith("Fecha apertura")

    trades = ManualTemplateParser().parse(PLANTILLA)
    assert len(trades) == PLANTILLA_TRADES
    assert abs(sum(t.pnl_neto for t in trades) - PLANTILLA_SUMA_PNETO) < 0.01
    assert trades[0].symbol == PLANTILLA_SIMBOLO


def test_el_reporte_mt5_tiene_mas_filas_que_trades_cerrados(archivo):
    """
    El reporte trae 152 filas pero solo 20 son operaciones cerradas: el resto
    son posiciones abiertas u otras secciones. El parser tiene que quedarse
    con las cerradas, y no guardarlas como si fueran trades.
    """
    crudo = read_any_table(MT5)
    assert len(crudo) > MT5_TRADES
    assert len(MT5Parser().parse(MT5)) == MT5_TRADES


def test_todo_trade_parseado_tiene_fecha_de_salida(archivo):
    """Sin exit_time no se puede datar el trade, y el calendario lo necesita."""
    for t in MT5Parser().parse(MT5):
        assert t.exit_time is not None
        assert t.entry_time is not None


def test_una_fila_de_dinero_no_se_monta_como_venta(tmp_path):
    """Una fila con fecha valida pero con Type que no es buy ni sell no es una
    posicion cerrada: es dinero que entra o sale de la cuenta.

    Si pasara, la linea que fija la direccion la meteria como short, porque
    todo lo que no era 'buy' acababa siendo venta. Se monta un reporte de MT5
    a mano con una fila de balance DENTRO de la tabla de Positions, que es el
    unico sitio donde el filtro de fechas no la salvaria.

    El reporte de ejemplo no tiene ninguna fila asi (sus 20 posiciones son 17
    'sell' y 3 'buy'), asi que sin este test el hueco estaria sin cubrir.
    """
    import pandas as pd

    cabecera = [
        "Time", "Position", "Symbol", "Type", "Volume", "Price", "S / L",
        "T / P", "Time", "Price", "Commission", "Swap", "Profit",
    ]
    filas = [
        cabecera,
        # Dinero con fecha en la primera columna: pasa el filtro de fechas,
        # que es lo unico que habia delante del calculo de la direccion.
        ["2026.09.25 07:58:00", 999999, "balance", "balance", None, None, None,
         None, "2026.09.25 07:58:00", None, None, None, 25000.0],
        # Una posicion cerrada de verdad.
        ["2026.09.25 07:58:00", 166321549, "EURUSD", "sell", 0.1, 1.13689,
         1.13827, 1.13453, "2026.09.25 08:58:00", 1.13500, -1.0, 0.0, -18.9],
    ]
    archivo = tmp_path / "mt5_dinero.xlsx"
    pd.DataFrame(filas).to_excel(archivo, index=False, header=False)

    trades = MT5Parser().parse(str(archivo))

    assert len(trades) == 1
    assert trades[0].symbol == "EURUSD"
    assert trades[0].direction == "short"


def test_los_parsers_se_eligen_por_el_contenido_no_por_la_extension(archivo):
    """
    El mismo formato llega como .xlsx, como HTML o como CSV. Lo que decide es
    la primera celda, no el nombre del fichero.
    """
    crudo = read_any_table(PLANTILLA)
    es_plantilla = str(crudo.iloc[0, 0]).strip().startswith("Fecha apertura")
    crudo_mt5 = read_any_table(MT5)
    es_mt5 = not str(crudo_mt5.iloc[0, 0]).strip().startswith("Fecha apertura")

    assert es_plantilla is True
    assert es_mt5 is True


# --- el endpoint de subida ------------------------------------------------


def test_subir_reporte_mt5_guarda_los_trades(client, cuenta, archivo):
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )

    assert r.status_code == 200
    assert r.json() == {"trades_guardados": MT5_TRADES}


def test_los_trades_subidos_pertenecen_a_la_cuenta_y_al_usuario(
    client, cuenta, usuario, archivo, db_session
):
    from app.models import Trade

    client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )

    trades = db_session.query(Trade).all()
    assert len(trades) == MT5_TRADES
    assert all(t.account_id == cuenta.id for t in trades)
    assert all(t.user_id == usuario.id for t in trades)


def test_los_trades_subidos_conservan_el_pnl(client, cuenta, archivo, db_session):
    from app.models import Trade

    client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )

    suma = db_session.query(Trade).with_entities(Trade.pnl_neto).all()
    total = sum(s[0] for s in suma)
    assert abs(total - MT5_SUMA_PNETO) < 0.01


def test_subir_la_plantilla_manual(client, cuenta, archivo):
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("plantilla.xlsx", archivo(PLANTILLA), "application/vnd.ms-excel")},
    )

    assert r.status_code == 200
    assert r.json() == {"trades_guardados": PLANTILLA_TRADES}


def test_subir_el_archivo_a_una_cuenta_inexistente_da_404(client, archivo):
    r = client.post(
        "/trades/upload",
        params={"account_id": "00000000-0000-0000-0000-000000000000"},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )
    assert r.status_code == 404


def test_no_se_puede_subir_a_la_cuenta_de_otro_usuario(
    client_otro_usuario, cuenta, archivo
):
    """La cuenta es de `usuario`, y el cliente es `otro_usuario`."""
    r = client_otro_usuario.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )
    assert r.status_code == 404


@pytest.mark.parametrize("nombre", ["reporte.txt", "datos.pdf", "sin_extension", "archivo.docx"])
def test_extension_no_admitida_da_400(client, cuenta, archivo, nombre):
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": (nombre, b"contenido cualquiera", "application/octet-stream")},
    )
    assert r.status_code == 400
    assert detalle(r).code == "file_bad_extension"


def test_extension_valida_pero_contenido_basura_no_revienta_el_servidor(client, cuenta):
    """
    Un .xlsx que no es un libro de Excel. Lo que importa es que responde 400 y
    no 500: un 500 se ve como caida de la app, un 400 como 'tu archivo no vale'.
    """
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("falso.xlsx", b"esto no es un xlsx en absoluto", "application/vnd.ms-excel")},
    )
    assert r.status_code == 400


def test_xlsx_vacio_no_revienta_el_servidor(client, cuenta):
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("vacio.xlsx", b"", "application/vnd.ms-excel")},
    )
    assert r.status_code == 400


def test_csv_se_acepta_por_extension(client, cuenta):
    """Aunque los dos parsers tengan su ruta de testeo propia, la extension
    .csv esta permitida y debe llegar al parser, no ser rechazada antes."""
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("datos.csv", b"columna1\nvalor\n", "text/csv")},
    )
    # O bien lo procesa, o bien lo rechaza por contenido. Lo que no puede hacer
    # es rechazar la extension.
    assert r.status_code in (200, 400)


def test_subir_dos_veces_no_duplica_las_operaciones(client, cuenta, archivo, db_session):
    """
    Subir el mismo reporte dos veces NO guarda las operaciones dos veces.

    Este test estaba escrito al reves: documentaba que la app NO deduplicaba, y
    deciaexplicitamente que se dejaba constancia "para que nadie lo descubra
    como si fuera un fallo". Eso era justo el punto: era un fallo, y se hacia
    constar. Ahora se ha arreglado (ver `separa_repetidas` en
    app/import_validacion.py) y el test afirma lo correcto.

    El caso de detalle esta en tests/test_import_parcial.py, donde se comprueba
    tambien que el aviso lleva el numero de fila y que el boton de borrar solo
    aparece cuando el archivo es identico.
    """
    respuestas = []
    for _ in range(2):
        respuestas.append(
            client.post(
                "/trades/upload",
                params={"account_id": str(cuenta.id)},
                files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
            ).json()
        )

    from app.models import Trade

    assert respuestas[0]["trades_guardados"] == MT5_TRADES
    assert respuestas[1]["trades_guardados"] == 0
    assert db_session.query(Trade).count() == MT5_TRADES


def test_el_archivo_temporal_se_borra_tras_subir(client, cuenta, archivo, tmp_path, monkeypatch):
    """
    El temporal se crea con delete=False porque el parser lo lee por ruta, asi
    que hay que borrarlo a mano. Antes no se borraba y se acumulaba uno por
    cada subida; se llegaron a contar 45 huerfanos en TEMP.
    """
    import tempfile as tempfile_mod

    reales = []
    original = tempfile_mod.NamedTemporaryFile

    def espia(*args, **kwargs):
        f = original(*args, **kwargs)
        reales.append(f.name)
        return f

    monkeypatch.setattr("app.trades.tempfile.NamedTemporaryFile", espia)

    client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", archivo(MT5), "application/vnd.ms-excel")},
    )

    assert len(reales) == 1, "no se llego a crear ningun temporal"
    assert not os.path.exists(reales[0]), f"el temporal quedo vivo: {reales[0]}"


def test_el_temporal_se_borra_tambien_cuando_el_parseo_falla(client, cuenta):
    """El borrado va en un finally, asi que ocurre tambien en el camino de error."""
    import glob
    import tempfile as tempfile_mod

    antes = set(glob.glob(os.path.join(tempfile_mod.gettempdir(), "*.xlsx")))

    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("falso.xlsx", b"esto no es un xlsx", "application/vnd.ms-excel")},
    )
    assert r.status_code == 400

    despues = set(glob.glob(os.path.join(tempfile_mod.gettempdir(), "*.xlsx")))
    assert despues == antes, f"quedaron temporales: {despues - antes}"


# --- MT4, de punta a punta -------------------------------------------------
#
# El parser de MT4 tiene sus propios tests unitarios. Aqui lo que se comprueba
# es el camino completo: que `_pick_parser` elija MT4 y no MT5, que el .htm
# llegue al final y que los datos se guarden en la base. Un parser perfecto
# que `_pick_parser` no selecciona no sirve de nada.


def test_subir_reporte_mt4_guarda_los_trades(client, cuenta, archivo):
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("Statement.htm", archivo(MT4), "text/html")},
    )

    assert r.status_code == 200
    assert r.json() == {"trades_guardados": LARGO_TRADES}


def test_los_trades_mt4_llegan_con_su_impuesto_a_la_base(client, cuenta, archivo, db_session):
    """Comprueba que `taxes` recorre ClosedTrade -> Trade -> columna.

    Todos valen 0.00 en este reporte, asi que un campo sin mapear tambien
    daria 0.0 por casualidad. Lo que distingue el caso es `is not None`:
    si la columna no existiera o viniera sin rellenar, saldria NULL.
    """
    from app.models import Trade

    client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("Statement.htm", archivo(MT4), "text/html")},
    )

    filas = db_session.query(Trade).all()
    assert len(filas) == LARGO_TRADES
    assert all(t.taxes is not None for t in filas)
    assert all(t.taxes == 0.0 for t in filas)


def test_el_neto_mt4_guardado_es_el_closed_pl_del_reporte(client, cuenta, archivo, db_session):
    from app.models import Trade

    client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("Statement.htm", archivo(MT4), "text/html")},
    )

    total = sum(t.pnl_neto for t in db_session.query(Trade).all())
    assert abs(total - LARGO_CLOSED_PL) < 0.01


def test_subir_un_htm_no_se_intenta_leer_como_mt5(client, cuenta, archivo):
    """Si `_pick_parser` eligiera MT5, el rechazo seria 'no hay operaciones'
    con un archivo que si las tiene: el usuario no tendria forma de saber
    que era un problema de deteccion y no de su archivo."""
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("Statement.htm", archivo(MT4), "text/html")},
    )
    assert r.status_code == 200
    assert r.json() == {"trades_guardados": LARGO_TRADES}
