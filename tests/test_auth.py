"""
Tests de autenticacion: registro, login, JWT y rechazo en endpoints protegidos.

Antes de este fichero, /auth no tenia NINGUN test, y es justo el sitio donde un
fallo se traduce en "no puedo entrar" o, peor, en "entra cualquiera".

El punto de estos tests es que usan `client_anonimo`, que NO sustituye
`get_current_user`. Con el cliente normal esa dependencia esta parcheada y el
codigo real de validacion del token no se ejecuta nunca.
"""

from datetime import datetime, timedelta, timezone

import pytest

from conftest import detalle
from jose import jwt

from app.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    hash_password,
    verify_password,
)

EMAIL = "auth@trademind.com"
PASSWORD = "UnaContrasenaLarga1"


# --- registro -------------------------------------------------------------


def test_registro_crea_el_usuario(client_anonimo, db_session):
    from app.models import User

    r = client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})

    assert r.status_code == 201
    assert r.json()["email"] == EMAIL
    assert db_session.query(User).filter(User.email == EMAIL).count() == 1


def test_registro_no_guarda_la_contrasena_en_claro(client_anonimo, db_session):
    from app.models import User

    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})

    user = db_session.query(User).filter(User.email == EMAIL).first()
    assert user.hashed_password != PASSWORD
    # bcrypt produce hashes de 60 caracteres que empiezan por $2b$
    assert user.hashed_password.startswith("$2")
    assert verify_password(PASSWORD, user.hashed_password)


def test_registro_con_email_repetido_da_400(client_anonimo):
    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    r = client_anonimo.post("/auth/register", json={"email": EMAIL, "password": "Otra9"})

    assert r.status_code == 400
    assert detalle(r).code == "auth_email_taken"


@pytest.mark.parametrize(
    "email",
    ["no-es-un-email", "sin-dominio@", "@sinusuario.com", "con espacio@x.com", ""],
)
def test_registro_con_email_invalido_da_422(client_anonimo, email):
    r = client_anonimo.post("/auth/register", json={"email": email, "password": PASSWORD})
    assert r.status_code == 422


def test_registro_sin_contrasena_da_422(client_anonimo):
    """Falta el campo entero, no es lo mismo que mandarlo vacio."""
    r = client_anonimo.post("/auth/register", json={"email": EMAIL})
    assert r.status_code == 422


def test_registro_acepta_contrasena_vacia(client_anonimo, db_session):
    """
    COMPROBADO, NO SUPONI: UserCreate no pone minimo de longitud, asi que una
    contrasena vacia se registra y luego permite iniciar sesion.

    No es un test que deberia pasar; es la prueba de que el hueco existe. Si
    algun dia se anade la validacion, este test falla y avisa.
    """
    from app.models import User

    r = client_anonimo.post("/auth/register", json={"email": EMAIL, "password": ""})
    assert r.status_code == 201

    login = client_anonimo.post("/auth/login", json={"email": EMAIL, "password": ""})
    assert login.status_code == 200
    assert db_session.query(User).filter(User.email == EMAIL).count() == 1


# --- login ----------------------------------------------------------------


def test_login_devuelve_token(client_anonimo):
    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})

    r = client_anonimo.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})

    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_con_contrasena_incorrecta_da_401(client_anonimo):
    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})

    r = client_anonimo.post("/auth/login", json={"email": EMAIL, "password": "Incorrecta9"})

    assert r.status_code == 401


def test_login_de_usuario_inexistente_da_401(client_anonimo):
    r = client_anonimo.post("/auth/login", json={"email": "nadie@trademind.com", "password": PASSWORD})
    assert r.status_code == 401


def test_login_es_sensible_a_las_mayusculas_del_email(client_anonimo):
    """
    El login busca por igualdad exacta. Registrado en minusculas y entrado en
    mayusculas NO es el mismo usuario, porque PostgreSQL compara el texto tal
    cual. Se documenta el comportamiento en vez de suponerlo.
    """
    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})

    r = client_anonimo.post("/auth/login", json={"email": EMAIL.upper(), "password": PASSWORD})

    assert r.status_code == 401


def test_el_error_de_login_devuelve_codigo_y_texto(client_anonimo):
    """
    El backend ya no tiene idioma: devuelve un codigo estable y, aparte, el
    texto en espanol para quien lee la respuesta sin interfaz. Es lo que
    permite que el frontend traduzca sin que el backend sepa que hay dos
    idiomas.
    """
    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    r = client_anonimo.post("/auth/login", json={"email": EMAIL, "password": "mala"})
    d = detalle(r)
    assert d.code == "auth_bad_credentials"
    assert d.text, "el texto en espanol se queda para el que lee sin interfaz"


# --- el token -------------------------------------------------------------


def test_el_token_lleva_el_id_del_usuario(client_anonimo, db_session):
    from app.models import User

    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    token = client_anonimo.post("/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()[
        "access_token"
    ]

    user = db_session.query(User).filter(User.email == EMAIL).first()
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user.id)


def test_token_firmado_con_otra_clave_da_401(client_anonimo):
    from app.models import User

    client_anonimo.post("/auth/register", json={"email": EMAIL, "password": PASSWORD})
    user = client_anonimo  # solo para dejar claro el flujo

    falso = jwt.encode(
        {"sub": "00000000-0000-0000-0000-000000000000", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        "una-clave-que-no-es-la-true",
        algorithm=ALGORITHM,
    )

    r = client_anonimo.get("/trades/", params={"account_id": "00000000-0000-0000-0000-000000000000"},
                           headers={"Authorization": f"Bearer {falso}"})
    assert r.status_code == 401


def test_token_caducado_da_401(client_anonimo, db_session):
    from app.models import User

    user = User(email="caducado@trademind.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    caducado = jwt.encode(
        {"sub": str(user.id), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    r = client_anonimo.get(
        "/trades/",
        params={"account_id": "00000000-0000-0000-0000-000000000000"},
        headers={"Authorization": f"Bearer {caducado}"},
    )
    assert r.status_code == 401


def test_token_de_usuario_borrado_da_401(client_anonimo, db_session):
    """El token es valido en si, pero si el usuario ya no existe, no vale."""
    from app.models import User

    user = User(email="fantasma@trademind.com", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    uid = user.id

    token = create_access_token({"sub": str(uid)})
    db_session.delete(user)
    db_session.commit()

    r = client_anonimo.get(
        "/trades/",
        params={"account_id": "00000000-0000-0000-0000-000000000000"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401


# --- endpoints protegidos -------------------------------------------------


@pytest.mark.parametrize(
    "ruta",
    ["/trades/", "/accounts/"],
)
def test_endpoint_protegido_sin_token_da_401(client_anonimo, ruta):
    r = client_anonimo.get(ruta, params={"account_id": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 401


def test_endpoint_protegido_con_token_garbage_da_401(client_anonimo):
    r = client_anonimo.get(
        "/accounts/",
        headers={"Authorization": "Bearer esto-no-es-un-jwt"},
    )
    assert r.status_code == 401


def test_esquema_bearer_ausente_en_la_401(client_anonimo):
    """Sin WWW-Authenticate, los clientes OAuth no saben que reintentar."""
    r = client_anonimo.get("/accounts/")
    assert r.status_code == 401
    assert r.headers.get("www-authenticate") == "Bearer"


def test_token_valido_permite_entrar(client_anonimo, usuario, cuenta):
    token = create_access_token({"sub": str(usuario.id)})
    r = client_anonimo.get(
        "/accounts/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert len(r.json()) == 1


# --- hashing --------------------------------------------------------------


def test_hash_y_verify_por_encima_de_la_api(client_anonimo):
    h = hash_password(PASSWORD)
    assert verify_password(PASSWORD, h)
    assert not verify_password(PASSWORD + "x", h)


def test_dos_hashes_de_la_misma_contrasena_son_distintos():
    """bcrypt lleva sal: el hash nunca puede usarse para comparar contraseñas."""
    assert hash_password(PASSWORD) != hash_password(PASSWORD)
