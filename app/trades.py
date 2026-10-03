import shutil
import tempfile
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Trade, Account
from app.schemas import TradeCreate, TradeUpdate, TradeOut
from app.parsers.mt5_parser import MT5Parser
from app.parsers.manual_template_parser import ManualTemplateParser
from app.parsers.file_reader import read_any_table

router = APIRouter(prefix="/trades", tags=["trades"])


def _get_owned_account(db: Session, account_id: UUID, user: User) -> Account:
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return account


def _pick_parser(file_path: str):
    """
    Detecta si el archivo subido es un reporte de MT5 (sección 'Positions')
    o la plantilla propia de TradeMind (encabezado 'Fecha apertura'), y
    devuelve el parser correcto para cada caso. Funciona sin importar si
    el archivo es .xlsx real, una tabla HTML disfrazada, o CSV.
    """
    raw = read_any_table(file_path)
    first_cell = str(raw.iloc[0, 0]).strip()

    if first_cell.startswith("Fecha apertura"):
        return ManualTemplateParser()
    return MT5Parser()


@router.post("/upload")
def upload_trades(
    account_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_account(db, account_id, current_user)

    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="El archivo debe ser .xlsx, .xls o .csv: un reporte de MT5 o la plantilla de TradeMind",
        )

    suffix = "." + file.filename.rsplit(".", 1)[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    parser = _pick_parser(tmp_path)

    try:
        closed_trades = parser.parse(tmp_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    saved = 0
    for t in closed_trades:
        trade = Trade(
            user_id=current_user.id,
            account_id=account_id,
            position=t.position,
            symbol=t.symbol,
            direction=t.direction,
            quantity=t.quantity,
            entry_price=t.entry_price,
            exit_price=t.exit_price,
            entry_time=t.entry_time,
            exit_time=t.exit_time,
            sl=t.sl,
            tp=t.tp,
            commission=t.commission,
            swap=t.swap,
            pnl_bruto=t.pnl_bruto,
            pnl_neto=t.pnl_neto,
        )
        db.add(trade)
        saved += 1

    db.commit()

    return {"trades_guardados": saved}


@router.get("/", response_model=list[TradeOut])
def list_trades(
    account_id: UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_account(db, account_id, current_user)
    return (
        db.query(Trade)
        .filter(Trade.account_id == account_id, Trade.user_id == current_user.id)
        .all()
    )


@router.post("/", response_model=TradeOut, status_code=201)
def create_trade(
    trade_in: TradeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_account(db, trade_in.account_id, current_user)

    trade = Trade(user_id=current_user.id, **trade_in.model_dump())
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


@router.put("/{trade_id}", response_model=TradeOut)
def update_trade(
    trade_id: UUID,
    trade_in: TradeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = (
        db.query(Trade)
        .filter(Trade.id == trade_id, Trade.user_id == current_user.id)
        .first()
    )
    if not trade:
        raise HTTPException(status_code=404, detail="Trade no encontrado")

    for field, value in trade_in.model_dump(exclude_unset=True).items():
        setattr(trade, field, value)

    db.commit()
    db.refresh(trade)
    return trade


@router.delete("/{trade_id}", status_code=204)
def delete_trade(
    trade_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = (
        db.query(Trade)
        .filter(Trade.id == trade_id, Trade.user_id == current_user.id)
        .first()
    )
    if not trade:
        raise HTTPException(status_code=404, detail="Trade no encontrado")

    db.delete(trade)
    db.commit()