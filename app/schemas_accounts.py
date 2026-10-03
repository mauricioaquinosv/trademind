from uuid import UUID
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AccountCreate(BaseModel):
    # Antes esta clase no validaba nada: aceptaba nombres en blanco y balances
    # negativos. El frontend lo comprobaba, pero la API es la frontera real y
    # cualquier cliente puede llamarla directamente.
    name: str = Field(min_length=1, max_length=60)
    initial_balance: float = Field(default=0.0, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    source: Literal["manual", "csv"] = "manual"

    @field_validator("name")
    @classmethod
    def _nombre_no_vacio(cls, v: str) -> str:
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre de la cuenta no puede estar vacío")
        return limpio

    @field_validator("currency")
    @classmethod
    def _moneda_en_mayusculas(cls, v: str) -> str:
        return v.strip().upper()


class AccountUpdate(BaseModel):
    """Edición parcial: solo se cambian los campos que se envyen.

    Se separate de AccountCreate a proposito: al crear, todos los campos tienen
    valor por defecto; al editar, ausencia de un campo significa "no lo toques".
    Por eso todos son opcionales y none, y initial_balance tiene alias para
    poder distinguir "no enviado" de "enviado como 0".
    """

    model_config = ConfigDict(populate_by_name=True)

    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    initial_balance: Optional[float] = Field(default=None, ge=0, alias="initialBalance")
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)

    @field_validator("name")
    @classmethod
    def _nombre_no_vacio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        limpio = v.strip()
        if not limpio:
            raise ValueError("El nombre de la cuenta no puede estar vacío")
        return limpio

    @field_validator("currency")
    @classmethod
    def _moneda_en_mayusculas(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v is not None else v

    @field_validator("initial_balance")
    @classmethod
    def _balance_no_negativo(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("El balance inicial no puede ser negativo")
        return v


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    initial_balance: float
    currency: str
    source: str
    # Cuantas operaciones tiene la cuenta. Lo calcula el backend porque es el
    # unico que sabe la verdad: el frontend solo tiene cargadas las operaciones
    # de la cuenta activa, asi que al borrar otra cuenta contaria cero y dejaria
    # borrar sin avisar.
    trade_count: int = 0