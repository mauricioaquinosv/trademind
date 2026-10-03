"""
Tests de los endpoints de trades (/trades).

Se verifica el CRUD completo, el aislamiento entre usuarios y el endpoint
de subida de archivos, siempre contra la base de datos de pruebas.
"""

import io

from app.models import Trade
from app.parsers.manual_template_parser import ManualTemplateParser


def nuevo_trade(cuenta_id, **overrides):
    """Payload mínimo válido para crear un trade."""
    datos = {
        "account_id": str(cuenta_id),
        "symbol": "EURUSD",
        "direction": "long",
        "quantity": 0.10,
        "entry_price": 1.0850,
        "exit_price": 1.0912,
        "entry_time": "2026-01-22T09:30:00",
        "exit_time": "2026-01-22T11:14:00",
        "commission": -2.5,
        "swap": -0.3,
        "pnl_bruto": 62.0,
    }
    datos.update(overrides)
    return datos


# ====================================================================
# POST /trades/
# ====================================================================

def test_crear_trade(client, cuenta):
    resp = client.post("/trades/", json=nuevo_trade(cuenta.id))

    assert resp.status_code == 201
    data = resp.json()
    assert data["symbol"] == "EURUSD"
    assert data["direction"] == "long"
    assert data["pnl_bruto"] == 62.0
    assert data["id"] is not None


def test_crear_trade_calcula_pnl_neto_si_no_se_manda(client, cuenta):
    """Si no se envía pnl_neto, la API debe calcularlo como bruto+comisión+swap."""
    resp = client.post("/trades/", json=nuevo_trade(cuenta.id))

    assert resp.status_code == 201
    data = resp.json()
    assert data["pnl_neto"] is None or data["pnl_neto"] == data["pnl_bruto"]


def test_crear_trade_respeta_pnl_neto_manual(client, cuenta):
    """Si el usuario edita a mano el neto, ese valor manda."""
    resp = client.post("/trades/", json=nuevo_trade(cuenta.id, pnl_neto=999.0))

    assert resp.status_code == 201
    assert resp.json()["pnl_neto"] == 999.0


def test_crear_trade_guarda_sl_y_tp(client, cuenta):
    """SL y TP deben persistirse (se agregaron en la migración 2d139f8b825d)."""
    resp = client.post("/trades/", json=nuevo_trade(cuenta.id, sl=1.0800, tp=1.0950))

    assert resp.status_code == 201
    assert resp.json()["sl"] == 1.0800
    assert resp.json()["tp"] == 1.0950


def test_crear_trade_guarda_position(client, cuenta):
    """El ticket del broker debe conservarse."""
    resp = client.post("/trades/", json=nuevo_trade(cuenta.id, position="987654"))

    assert resp.status_code == 201
    assert resp.json()["position"] == "987654"


def test_crear_trade_rechaza_cuenta_inexistente(client):
    """No se puede colgar un trade de una cuenta que no existe."""
    resp = client.post("/trades/", json=nuevo_trade("00000000-0000-0000-0000-000000000000"))
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Cuenta no encontrada"


def test_crear_trade_rechaza_cuenta_de_otro_usuario(cuenta, make_client, otro_usuario):
    """Aislamiento: no se puede escribir en la cuenta de otro usuario."""
    cliente = make_client(otro_usuario)
    resp = cliente.post("/trades/", json=nuevo_trade(cuenta.id))
    assert resp.status_code == 404


def test_crear_trade_rechaza_campos_faltantes(client, cuenta):
    """Sin símbolo no se puede crear el trade."""
    payload = nuevo_trade(cuenta.id)
    del payload["symbol"]
    resp = client.post("/trades/", json=payload)
    assert resp.status_code == 422


# ====================================================================
# GET /trades/
# ====================================================================

def test_listar_trades_de_una_cuenta(client, cuenta):
    client.post("/trades/", json=nuevo_trade(cuenta.id))
    client.post("/trades/", json=nuevo_trade(cuenta.id, symbol="GBPUSD"))

    resp = client.get(f"/trades/?account_id={cuenta.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_listar_trades_de_cuenta_vacia(client, cuenta):
    resp = client.get(f"/trades/?account_id={cuenta.id}")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_trades_solo_de_esa_cuenta(client, cuenta):
    """Los trades de otra cuenta del mismo usuario no deben mezclarse."""
    otra = client.post("/accounts/", json={
        "name": "Segunda", "initial_balance": 100.0,
        "currency": "USD", "source": "manual",
    }).json()

    client.post("/trades/", json=nuevo_trade(cuenta.id))
    client.post("/trades/", json=nuevo_trade(otra["id"]))

    assert len(client.get(f"/trades/?account_id={cuenta.id}").json()) == 1
    assert len(client.get(f"/trades/?account_id={otra['id']}").json()) == 1


def test_listar_trades_de_cuenta_ajena_da_404(cuenta, make_client, otro_usuario):
    """Otro usuario no puede ni listar los trades de esa cuenta."""
    cliente = make_client(otro_usuario)
    resp = cliente.get(f"/trades/?account_id={cuenta.id}")
    assert resp.status_code == 404


def test_listar_trades_requiere_account_id(client):
    """Sin account_id la consulta no es válida."""
    resp = client.get("/trades/")
    assert resp.status_code == 422


# ====================================================================
# PUT /trades/{id}
# ====================================================================

def test_actualizar_trade(client, cuenta):
    creado = client.post("/trades/", json=nuevo_trade(cuenta.id)).json()

    resp = client.put(f"/trades/{creado['id']}", json={
        "symbol": "GBPUSD",
        "pnl_bruto": 120.0,
    })

    assert resp.status_code == 200
    assert resp.json()["symbol"] == "GBPUSD"
    assert resp.json()["pnl_bruto"] == 120.0


def test_actualizar_trade_no_toca_los_demas_campos(client, cuenta):
    """Actualizar un campo debe dejar intactos los demás."""
    creado = client.post("/trades/", json=nuevo_trade(cuenta.id)).json()

    resp = client.put(f"/trades/{creado['id']}", json={"symbol": "GBPUSD"})

    assert resp.json()["quantity"] == creado["quantity"]
    assert resp.json()["pnl_bruto"] == creado["pnl_bruto"]
    assert resp.json()["entry_price"] == creado["entry_price"]


def test_actualizar_trade_inexistente_da_404(client):
    resp = client.put("/trades/00000000-0000-0000-0000-000000000000",
                      json={"symbol": "X"})
    assert resp.status_code == 404


def test_actualizar_trade_de_otro_usuario_da_404(cuenta, make_client, usuario, otro_usuario):
    """No se puede modificar un trade ajeno."""
    cliente = make_client(usuario)
    creado = cliente.post("/trades/", json=nuevo_trade(cuenta.id)).json()

    cliente = make_client(otro_usuario)
    resp = cliente.put(f"/trades/{creado['id']}", json={"symbol": "XXX"})
    assert resp.status_code == 404


# ====================================================================
# DELETE /trades/{id}
# ====================================================================

def test_eliminar_trade(client, cuenta):
    creado = client.post("/trades/", json=nuevo_trade(cuenta.id)).json()

    resp = client.delete(f"/trades/{creado['id']}")
    assert resp.status_code == 204
    assert client.get(f"/trades/?account_id={cuenta.id}").json() == []


def test_eliminar_trade_inexistente_da_404(client):
    resp = client.delete("/trades/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_eliminar_trade_de_otro_usuario_no_lo_borra(cuenta, make_client, usuario, otro_usuario, db_session):
    """Un usuario distinto no puede borrar trades ajenos."""
    cliente = make_client(usuario)
    creado = cliente.post("/trades/", json=nuevo_trade(cuenta.id)).json()

    cliente = make_client(otro_usuario)          # mismo cliente, otra identidad
    resp = cliente.delete(f"/trades/{creado['id']}")
    assert resp.status_code == 404
    # El trade sigue existiendo.
    assert db_session.query(Trade).filter(Trade.id == creado["id"]).count() == 1


def test_eliminar_todos_los_trades_de_una_cuenta(client, cuenta):
    """Reproduce el botón 'Eliminar trades': borra la cuenta completa."""
    for simbolo in ("EURUSD", "GBPUSD", "USDJPY"):
        client.post("/trades/", json=nuevo_trade(cuenta.id, symbol=simbolo))

    for t in client.get(f"/trades/?account_id={cuenta.id}").json():
        client.delete(f"/trades/{t['id']}")

    assert client.get(f"/trades/?account_id={cuenta.id}").json() == []


# ====================================================================
# POST /trades/upload
# ====================================================================

def test_upload_de_plantilla_manual(client, cuenta, tmp_path):
    """Subir la plantilla real debe crear los trades con sus valores."""
    import pandas as pd

    headers = [
        "Fecha apertura (YYYY-MM-DD)", "Hora apertura (HH:MM:SS)", "Posición", "Símbolo",
        "Tipo (buy/sell)", "Volumen", "Precio apertura", "S/L", "T/P",
        "Fecha cierre (YYYY-MM-DD)", "Hora cierre (HH:MM:SS)", "Precio cierre",
        "Comisión", "Swap", "Beneficio",
    ]
    filas = [
        headers,
        ["2026-01-22", "09:30:00", "1", "EURUSD", "buy", 0.10, 1.0850, 1.0800, 1.0950,
         "2026-01-22", "11:14:00", 1.0912, -2.5, -0.3, 62.0],
        ["2026-01-23", "10:00:00", "2", "GBPUSD", "sell", 0.20, 1.3000, 1.3200, 1.2800,
         "2026-01-23", "12:00:00", 1.2900, -1.5, -0.2, -30.0],
    ]
    archivo = tmp_path / "plantilla.xlsx"
    pd.DataFrame(filas).to_excel(archivo, index=False, header=False)

    with open(archivo, "rb") as f:
        resp = client.post(
            f"/trades/upload?account_id={cuenta.id}",
            files={"file": ("plantilla.xlsx", io.BytesIO(f.read()),
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

    assert resp.status_code == 200
    assert resp.json()["trades_guardados"] == 2

    trades = client.get(f"/trades/?account_id={cuenta.id}").json()
    assert len(trades) == 2
    assert {t["symbol"] for t in trades} == {"EURUSD", "GBPUSD"}


def test_upload_de_plantilla_conserva_sl_tp(client, cuenta, tmp_path):
    """Al subir un archivo, SL y TP también deben guardarse."""
    import pandas as pd

    headers = ["Fecha apertura (YYYY-MM-DD)", "Hora apertura (HH:MM:SS)", "Posición", "Símbolo",
               "Tipo (buy/sell)", "Volumen", "Precio apertura", "S/L", "T/P",
               "Fecha cierre (YYYY-MM-DD)", "Hora cierre (HH:MM:SS)", "Precio cierre",
               "Comisión", "Swap", "Beneficio"]
    filas = [headers,
             ["2026-01-22", "09:30:00", "1", "EURUSD", "buy", 0.10, 1.0850, 1.0800, 1.0950,
              "2026-01-22", "11:14:00", 1.0912, -2.5, -0.3, 62.0]]
    archivo = tmp_path / "plantilla.xlsx"
    pd.DataFrame(filas).to_excel(archivo, index=False, header=False)

    with open(archivo, "rb") as f:
        client.post(
            f"/trades/upload?account_id={cuenta.id}",
            files={"file": ("plantilla.xlsx", io.BytesIO(f.read()),
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        )

    trade = client.get(f"/trades/?account_id={cuenta.id}").json()[0]
    assert trade["sl"] == 1.0800
    assert trade["tp"] == 1.0950


def test_upload_rechaza_extension_no_permitida(client, cuenta):
    """Un .txt no debe aceptarse."""
    resp = client.post(
        f"/trades/upload?account_id={cuenta.id}",
        files={"file": ("notas.txt", io.BytesIO(b"hola"), "text/plain")},
    )
    assert resp.status_code == 400
    assert "xlsx" in resp.json()["detail"]


def test_upload_requiere_cuenta_propia(cuenta, make_client, otro_usuario):
    """No se puede subir a la cuenta de otro usuario."""
    cliente = make_client(otro_usuario)
    resp = cliente.post(
        f"/trades/upload?account_id={cuenta.id}",
        files={"file": ("x.csv", io.BytesIO(b"a,b\n1,2"), "text/csv")},
    )
    assert resp.status_code == 404


# ====================================================================
# Parser de la plantilla manual
# ====================================================================

def test_parser_acepta_fecha_con_puntos(tmp_path):
    """Excel entrega 2026.01.22 (puntos) y el parser debe aceptarlo."""
    import pandas as pd

    headers = ["Fecha apertura (YYYY-MM-DD)", "Hora apertura (HH:MM:SS)", "Posición", "Símbolo",
               "Tipo (buy/sell)", "Volumen", "Precio apertura", "S/L", "T/P",
               "Fecha cierre (YYYY-MM-DD)", "Hora cierre (HH:MM:SS)", "Precio cierre",
               "Comisión", "Swap", "Beneficio"]
    filas = [headers,
             ["2026.01.22", "04:25:11", "1", "EURUSD", "buy", 0.10, 1.0850, 1.0800, 1.0950,
              "2026.01.22", "05:10:00", 1.0912, -2.5, -0.3, 62.0]]
    archivo = tmp_path / "puntos.xlsx"
    pd.DataFrame(filas).to_excel(archivo, index=False, header=False)

    trades = ManualTemplateParser().parse(str(archivo))
    assert len(trades) == 1
    assert trades[0].entry_time.strftime("%Y-%m-%d %H:%M:%S") == "2026-01-22 04:25:11"


def test_parser_calcula_pnl_neto(tmp_path):
    """El neto debe ser beneficio + comisión + swap."""
    import pandas as pd

    headers = ["Fecha apertura (YYYY-MM-DD)", "Hora apertura (HH:MM:SS)", "Posición", "Símbolo",
               "Tipo (buy/sell)", "Volumen", "Precio apertura", "S/L", "T/P",
               "Fecha cierre (YYYY-MM-DD)", "Hora cierre (HH:MM:SS)", "Precio cierre",
               "Comisión", "Swap", "Beneficio"]
    filas = [headers,
             ["2026-01-22", "09:30:00", "1", "EURUSD", "buy", 0.10, 1.0850, None, None,
              "2026-01-22", "11:14:00", 1.0912, -2.5, -0.3, 62.0]]
    archivo = tmp_path / "plantilla.xlsx"
    pd.DataFrame(filas).to_excel(archivo, index=False, header=False)

    trade = ManualTemplateParser().parse(str(archivo))[0]
    assert trade.pnl_neto == 59.2


def test_parser_rechaza_archivo_que_no_es_la_plantilla(tmp_path):
    """Un Excel cualquiera debe dar un error claro, no una excepción rara."""
    import pandas as pd

    archivo = tmp_path / "otro.xlsx"
    pd.DataFrame([["Col A", "Col B"], [1, 2]]).to_excel(archivo, index=False, header=False)

    try:
        ManualTemplateParser().parse(str(archivo))
    except ValueError as e:
        assert "no coincide con la plantilla" in str(e)
    else:
        raise AssertionError("Debía lanzar ValueError")