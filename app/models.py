import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def utcnow_naive() -> datetime:
    """
    Hora actual en UTC, sin zona horaria (naive).

    Sustituye a datetime.utcnow(), que está deprecado desde Python 3.12 y
    disappears en una versión futura.

    El .replace(tzinfo=None) es DELIBERADO: las columnas son DateTime sin
    timezone, y los valores ya guardados en la base son naive. Si se empezaran
    a guardar con zona horaria, las comparaciones contra los datos antiguos
    fallarían. Con esto, el valor guardado es idéntico al de siempre.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow_naive)


class Account(Base):
    __tablename__ = "accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String, nullable=False)
    initial_balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    source = Column(String, default="manual")  # 'manual' o 'csv'

    created_at = Column(DateTime, default=utcnow_naive)


class LoginFallido(Base):
    """
    Un intento de login que fallo, contado por email y por direccion IP.

    POR QUE ESTA EN LA BASE Y NO EN MEMORIA

    Un diccionario en memoria seria mas simple, pero se pierde al reiniciar el
    servidor: basta con reiniciarlo para que el freno se borre entero. Y con dos
    procesos (que es lo normal al desplegar) cada uno contaria por su lado, y el
    limite real seria el doble del que crees.

    En la base no pasa ninguna de las dos cosas.

    La contrasena correcta NO se guarda aqui, y los intentos se borran en cuanto
    uno acierta: esto solo cuenta fallos, no guarda cuentas.
    """

    __tablename__ = "login_fallidos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # El email se normaliza a minusculas al guardarlo. Si no, "Juan@x.com" y
    # "juan@x.com" contarian como dos cuentas distintas y el freno no serviria.
    email = Column(String, nullable=False, index=True)

    # La IP va aparte del email porque tambien hay que frenar a quien prueba
    # muchos correos distintos desde el mismo sitio, que es lo que hace un
    # ataque de verdad: si solo se contara por email, bastaria con inventarse un
    # correo nuevo en cada intento.
    ip = Column(String, nullable=False, index=True)

    # Cuando fue este intento. Los antiguos se limpian al pasar por el login.
    cuando = Column(DateTime, nullable=False, default=utcnow_naive, index=True)


class Trade(Base):
    __tablename__ = "trades"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id"), nullable=False, index=True)

    position = Column(String, nullable=True)  # ticket/ID de posición del broker, o generado

    symbol = Column(String, nullable=False)
    direction = Column(String, nullable=False)  # 'long' o 'short'
    quantity = Column(Float, nullable=False)

    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    entry_time = Column(DateTime, nullable=True)
    exit_time = Column(DateTime, nullable=True)

    sl = Column(Float, nullable=True)
    tp = Column(Float, nullable=True)

    commission = Column(Float, default=0.0)
    swap = Column(Float, default=0.0)
    pnl_bruto = Column(Float, nullable=False)
    pnl_neto = Column(Float, nullable=True)  # editable a mano; si es null, se calcula bruto+comisión+swap

    created_at = Column(DateTime, default=utcnow_naive)