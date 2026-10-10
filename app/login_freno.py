"""
FRENO DE INTENTOS EN EL LOGIN.

POR QUE ESTO EXISTE

`/auth/login` comprobaba la contrasena y ya. El bcrypt da unos 100 ms por
intento, asi que un atacante podia hacer miles contra un correo concreto hasta
que la contrasena saltara. Diez mil intentos son casi veinte minutos.

COMO FUNCIONA

Se cuentan los intentos fallidos por DOS cosas a la vez:

  - el email: para no machacar la cuenta de alguien
  - la IP: porque el ataque de verdad prueba muchos correos distintos desde el
    mismo sitio. Si solo se contara por email, bastaria con inventarse un
    correo nuevo cada vez y el freno no serviria de nada.

Con 10 intentos en 15 minutos, un atacante hace 10 intentos cada cuarto de hora,
que es inutil. Y el usuario de verdad, que se equivoca la contrasena tres veces
seguidas, no llega ni a notar el freno.

LIMPIEZA

Los intentos viejos se borran en cada llamada. Sin eso, la tabla creceria sin
limite: una fila por cada login fallido, para siempre.

OJO CON UN DETALLE QUE PARECE UN BUG Y NO LO ES

Un acierto NO cuenta como intento, pero ademas BORRA los fallos anteriores de
ese email. Asi, el que se equivoca tres veces, se equivoca una cuarta, y entra
bien, vuelve a tener la cuenta limpia. Si no se borraran, bastaria con fallar
diez veces y acertar la onceava para que el siguiente ataque empezara de cero.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import LoginFallido

# 10 intentos y 15 minutos. Diez es lo estandar; quince es lo que tarda una
# persona en recordar su contrasena de verdad.
MAX_INTENTOS = 10
VENTANA_MINUTOS = 15

# Al borrar, se mira un poco mas atras que la ventana: si no, un intento que
# cae justo en el borde se contaria dos veces o no contaria ninguna.
MARGEN_MINUTOS = 2


def _naive_utc() -> datetime:
    """La misma base que `utcnow_naive` de models.py: UTC sin zona horaria."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _desde(hasta: datetime) -> datetime:
    return hasta - timedelta(minutes=VENTANA_MINUTOS + MARGEN_MINUTOS)


def cuenta_intentos(db: Session, email: str, ip: str) -> int:
    """Cuantos intentos fallidos lleva este email DESDE ESTA IP.

    Ojo: esta es la cuenta COMBINADA, y es la que se usa para decidir si se
    bloquea. La que decide de verdad esta en `esta_bloqueado`, que mira por
    separado el email y la IP. Ver la nota de alli.
    """
    desde = _desde(_naive_utc())

    return (
        db.query(LoginFallido)
        .filter(
            LoginFallido.email == _normaliza(email),
            LoginFallido.ip == ip,
            LoginFallido.cuando >= desde,
        )
        .count()
    )


def _normaliza(email: str) -> str:
    return (email or "").strip().lower()


def esta_bloqueado(db: Session, email: str, ip: str) -> bool:
    """Bloquea si se pasa el tope POR EL EMAIL O POR LA IP.

    Lo importante es el "o", y no es un detalle. Con un "y" el freno se esquivaba
    cambiando de correo: si los diez fallos eran de `uno@x.com`, pedir
    `dos@x.com` contaba cero y el bloqueo nunca saltaba. Eso es exactamente el
    ataque de verdad, porque probar contrasenas contra muchos correos distintos
    desde el mismo sitio es lo que hace un atacante.

    Asi que se mira por separado:
      - el email, para no machacar la cuenta de alguien
      - la IP, para que cambiar de correo no sirva de nada
    """
    desde = _desde(_naive_utc())

    por_email = (
        db.query(LoginFallido)
        .filter(LoginFallido.email == _normaliza(email), LoginFallido.cuando >= desde)
        .count()
    )
    if por_email >= MAX_INTENTOS:
        return True

    por_ip = (
        db.query(LoginFallido)
        .filter(LoginFallido.ip == ip, LoginFallido.cuando >= desde)
        .count()
    )
    return por_ip >= MAX_INTENTOS


def registra_fallo(db: Session, email: str, ip: str) -> int:
    """Apunta un intento fallido, limpia los viejos y devuelve el total.

    Devolver el total evita una segunda consulta: el endpoint lo necesita para
    el mensaje de "te quedan X".
    """
    ahora = _naive_utc()

    # Se limpia primero lo que ya no cuenta. Sin esto la tabla crece sin limite:
    # una fila por cada login fallido, para siempre.
    db.query(LoginFallido).filter(LoginFallido.cuando < _desde(ahora)).delete(
        synchronize_session=False
    )

    db.add(LoginFallido(email=_normaliza(email), ip=ip, cuando=ahora))
    db.commit()

    return cuenta_intentos(db, email, ip)


def limpia(db: Session, email: str, ip: str) -> int:
    """Borra los fallos de este email e IP. Se llama cuando el login ACIERTA."""
    borrados = (
        db.query(LoginFallido)
        .filter(
            LoginFallido.email == _normaliza(email),
            LoginFallido.ip == ip,
        )
        .delete(synchronize_session=False)
    )
    db.commit()
    return borrados