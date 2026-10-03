from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TradeCreate(BaseModel):
    account_id: UUID
    position: Optional[str] = None
    symbol: str
    direction: str  # 'long' o 'short'
    quantity: float
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


class TradeUpdate(BaseModel):
    position: Optional[str] = None
    symbol: Optional[str] = None
    direction: Optional[str] = None
    quantity: Optional[float] = None
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

    class Config:
        from_attributes = True