from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    # `model_config` sustituye al antiguo `class Config`, que Pydantic v2
    # marca como obsoleto. Es el mismo mecanismo con el nombre actual.
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TradeCreate(BaseModel):
    account_id: UUID
    position: Optional[str] = None
    # min_length=1 y el recorte: un simbolo vacio entraba en la base de datos y
    # rompia las estadisticas por simbolo en Analytics. Ahora Pydantic lo
    # rechaza antes de llegar a la base, con un 422 y un mensaje utilizable.
    symbol: str = Field(min_length=1, max_length=40)
    # La validacion de direction va en el field_validator de abajo, NO con
    # Field(pattern=...): el patron se comprueba ANTES que el validador, asi que
    # rechazaria "BUY" o "compra" antes de que este pueda normalizarlos.
    direction: str
    # gt=0: una cantidad de 0 o negativa no es una operacion posible, y
    # distorsionaba los promedios por lote.
    quantity: float = Field(gt=0)
    entry_price: float
    exit_price: float
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    commission: float = 0.0
    swap: float = 0.0
    pnl_bruto: float
    pnl_neto: Optional[float] = None

    @field_validator("symbol")
    @classmethod
    def _symbolo_no_vacio(cls, v: str) -> str:
        # El usuario escribe " EURUSD " con espacios por costumbre, y eso se
        # guarda bien. Pero "   " (solo espacios) no es un simbolo.
        limpio = v.strip()
        if not limpio:
            raise ValueError("El símbolo no puede estar vacío")
        return limpio

    @field_validator("direction")
    @classmethod
    def _direccion_valida(cls, v: str) -> str:
        limpio = v.strip().lower()
        # "long" y "short" son los valores canonicos y tienen que pasar tal cual.
        # SeAccepted ademas buy/sell y compra/venta, que es como lo escribe la
        # gente de verdad.
        if limpio in ("long", "buy", "compra", "largo"):
            return "long"
        if limpio in ("short", "sell", "venta", "corto"):
            return "short"
        raise ValueError("La dirección debe ser 'long' o 'short'")


class TradeUpdate(BaseModel):
    """Actualizacion parcial de un trade.

    OJO con exclude_unset=True en el endpoint: solo se aplican los campos que el
    cliente ha enviado. Por eso un null explicito ("symbol": null) tambien llega
    al setattr y se intentaba guardar NULL en una columna NOT NULL, con un 500.
    Para que eso no pase, los validadores de abajo rechazan el null en los campos
    que no admiten nulo; y en el endpoint se filtran los null de las columnas
    obligatorias.
    """
    position: Optional[str] = None
    symbol: Optional[str] = Field(default=None, min_length=1, max_length=40)
    direction: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    sl: Optional[float] = None
    tp: Optional[float] = None
    commission: Optional[float] = None
    swap: Optional[float] = None
    pnl_bruto: Optional[float] = None
    pnl_neto: Optional[float] = None

    @field_validator("symbol")
    @classmethod
    def _symbolo_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            # En una actualizacion parcial, omitir el campo es correcto. Enviar
            # null tambien se acepta y se ignora: el endpoint no lo aplica.
            return None
        limpio = v.strip()
        if not limpio:
            raise ValueError("El símbolo no puede estar vacío")
        return limpio

    @field_validator("direction")
    @classmethod
    def _direccion_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        limpio = v.strip().lower()
        # "long" y "short" son los valores canonicos y tienen que pasar tal cual.
        # SeAccepted ademas buy/sell y compra/venta, que es como lo escribe la
        # gente de verdad.
        if limpio in ("long", "buy", "compra", "largo"):
            return "long"
        if limpio in ("short", "sell", "venta", "corto"):
            return "short"
        raise ValueError("La dirección debe ser 'long' o 'short'")


class TradeOut(BaseModel):
    id: UUID
    account_id: UUID
    position: Optional[str]
    symbol: str
    direction: str
    quantity: float
    entry_price: float
    exit_price: float
    entry_time: Optional[datetime]
    exit_time: Optional[datetime]
    sl: Optional[float]
    tp: Optional[float]
    commission: float
    swap: float
    pnl_bruto: float
    pnl_neto: Optional[float]

    model_config = ConfigDict(from_attributes=True)