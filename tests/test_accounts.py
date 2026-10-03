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