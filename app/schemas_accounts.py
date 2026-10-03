from uuid import UUID
from typing import Literal

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


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    initial_balance: float
    currency: str
    source: str