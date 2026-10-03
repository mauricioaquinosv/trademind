from uuid import UUID
from typing import Optional
from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    initial_balance: float = 0.0
    currency: str = "USD"
    source: str = "manual"  # 'manual' o 'csv'


class AccountOut(BaseModel):
    id: UUID
    name: str
    initial_balance: float
    currency: str
    source: str

    class Config:
        from_attributes = True