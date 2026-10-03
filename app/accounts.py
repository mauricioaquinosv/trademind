from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Account, Trade
from app.schemas_accounts import AccountCreate, AccountUpdate, AccountOut

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("/", response_model=AccountOut, status_code=201)
def create_account(
    account_in: AccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = Account(
        user_id=current_user.id,
        name=account_in.name,
        initial_balance=account_in.initial_balance,
        currency=account_in.currency,
        source=account_in.source,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/", response_model=list[AccountOut])
def list_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Account).filter(Account.user_id == current_user.id).all()


@router.get("/{account_id}", response_model=AccountOut)
def get_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    return account


@router.put("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: str,
    changes: AccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Edita una cuenta. Solo se modifican los campos enviados: omitir uno lo deja
    como estaba, que es lo que se espera al corregir un dato suelto.

    El filtro incluye user_id, así que otra cuenta ajena da 404 y no 403: no se
    confirma ni la existencia de recursos que no son del usuario.
    """
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    # exclude_unset: distingue "no enviado" de "enviado con null".
    for campo, valor in changes.model_dump(exclude_unset=True).items():
        if valor is not None:
            setattr(account, campo, valor)

    db.commit()
    db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=204)
def delete_account(
    account_id: str,
    delete_trades: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Borra una cuenta.

    Si la cuenta tiene operaciones, NO se borra nada y se devuelve 409 con
    cuantas hay. Hay que repetir la llamada con ?delete_trades=true para
    confirmar que tambien se pierden.

    Se pide confirmacion porque las operaciones no pueden quedarse huerfanas:
    la clave foranea trades.account_id lo impide, y dejarlas sin cuenta las
    haria invisibles en el dashboard. O sea que no hay forma de 'conservar los
    trades sin la cuenta': o se van los dos, o no se va nada. Ante la duda,
    que no se pierda nada por sorpresa.
    """
    account = (
        db.query(Account)
        .filter(Account.id == account_id, Account.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")

    num_trades = db.query(Trade).filter(Trade.account_id == account.id).count()

    if num_trades and not delete_trades:
        raise HTTPException(
            status_code=409,
            detail=(
                f"La cuenta tiene {num_trades} operacion(es). "
                "Repite la peticion con ?delete_trades=true para borrarlas tambien."
            ),
        )

    if num_trades:
        db.query(Trade).filter(Trade.account_id == account.id).delete(
            synchronize_session=False
        )

    db.delete(account)
    db.commit()
    return None