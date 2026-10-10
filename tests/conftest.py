"""
Configuración compartida de los tests.

Usa una base de datos SEPARADA (trademind_test) en el mismo PostgreSQL de Docker,
para que los tests nunca toquen los datos reales del usuario.

Se usa PostgreSQL (y no SQLite) a propósito: los modelos usan el tipo UUID
específico de PostgreSQL, que no existe en SQLite. Usar SQLite obligaría a cambiar
los modelos y esconde diferencias de comportamiento.
"""

import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.dependencies import get_current_user
from app.main import app
from app.models import User

# --- Base de datos de pruebas -------------------------------------------
# Si el servidor no define TEST_DATABASE_URL, la derivamos de DATABASE_URL
# cambiando el nombre de la base. Así no hay que duplicar credenciales.
PRIMARY_URL = os.getenv("DATABASE_URL")
if not PRIMARY_URL:
    raise RuntimeError("DATABASE_URL no está definida; ¿existe el archivo .env?")

TEST_DB_NAME = os.getenv("TEST_DB_NAME", "trademind_test")
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or (
    PRIMARY_URL.rsplit("/", 1)[0] + "/" + TEST_DB_NAME
)

# La URL de la BD de pruebas debe apuntar SIEMPRE a la base de pruebas,
# aunque alguien se equivoque al definir la variable.
if not TEST_DATABASE_URL.endswith(TEST_DB_NAME):
    raise RuntimeError(
        f"TEST_DATABASE_URL debe terminar en '{TEST_DB_NAME}', "
        f"pero es: {TEST_DATABASE_URL}"
    )


@pytest.fixture(scope="session", autouse=True)
def _crear_base_de_datos():
    """Crea la base de pruebas y las tablas. La deja existir entre sesiones."""
    admin_engine = create_engine(PRIMARY_URL, isolation_level="AUTOCOMMIT")

    with admin_engine.connect() as conn:
        existe = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :nombre"),
            {"nombre": TEST_DB_NAME},
        ).scalar()
        if not existe:
            # CREATE DATABASE no admite parametros vinculados.
            conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))

    test_engine = create_engine(TEST_DATABASE_URL)
    Base.metadata.create_all(test_engine)
    yield
    test_engine.dispose()
    admin_engine.dispose()


@pytest.fixture
def db_session(_crear_base_de_datos):
    """Sesión contra la BD de pruebas, con limpieza antes de cada test."""
    engine = create_engine(TEST_DATABASE_URL)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    session = TestingSession()
    # Empezamos de cero para que cada test sea independiente.
    # `login_fallidos` tambien entra: es donde cuenta el freno de intentos del
    # login, y si sus filas se quedaron de un test anterior, el test siguiente
    # IECAPA antes de tiempo y falla sin relacion con lo que prueba.
    session.execute(
        text("TRUNCATE trades, accounts, users, login_fallidos RESTART IDENTITY CASCADE")
    )
    session.commit()

    yield session
    session.close()
    engine.dispose()


@pytest.fixture
def usuario(db_session):
    """Un usuario ya creado y listo para usar."""
    user = User(email="test@trademind.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def otro_usuario(db_session):
    """Un segundo usuario, para probar el aislamiento entre cuentas."""
    user = User(email="otro@trademind.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def make_client(db_session):
    """
    Devuelve una funcion `act_as(usuario)` que deja al cliente autenticado
    como ese usuario.

    `app.dependency_overrides` es GLOBAL, por lo que dos fixtures de cliente
    conviviendo se pisarian entre si y los tests de aislamiento entre usuarios
    fallarian por motivos equivocados. Aqui hay un unico cliente y se cambia de
    identidad bajo demanda, que es lo que esos tests necesitan.
    """
    from fastapi.testclient import TestClient

    identidad: dict = {"usuario": None}

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = lambda: identidad["usuario"]

    cliente = TestClient(app)

    def _act_as(usuario):
        identidad["usuario"] = usuario
        return cliente

    yield _act_as

    app.dependency_overrides.clear()
    cliente.close()


@pytest.fixture
def client(make_client, usuario):
    """Cliente autenticado como el usuario de prueba."""
    return make_client(usuario)


@pytest.fixture
def client_otro_usuario(make_client, otro_usuario):
    """Cliente autenticado como el segundo usuario (para probar aislamiento)."""
    return make_client(otro_usuario)


@pytest.fixture
def client_anonimo(db_session):
    """
    Cliente SIN la dependencia de usuario sustituida.

    `make_client` reemplaza `get_current_user`, asi que con el nunca se ejecuta
    el codigo real de validacion del JWT. Este cliente deja la dependencia
    intacta y solo sustituye la sesion de base de datos, que es lo necesario
    para probar /auth y el rechazo a los endpoints protegidos.
    """
    from fastapi.testclient import TestClient

    def _get_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_db

    cliente = TestClient(app)

    yield cliente

    app.dependency_overrides.clear()
    cliente.close()


def detalle(respuesta):
    """
    El `detail` de un error de la API, desempaquetado.

    Los errores devuelven {"code": ..., "text": ...} y no un texto suelto, para
    que la interfaz pueda traducirlos. Esta funcion devuelve un objeto con
    `.code` y `.text` para que los tests se lean como antes, sin repetir el
    desempaquetado en cada asercion.

    No es un fixture: se llama con la respuesta, `detalle(r)`.

    Ademas comprueba la forma. Si alguien vuelve a poner un texto suelto en
    `detail`, el fallo lo dice aqui y no en una asercion a 300 lineas de
    distancia que no explica de donde sale el problema.
    """
    from types import SimpleNamespace

    cuerpo = respuesta.json()
    assert isinstance(cuerpo, dict), f"el error deberia ser un objeto JSON: {cuerpo!r}"
    assert "detail" in cuerpo, f"faltaba 'detail' en la respuesta: {cuerpo!r}"

    d = cuerpo["detail"]
    assert isinstance(d, dict), (
        "detail deberia ser un objeto con 'code' y 'text', no un texto suelto. "
        f"Llego: {d!r}"
    )
    assert "code" in d, f"faltaba 'code' en el detail: {d!r}"
    assert "text" in d, f"faltaba 'text' en el detail: {d!r}"

    return SimpleNamespace(
        code=d["code"], text=d["text"], **{k: v for k, v in d.items() if k not in ("code", "text")}
    )


@pytest.fixture
def cuenta(usuario, db_session):
    """Una cuenta creada por el usuario de prueba."""
    from app.models import Account

    acc = Account(
        user_id=usuario.id,
        name="Cuenta de prueba",
        initial_balance=10000.0,
        currency="USD",
        source="manual",
    )
    db_session.add(acc)
    db_session.commit()
    db_session.refresh(acc)
    return acc