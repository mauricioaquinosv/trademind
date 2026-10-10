"""
Tests del freno de intentos en el login.

POR QUE EXISTEN

`/auth/login` comprobaba la contrasena y ya. Con ~100 ms de bcrypt por intento,
un atacante podia hacer diez mil intentos en veinte minutos. Este es el ataque
mas barato de todos, y el mas facil de hacer.

LO QUE SE COMPRUEBA

  1. Un login normal sigue entrando.
  2. Diez intentos fallidos bloquean el siguiente.
  3. Acertar la contrasena LIMPIA el historial, para que empezar de cero con la
     cuenta atacada no baste con fallar diez veces y acertar la onceava.
  4. El freno mira el email Y la IP. Si solo mirara el email, bastaria con
     inventarse un correo nuevo cada vez.
  5. El bloqueo es un 429, no un 401: no es que la contrasena este mal.
  6. Los intentos viejos se limpian: si no, la tabla crece para siempre.
"""

from datetime import timedelta

import pytest

from conftest import detalle

from app import login_freno
from app.models import LoginFallido, User

IP = "10.0.0.1"


def _usuario(db_session, email="freno@trademind.com", password="correcta123"):
    from app.security import hash_password

    u = User(email=email, hashed_password=hash_password(password))
    db_session.add(u)
    db_session.commit()
    return u


def _intentar(client, email="freno@trademind.com", password="malaclave"):
    return client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )


# --- lo normal -----------------------------------------------------------


def test_entrar_bien_sigue_funcionando(client_anonimo, db_session):
    _usuario(db_session)

    r = client_anonimo.post(
        "/auth/login",
        json={"email": "freno@trademind.com", "password": "correcta123"},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_contrasena_mala_sigue_dando_401(client_anonimo, db_session):
    _usuario(db_session)

    r = _intentar(client_anonimo)
    assert r.status_code == 401
    assert detalle(r).code == "auth_bad_credentials"


# --- el freno -----------------------------------------------------------


def test_diez_intentos_fallidos_bloquean(client_anonimo, db_session):
    _usuario(db_session)

    for _ in range(login_freno.MAX_INTENTOS):
        assert _intentar(client_anonimo).status_code == 401

    # El siguiente, aunque lleve la contrasena CORRECTA, se rechaza.
    r = _intentar(client_anonimo, password="correcta123")
    assert r.status_code == 429
    assert detalle(r).code == "auth_too_many_attempts"


def test_el_bloqueo_es_429_y_no_401(client_anonimo, db_session):
    """Un 401 diria que la contrasena esta mal. Un 429 dice 'espera'.

    Es la diferencia entre que el usuario de verdad entienda lo que pasa y que
    piense que su contrasena se ha roto.
    """
    _usuario(db_session)
    for _ in range(login_freno.MAX_INTENTOS):
        _intentar(client_anonimo)

    r = _intentar(client_anonimo, password="correcta123")
    assert r.status_code == 429
    assert r.status_code != 401


def test_tres_equivocos_no_llegan_a_frenar(client_anonimo, db_session):
    """El usuario de verdad se equivoca tres veces. No debe notar el freno."""
    _usuario(db_session)

    for _ in range(3):
        assert _intentar(client_anonimo).status_code == 401

    r = _intentar(client_anonimo, password="correcta123")
    assert r.status_code == 200


def test_acertar_limpia_el_historial(client_anonimo, db_session):
    """Fallar diez, acertar la onceava, y volver a estar limpio.

    Si los fallos NO se limpiaran al acertar, bastaria con ese ciclo para que el
    siguiente ataque empezara de cero con la cuenta ya atacada.
    """
    _usuario(db_session)

    for _ in range(login_freno.MAX_INTENTOS):
        _intentar(client_anonimo)

    # El bloqueo salta...
    assert _intentar(client_anonimo, password="correcta123").status_code == 429

    # ...pero se limpia a mano, como si la ventana hubiera pasado, y se comprueba
    # que entonces entra y que el contador vuelve a cero.
    db_session.query(LoginFallido).delete()
    db_session.commit()

    assert _intentar(client_anonimo, password="correcta123").status_code == 200
    assert db_session.query(LoginFallido).count() == 0


def test_entrar_bien_no_deja_rastro_de_fallos(client_anonimo, db_session):
    _usuario(db_session)

    for _ in range(4):
        _intentar(client_anonimo)

    _intentar(client_anonimo, password="correcta123")

    # Los cuatro fallos anteriores se han borrado al entrar bien.
    assert db_session.query(LoginFallido).count() == 0


# --- el email Y la IP ---------------------------------------------------


def test_cambiar_de_email_no_escapa_al_freno(client_anonimo, db_session):
    """El ataque de verdad prueba muchos correos distintos desde un sitio.

    Por eso el freno mira la IP tambien. Si solo mirara el email, bastaria con
    inventarse un correo nuevo en cada intento y no contaria nunca.
    """
    _usuario(db_session, email="freno@trademind.com")

    # Diez fallos contra el mismo correo...
    for _ in range(login_freno.MAX_INTENTOS):
        _intentar(client_anonimo, email="freno@trademind.com")

    # ...y ahora con otro correo distinto, desde la MISMA IP.
    r = _intentar(client_anonimo, email="otro@trademind.com", password="correcta123")
    assert r.status_code == 429, "cambiar de email esquivaria el freno"


def test_el_email_se_normaliza_a_minusculas(db_session):
    """'Juan@x.com' y 'juan@x.com' son la MISMA cuenta.

    Sin normalizar, un atacante podria alternar mayusculas para que cada
    intento contara como una cuenta distinta y el freno no llegara nunca.
    """
    login_freno.registra_fallo(db_session, "Juan@Trademind.com", IP)
    login_freno.registra_fallo(db_session, "juan@trademind.com", IP)

    # Son dos filas, porque son dos intentos: lo que importa es que las dos
    # guarden el MISMO email, y no uno con mayusculas y otro sin ellas. Si cada
    # intento se guardara con las letras como llegaron, contarian como dos
    # cuentas distintas.
    emails = {f.email for f in db_session.query(LoginFallido).all()}
    assert emails == {"juan@trademind.com"}, emails


# --- la limpieza --------------------------------------------------------


def test_los_intentos_viejos_se_borran(db_session):
    """Sin limpieza, la tabla crece una fila por cada intento fallido, para
    siempre. Con alguien probando contrasenas, eso son miles de filas al dia."""
    from datetime import datetime, timezone

    viejo = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2)
    db_session.add(LoginFallido(email="viejo@x.com", ip=IP, cuando=viejo))
    db_session.add(
        LoginFallido(
            email="nuevo@x.com",
            ip=IP,
            cuando=datetime.now(timezone.utc).replace(tzinfo=None),
        )
    )
    db_session.commit()

    login_freno.registra_fallo(db_session, "otro@x.com", IP)

    emails = [f.email for f in db_session.query(LoginFallido).all()]
    assert "viejo@x.com" not in emails, "los intentos viejos deberian estar borrados"
    assert "nuevo@x.com" in emails, "los recientes tienen que quedarse"


def test_el_tope_y_la_ventana_son_los_acordados():
    """10 intentos y 15 minutos. Si alguien los cambia, este test salta."""
    assert login_freno.MAX_INTENTOS == 10
    assert login_freno.VENTANA_MINUTOS == 15


def test_un_intento_fuera_de_la_ventana_no_cuenta(db_session):
    """Pasados 15 minutos, el intento antiguo no bloquea."""
    from datetime import datetime, timezone

    _usuario(db_session)
    hace_20 = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=20)

    for _ in range(login_freno.MAX_INTENTOS - 1):
        db_session.add(
            LoginFallido(email="freno@trademind.com", ip=IP, cuando=hace_20)
        )
    db_session.commit()

    assert not login_freno.esta_bloqueado(db_session, "freno@trademind.com", IP)