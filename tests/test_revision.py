"""
Tests de los cinco problemas que encontro una revision del codigo.

Los cinco eran reales, y ninguno lo cubria ningun test. Por eso estan aqui: no
para comprobar que el codigo de hoy esta bien, sino para que no vuelva a
romperse sin que nadie se entere.

QUE CUBRE CADA UNO

  1. Celda vacia en el reporte de MT5 -> el parser guardaba NaN en vez de 0.0
  2. null explicito en un PUT -> 500 por columna NOT NULL
  3. account_id con formato invalido -> 500 por comparacion contra UUID
  4. direction y quantity sin validar -> datos incoherentes en silencio
  5. Extension en mayusculas -> 400 a un archivo valido
"""

import io

import pytest

from conftest import detalle

from app.parsers.file_reader import read_any_table
from app.parsers.mt5_parser import MT5Parser
from app.schemas import TradeCreate, TradeUpdate
from app.security import create_access_token

MT5 = "sample_data/ReportHistory-35023263.xlsx"


@pytest.fixture
def trade(usuario, cuenta, db_session):
    """Un trade normal del usuario, para probar los PUT.

    Se crea aqui y no en conftest.py porque solo lo usan estos tests.
    """
    from app.models import Trade

    t = Trade(
        user_id=usuario.id,
        account_id=cuenta.id,
        symbol="EURUSD",
        direction="long",
        quantity=1.0,
        entry_price=1.1,
        exit_price=1.2,
        pnl_bruto=100.0,
        pnl_neto=100.0,
    )
    db_session.add(t)
    db_session.commit()
    db_session.refresh(t)
    return t


# ---------------------------------------------------------------------------
# 1. Las celdas vacias del reporte de MT5
# ---------------------------------------------------------------------------


def test_el_reporte_real_tiene_celdas_vacias():
    """Documenta por que este test existe.

    En el reporte de ejemplo, de 130 filas de datos, 67 tienen la comision
    vacia, 61 el swap y 67 el PnL. Son mas de la mitad, no un caso raro.
    """
    raw = read_any_table(MT5)
    from datetime import datetime

    def es_fecha(v):
        try:
            datetime.strptime(str(v).strip(), "%Y.%m.%d %H:%M:%S")
            return True
        except ValueError:
            return False

    vacias = 0
    for _, row in raw.iterrows():
        vals = list(row)
        if len(vals) <= 12 or not es_fecha(vals[0]):
            continue
        if any(v != v for v in vals[10:13]):  # NaN es lo unico que no es igual a si mismo
            vacias += 1

    assert vacias > 0, (
        "El reporte de ejemplo ya no tiene celdas vacias en comision/swap/pnl. "
        "Si esto falla, o el fichero cambio o el parser ahora las rellena. "
        "Revisar antes de tocar el test."
    )


def test_ningun_trade_trae_nan():
    """El sintoma que se vea: NaN en las columnas de dinero.

    NaN no es igual a si mismo, y una suma con NaN da NaN. Con esto se detecta
    en el parser, antes de que llegue a la base de datos.
    """
    trades = MT5Parser().parse(MT5)

    assert trades, "El parser devolvio una lista vacia"

    for t in trades:
        assert t.commission == t.commission, f"comision NaN en {t.symbol}"
        assert t.swap == t.swap, f"swap NaN en {t.symbol}"
        assert t.pnl_bruto == t.pnl_bruto, f"pnl_bruto NaN en {t.symbol}"
        assert t.entry_price == t.entry_price, f"entry_price NaN en {t.symbol}"
        assert t.exit_price == t.exit_price, f"exit_price NaN en {t.symbol}"
        assert t.quantity == t.quantity, f"quantity NaN en {t.symbol}"


def test_las_sumas_no_dan_nan():
    """Una sola celda vacia estropeaba la cuenta entera.

    Con NaN en algun trade, estas tres sumas dan nan y con eso el PnL total, la
    curva de equity y el winrate.
    """
    trades = MT5Parser().parse(MT5)

    total_comision = sum(t.commission for t in trades)
    total_swap = sum(t.swap for t in trades)
    total_pnl = sum(t.pnl_bruto for t in trades)

    assert total_comision == total_comision, "la suma de comisiones da NaN"
    assert total_swap == total_swap, "la suma de swaps da NaN"
    assert total_pnl == total_pnl, "la suma de PnL da NaN"

    assert total_comision != 0.0, "las comisiones se estan perdiendo"


def test_el_lector_de_trades_no_falla_con_500(client, usuario, cuenta):
    """El sintoma que ve el usuario.

    Starlette lanza ValueError al serializar un NaN a JSON, asi que GET /trades/
    devolvia 500 para toda la cuenta.
    """
    token = create_access_token(data={"sub": str(usuario.id)})
    r = client.get(
        f"/trades/?account_id={cuenta.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200, f"GET /trades devolvio {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# 2. null explicito en un PUT
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "campo",
    ["symbol", "direction", "quantity", "entry_price", "exit_price", "pnl_bruto"],
)
def test_put_con_null_no_rompe(client, usuario, cuenta, trade, campo):
    """Un null explicito no debe intentar escribir en una columna NOT NULL.

    Antes: 500 de Postgres, y el usuario veia "error del servidor".
    Ahora: el null se ignora y el trade se queda como estaba.
    """
    token = create_access_token(data={"sub": str(usuario.id)})

    r = client.put(
        f"/trades/{trade.id}",
        json={campo: None},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200, f"PUT con {campo}=null devolvio {r.status_code}: {r.text}"
    assert r.json()[campo] is not None, f"{campo} quedo en null en la respuesta"


def test_put_normal_sigue_funcionando(client, usuario, trade):
    """Que el filtro de nulls no rompa la actualizacion de verdad."""
    token = create_access_token(data={"sub": str(usuario.id)})

    r = client.put(
        f"/trades/{trade.id}",
        json={"symbol": "GBPUSD", "quantity": 2.5},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200
    assert r.json()["symbol"] == "GBPUSD"
    assert r.json()["quantity"] == 2.5


def test_put_pone_a_null_lo_que_si_admite_null(client, usuario, cuenta):
    """sl y tp son nulables: ahi el null si es una instruccion del usuario."""
    token = create_access_token(data={"sub": str(usuario.id)})
    trade_id = _trade_con_sl(client, usuario, cuenta)

    r = client.put(
        f"/trades/{trade_id}",
        json={"sl": None},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200, f"el PUT devolvio {r.status_code}: {r.text}"
    assert r.json()["sl"] is None


def _trade_con_sl(client, usuario, cuenta):
    token = create_access_token(data={"sub": str(usuario.id)})
    creado = client.post(
        "/trades/",
        json={
            "account_id": str(cuenta.id),
            "symbol": "EURUSD",
            "direction": "long",
            "quantity": 1.0,
            "entry_price": 1.1,
            "exit_price": 1.2,
            "sl": 1.05,
            "pnl_bruto": 100.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    return creado.json()["id"]


# ---------------------------------------------------------------------------
# 3. account_id con formato invalido
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("endpoint", ["get", "put", "delete"])
def test_account_id_invalido_da_422_no_500(client, usuario, endpoint):
    """/accounts/abc no debe llegar a Postgres.

    Con account_id: str, la comparacion contra la columna UUID la rechaza
    Postgres y el servidor devuelve 500. Con UUID, Pydantic lo para antes con un
    422 y un mensaje que dice que es.
    """
    token = create_access_token(data={"sub": str(usuario.id)})
    cabeceras = {"Authorization": f"Bearer {token}"}

    if endpoint == "get":
        r = client.get("/accounts/abc", headers=cabeceras)
    elif endpoint == "put":
        r = client.put("/accounts/abc", json={"name": "x"}, headers=cabeceras)
    else:
        r = client.delete("/accounts/abc", headers=cabeceras)

    assert r.status_code == 422, f"{endpoint} /accounts/abc devolvio {r.status_code}, se esperaba 422"


def test_account_id_uuid_valido_sigue_funcionando(client, usuario, cuenta):
    """Que el cambio a UUID no rompa el uso normal."""
    token = create_access_token(data={"sub": str(usuario.id)})

    r = client.get(f"/accounts/{cuenta.id}", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 200
    assert r.json()["id"] == str(cuenta.id)


# ---------------------------------------------------------------------------
# 4. direction y quantity sin validar
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("mala", ["banana", "", "   ", "compra_larga", "up", "largo plazo", "0"])
def test_direction_invalida_se_rechaza(cuenta, mala):
    """Antes se guardaba cualquier texto en silencio.

    Un direction "banana" no daba error: entraba en la base y las estadisticas
    por direccion lo trataban como short sin avisar.
    """
    with pytest.raises(Exception):
        TradeCreate(
            account_id=cuenta.id,
            symbol="EURUSD",
            direction=mala,
            quantity=1.0,
            entry_price=1.1,
            exit_price=1.2,
            pnl_bruto=100.0,
        )


@pytest.mark.parametrize("cantidad", [0.0, -1.0, -0.5])
def test_quantity_no_positiva_se_rechaza(cuenta, cantidad):
    """Una cantidad de 0 o negativa no es una operacion posible."""
    with pytest.raises(Exception):
        TradeCreate(
            account_id=cuenta.id,
            symbol="EURUSD",
            direction="long",
            quantity=cantidad,
            entry_price=1.1,
            exit_price=1.2,
            pnl_bruto=100.0,
        )


@pytest.mark.parametrize("vacia", ["", "   ", "\t"])
def test_symbolo_vacio_se_rechaza(cuenta, vacia):
    """Un simbolo vacio rompia las estadisticas por simbolo."""
    with pytest.raises(Exception):
        TradeCreate(
            account_id=cuenta.id,
            symbol=vacia,
            direction="long",
            quantity=1.0,
            entry_price=1.1,
            exit_price=1.2,
            pnl_bruto=100.0,
        )


@pytest.mark.parametrize("texto,esperado", [("EURUSD", "EURUSD"), ("  EURUSD  ", "EURUSD")])
def test_symbolo_se_recorta(cuenta, texto, esperado):
    """Escribir con espacios por costumbre es normal y debe guardarse bien."""
    t = TradeCreate(
        account_id=cuenta.id,
        symbol=texto,
        direction="long",
        quantity=1.0,
        entry_price=1.1,
        exit_price=1.2,
        pnl_bruto=100.0,
    )
    assert t.symbol == esperado


@pytest.mark.parametrize(
    "texto,esperado",
    [("long", "long"), ("short", "short"), ("BUY", "long"), ("  Sell ", "short"), ("compra", "long")],
)
def test_direction_se_normaliza(cuenta, texto, esperado):
    """Acepta las formas que la gente escribe de verdad y las deja canonicas."""
    t = TradeCreate(
        account_id=cuenta.id,
        symbol="EURUSD",
        direction=texto,
        quantity=1.0,
        entry_price=1.1,
        exit_price=1.2,
        pnl_bruto=100.0,
    )
    assert t.direction == esperado


def test_un_trade_incoherente_no_llega_a_la_api(client, usuario, cuenta):
    """La validacion tiene que estar en la API, no solo en el formulario."""
    token = create_access_token(data={"sub": str(usuario.id)})

    r = client.post(
        "/trades/",
        json={
            "account_id": str(cuenta.id),
            "symbol": "EURUSD",
            "direction": "banana",
            "quantity": -3.0,
            "entry_price": 1.1,
            "exit_price": 1.2,
            "pnl_bruto": 100.0,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 422, f"un trade incoherente devolvio {r.status_code}, se esperaba 422"


def test_trade_update_acepta_null_pero_no_lo_inventa():
    """Que omitir un campo y mandarlo en null den el mismo resultado."""
    sin_cambios = TradeUpdate()
    con_null = TradeUpdate(symbol=None)

    assert "symbol" not in sin_cambios.model_dump(exclude_unset=True)
    assert con_null.model_dump(exclude_unset=True)["symbol"] is None


# ---------------------------------------------------------------------------
# 5. La extension en mayusculas
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("nombre", ["REPORTE.XLSX", "Datos.CSV", "Plantilla.XLS", "reporte.XlSx"])
def test_extension_en_mayusculas_se_acepta(client, usuario, cuenta, nombre):
    """En Windows es tan normal REPORTE.XLSX como reporte.xlsx.

    endswith() distingue mayusculas, asi que antes un archivo valido en
    mayusculas se rechazaba con un 400 desconcertante.
    """
    token = create_access_token(data={"sub": str(usuario.id)})

    with open(MT5, "rb") as f:
        contenido = f.read()

    r = client.post(
        "/trades/upload",
        params={"account_id": cuenta.id},
        files={"file": (nombre, io.BytesIO(contenido), "application/octet-stream")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code != 400 or "debe ser" not in r.text, (
        f"{nombre} fue rechazado por la extension: {r.text}"
    )


def test_extension_invalida_sigue_rechazada(client, usuario, cuenta):
    """Que el .lower() no haya abierto la puerta a cualquier cosa."""
    token = create_access_token(data={"sub": str(usuario.id)})

    r = client.post(
        "/trades/upload",
        params={"account_id": cuenta.id},
        files={"file": ("reporte.txt", io.BytesIO(b"hola"), "text/plain")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 400
    assert detalle(r).code == "file_bad_extension"


def test_extension_en_minusculas_sigue_funcionando(client, usuario, cuenta):
    """El camino de siempre, que es el que mas se usa."""
    token = create_access_token(data={"sub": str(usuario.id)})

    with open(MT5, "rb") as f:
        contenido = f.read()

    r = client.post(
        "/trades/upload",
        params={"account_id": cuenta.id},
        files={"file": ("reporte.xlsx", io.BytesIO(contenido), "application/vnd.ms-excel")},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert r.status_code == 200, f"la subida normal devolvio {r.status_code}: {r.text}"