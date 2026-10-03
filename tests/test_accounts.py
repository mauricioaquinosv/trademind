"""
Tests de los endpoints de cuentas (/accounts).

Se verifica sobre una base de datos de pruebas aparte, así que estos tests
nunca tocan los datos reales del usuario.
"""

from app.models import Account


# ====================================================================
# POST /accounts/
# ====================================================================

def test_crear_cuenta(client):
    resp = client.post("/accounts/", json={
        "name": "Mi cuenta MT5",
        "initial_balance": 10000.0,
        "currency": "USD",
        "source": "csv",
    })

    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Mi cuenta MT5"
    assert data["initial_balance"] == 10000.0
    assert data["currency"] == "USD"
    assert data["source"] == "csv"
    assert data["id"] is not None


def test_crear_cuenta_asigna_al_usuario_autenticado(client, usuario):
    """La cuenta debe pertenecer al usuario del token, no a otro."""
    resp = client.post("/accounts/", json={
        "name": "Cuenta asignada",
        "initial_balance": 500.0,
        "currency": "USD",
        "source": "manual",
    })

    assert resp.status_code == 201
    listado = client.get("/accounts/").json()
    assert len(listado) == 1
    assert listado[0]["id"] == resp.json()["id"]


def test_crear_cuenta_acepta_balance_cero(client):
    """Balance 0 es válido (alguien puede empezar sin depósito registrado)."""
    resp = client.post("/accounts/", json={
        "name": "Sin fondo",
        "initial_balance": 0.0,
        "currency": "USD",
        "source": "manual",
    })
    assert resp.status_code == 201
    assert resp.json()["initial_balance"] == 0.0


def test_crear_cuenta_rechaza_nombre_vacio(client):
    """El nombre es obligatorio: no puede ser una cadena en blanco."""
    resp = client.post("/accounts/", json={
        "name": "   ",
        "initial_balance": 100.0,
        "currency": "USD",
        "source": "manual",
    })
    assert resp.status_code == 422


def test_crear_cuenta_rechaza_balance_negativo(client):
    """Un balance negativo no tiene sentido como depósito inicial."""
    resp = client.post("/accounts/", json={
        "name": "Negativa",
        "initial_balance": -100.0,
        "currency": "USD",
        "source": "manual",
    })
    assert resp.status_code == 422


def test_crear_cuenta_rechaza_faltantes(client):
    """Sin nombre o sin balance debe fallar la validación."""
    resp = client.post("/accounts/", json={"currency": "USD", "source": "manual"})
    assert resp.status_code == 422


def test_crear_cuenta_recorta_espacios_del_nombre(client):
    """'  Mi cuenta  ' debe guardarse como 'Mi cuenta'."""
    resp = client.post("/accounts/", json={
        "name": "  Mi cuenta  ",
        "initial_balance": 100.0,
        "currency": "USD",
        "source": "manual",
    })
    assert resp.status_code == 201
    assert resp.json()["name"] == "Mi cuenta"


def test_crear_cuenta_rechaza_source_desconocido(client):
    """'source' solo admite los valores que el sistema sabe interpretar."""
    resp = client.post("/accounts/", json={
        "name": "Fuente rara",
        "initial_balance": 100.0,
        "currency": "USD",
        "source": "por_ftp",
    })
    assert resp.status_code == 422


def test_crear_cuenta_normaliza_moneda(client):
    """La moneda se guarda en mayúsculas para que 'usd' y 'USD' sean lo mismo."""
    resp = client.post("/accounts/", json={
        "name": "En dolares",
        "initial_balance": 100.0,
        "currency": "usd",
        "source": "manual",
    })
    assert resp.status_code == 201
    assert resp.json()["currency"] == "USD"


# ====================================================================
# GET /accounts/
# ====================================================================

def test_listar_cuentas_vacio_si_no_hay(client):
    resp = client.get("/accounts/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_listar_cuentas_devuelve_las_del_usuario(client):
    client.post("/accounts/", json={"name": "A", "initial_balance": 1.0,
                                    "currency": "USD", "source": "manual"})
    client.post("/accounts/", json={"name": "B", "initial_balance": 2.0,
                                    "currency": "USD", "source": "csv"})

    resp = client.get("/accounts/")
    assert resp.status_code == 200
    datos = resp.json()
    assert len(datos) == 2
    assert {c["name"] for c in datos} == {"A", "B"}


def test_un_usuario_no_ve_las_cuentas_de_otro(cuenta, make_client, otro_usuario):
    """Aislamiento: las cuentas de un usuario no aparecen para otro."""
    cliente = make_client(otro_usuario)
    resp = cliente.get("/accounts/")
    assert resp.status_code == 200
    assert resp.json() == []


# ====================================================================
# GET /accounts/{id}
# ====================================================================

def test_obtener_cuenta_por_id(client, cuenta):
    resp = client.get(f"/accounts/{cuenta.id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == str(cuenta.id)
    assert resp.json()["name"] == "Cuenta de prueba"


def test_obtener_cuenta_inexistente_da_404(client):
    resp = client.get("/accounts/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Cuenta no encontrada"


def test_no_puede_ver_cuenta_de_otro_usuario(cuenta, make_client, otro_usuario):
    """Aunque sepa el id, otro usuario no puede leer esa cuenta."""
    cliente = make_client(otro_usuario)
    resp = cliente.get(f"/accounts/{cuenta.id}")
    assert resp.status_code == 404


# ====================================================================
# Integridad con la base de datos
# ====================================================================

def test_cuenta_queda_persistida(client, db_session):
    """Lo que se devuelve por la API es lo que queda en la tabla."""
    resp = client.post("/accounts/", json={
        "name": "Persistida",
        "initial_balance": 777.0,
        "currency": "USD",
        "source": "manual",
    })
    id_creada = resp.json()["id"]

    guardada = db_session.query(Account).filter(Account.id == id_creada).one()
    assert guardada.name == "Persistida"
    assert guardada.initial_balance == 777.0


def test_cuentas_sin_trades_no_fallan(client, cuenta):
    """Una cuenta recién creada se puede listar sin tener operaciones."""
    resp = client.get(f"/trades/?account_id={cuenta.id}")
    assert resp.status_code == 200
    assert resp.json() == []


# ====================================================================
# PUT /accounts/{id}  — editar
# ====================================================================

def test_editar_correge_el_balance_inicial(client, cuenta):
    """Este es el caso de uso principal: teclear mal el balance y corregirlo."""
    resp = client.put(f"/accounts/{cuenta.id}", json={"initial_balance": 25000.0})

    assert resp.status_code == 200
    assert resp.json()["initial_balance"] == 25000.0


def test_editar_cambia_el_nombre(client, cuenta):
    resp = client.put(f"/accounts/{cuenta.id}", json={"name": "Nombre corregido"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Nombre corregido"


def test_editar_recorta_espacios_del_nombre(client):
    creado = client.post("/accounts/", json={
        "name": "Original", "initial_balance": 100.0,
        "currency": "USD", "source": "manual",
    }).json()

    resp = client.put(f"/accounts/{creado['id']}", json={"name": "  Corregido  "})
    assert resp.json()["name"] == "Corregido"


def test_editar_solo_cambia_lo_enviado(client, cuenta):
    """Campos omitidos deben quedarse como estaban."""
    resp = client.put(f"/accounts/{cuenta.id}", json={"name": "Solo el nombre"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Solo el nombre"
    assert data["initial_balance"] == cuenta.initial_balance
    assert data["currency"] == cuenta.currency
    assert data["source"] == cuenta.source


def test_editar_puede_dejar_el_balance_en_cero(client, cuenta):
    """Balance 0 es valido, y es distinto de 'no lo he enviado'."""
    resp = client.put(f"/accounts/{cuenta.id}", json={"initial_balance": 0.0})
    assert resp.status_code == 200
    assert resp.json()["initial_balance"] == 0.0


def test_editar_rechaza_balance_negativo(client, cuenta):
    resp = client.put(f"/accounts/{cuenta.id}", json={"initial_balance": -5.0})
    assert resp.status_code == 422


def test_editar_rechaza_nombre_en_blanco(client, cuenta):
    resp = client.put(f"/accounts/{cuenta.id}", json={"name": "   "})
    assert resp.status_code == 422


def test_editar_normaliza_moneda(client, cuenta):
    resp = client.put(f"/accounts/{cuenta.id}", json={"currency": "eur"})
    assert resp.status_code == 200
    assert resp.json()["currency"] == "EUR"


def test_editar_no_puede_cambiar_el_origen(client, cuenta):
    """'source' indica de donde vinieron los datos; no se edita a mano."""
    resp = client.put(f"/accounts/{cuenta.id}", json={"source": "manual"})
    assert resp.status_code == 200
    assert resp.json()["source"] == cuenta.source


def test_editar_cuenta_inexistente_da_404(client):
    resp = client.put("/accounts/00000000-0000-0000-0000-000000000000",
                      json={"name": "X"})
    assert resp.status_code == 404


def test_editar_cuenta_ajena_da_404(cuenta, make_client, otro_usuario):
    """Aislamiento: ni siquiera se puede modificar la cuenta de otro."""
    cliente = make_client(otro_usuario)
    resp = cliente.put(f"/accounts/{cuenta.id}", json={"name": "Secuestrada"})
    assert resp.status_code == 404


def test_editar_persiste_en_la_base(client, db_session, cuenta):
    """Lo que devuelve la API es lo que queda guardado."""
    client.put(f"/accounts/{cuenta.id}", json={"initial_balance": 4242.0})
    guardada = db_session.query(Account).filter(Account.id == cuenta.id).one()
    assert guardada.initial_balance == 4242.0


# ====================================================================
# DELETE /accounts/{id}  — borrar
# ====================================================================

def test_borrar_cuenta(client, cuenta):
    resp = client.delete(f"/accounts/{cuenta.id}")

    assert resp.status_code == 204
    assert client.get(f"/accounts/{cuenta.id}").status_code == 404
    assert cuenta.id not in [a["id"] for a in client.get("/accounts/").json()]


def test_borrar_una_cuenta_no_toca_las_otras(client, cuenta):
    otra = client.post("/accounts/", json={
        "name": "Se queda", "initial_balance": 1.0,
        "currency": "USD", "source": "manual",
    }).json()

    client.delete(f"/accounts/{cuenta.id}")

    restantes = client.get("/accounts/").json()
    assert [a["id"] for a in restantes] == [otra["id"]]


def test_borrar_cuenta_con_operaciones_no_borra_nada_sin_confirmar(client, db_session, cuenta):
    """
    Si la cuenta tiene operaciones, el primer borrado se rechaza con 409 y no
    se toca nada. Los trades NO pueden quedar huerfanos: la clave foranea lo
    impide, y si se pudieran dejar serian invisibles en el dashboard.
    """
    from app.models import Trade

    client.post("/trades/", json={
        "account_id": str(cuenta.id), "symbol": "EURUSD", "direction": "long",
        "quantity": 0.1, "entry_price": 1.0, "exit_price": 1.1, "pnl_bruto": 10.0,
    })

    resp = client.delete(f"/accounts/{cuenta.id}")

    assert resp.status_code == 409
    assert "1 operacion" in resp.json()["detail"]
    assert "delete_trades=true" in resp.json()["detail"]
    # Nada se ha perdido
    assert client.get(f"/accounts/{cuenta.id}").status_code == 200
    assert db_session.query(Trade).filter(Trade.account_id == cuenta.id).count() == 1


def test_borrar_cuenta_sin_operaciones_no_pide_confirmacion(client, cuenta):
    """Sin operaciones no hay nada que perder, asi que se borra directo."""
    resp = client.delete(f"/accounts/{cuenta.id}")
    assert resp.status_code == 204
    assert client.get(f"/accounts/{cuenta.id}").status_code == 404


def test_borrar_con_delete_trades_tambien_borra_las_operaciones(
    client, db_session, cuenta
):
    """Con ?delete_trades=true se confirma y se borra todo: cuenta y operaciones."""
    from app.models import Trade

    client.post("/trades/", json={
        "account_id": str(cuenta.id), "symbol": "EURUSD", "direction": "long",
        "quantity": 0.1, "entry_price": 1.0, "exit_price": 1.1, "pnl_bruto": 10.0,
    })
    client.post("/trades/", json={
        "account_id": str(cuenta.id), "symbol": "GBPUSD", "direction": "short",
        "quantity": 0.2, "entry_price": 1.3, "exit_price": 1.2, "pnl_bruto": -5.0,
    })

    resp = client.delete(f"/accounts/{cuenta.id}?delete_trades=true")
    assert resp.status_code == 204

    assert db_session.query(Trade).filter(Trade.account_id == cuenta.id).count() == 0
    assert client.get(f"/accounts/{cuenta.id}").status_code == 404


def test_el_409_cuenta_cuantas_operaciones_tiene(client, cuenta):
    """El mensaje dice cuantas son, para que se pueda decidir con informacion."""
    for i in range(3):
        client.post("/trades/", json={
            "account_id": str(cuenta.id), "symbol": f"SYM{i}", "direction": "long",
            "quantity": 0.1, "entry_price": 1.0, "exit_price": 1.1, "pnl_bruto": 1.0,
        })

    resp = client.delete(f"/accounts/{cuenta.id}")
    assert resp.status_code == 409
    assert "3 operacion" in resp.json()["detail"]


def test_borrar_cuenta_inexistente_da_404(client):
    resp = client.delete("/accounts/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


def test_borrar_cuenta_ajena_da_404(cuenta, make_client, otro_usuario, db_session):
    """Aislamiento: otro usuario no puede borrar cuentas ajenas."""
    cliente = make_client(otro_usuario)
    resp = cliente.delete(f"/accounts/{cuenta.id}")

    assert resp.status_code == 404
    # Y la cuenta sigue existiendo
    assert db_session.query(Account).filter(Account.id == cuenta.id).count() == 1