import os
import shutil
import tempfile
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Trade, Account
from app.schemas import TradeCreate, TradeUpdate, TradeOut
from app.import_validacion import valida_trades_de_archivo
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
        raise errors.error(errors.ACCOUNT_NOT_FOUND, "Cuenta no encontrada", status_code=404)
    return account


def _pick_parser(file_path: str):
    """
    Detecta si el archivo subido es un reporte de MT5 (sección 'Positions')
    o la plantilla propia de TradeMind (encabezado 'Fecha apertura'), y
    devuelve el parser correcto para cada caso. Funciona sin importar si
    el archivo es .xlsx real, una tabla HTML disfrazada, o CSV.
    """
    raw = read_any_table(file_path)

    # Un archivo que se lee pero viene sin filas o sin columnas no tiene ni una
    # celda de la que sacar la primera palabra. Sin este chequeo, .iloc[0, 0]
    # lanza IndexError y el usuario ve un 500 (la app se cayó) en vez de un 400
    # (el archivo no sirve).
    if raw.empty or raw.shape[0] == 0 or raw.shape[1] == 0:
        raise errors.FileError(
            errors.FILE_EMPTY, "El archivo está vacío: no se encontró ninguna tabla dentro."
        )

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

    # El nombre del archivo se pasa a minusculas antes de mirar la extension:
    # en Windows el usuario sube REPORTE.XLSX o Datos.CSV tan a menudo como
    # reporte.xlsx, y endswith() distingue mayusculas de minusculas. Con el
    # .lower() un archivo valido en cualquiera de los dos casos entra, y el
    # temporal se crea con la extension en minusculas para que el lector de
    # archivos la reconozca.
    nombre = (file.filename or "").strip()
    if not nombre.lower().endswith((".xlsx", ".xls", ".csv")):
        raise errors.error(
            errors.FILE_BAD_EXTENSION,
            "El archivo debe ser .xlsx, .xls o .csv: "
            "un reporte de MT5 o la plantilla de TradeMind",
            status_code=400,
        )

    suffix = "." + nombre.rsplit(".", 1)[-1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # `_pick_parser` también lee el archivo, así que va DENTRO del try: si
        # se queda fuera, un .xlsx vacío revienta con un 500 en vez de un 400.
        # pandas.EmptyDataError y ParserError heredan de ValueError, así que el
        # except de abajo ya los cubre.
        parser = _pick_parser(tmp_path)

        # Si el parser sabe decir de que fila salio cada operacion, se usa eso
        # para poder decirle al usuario "la fila 23". Si no lo sabe (la
        # plantilla manual), se importan igual y el aviso lo dirá.
        if hasattr(parser, "parse_con_filas"):
            closed_trades, filas = parser.parse_con_filas(tmp_path)
        else:
            closed_trades = parser.parse(tmp_path)
            filas = [None] * len(closed_trades)
    except errors.FileError as e:
        raise errors.error(e.codigo, e.texto, status_code=400)
    except ValueError as e:
        # Un error de lectura sin código propio (los de pandas, por ejemplo).
        # Se devuelve el texto tal cual para no perder el detalle técnico.
        raise errors.error(errors.FILE_UNREADABLE, str(e), status_code=400)
    finally:
        # El temporal se crea con delete=False porque el parser lo lee por ruta,
        # así que hay que borrarlo a mano. Sin esto se acumulaba uno por cada
        # subida, para siempre: se llegaron a contar 45 huérfanos en TEMP.
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    saved = 0
    # Las operaciones se validan una a una. Las validas se importan; las que no,
    # no, pero se le explican al usuario una a una con su fila y el motivo.
    #
    # Decision de producto: el archivo se acepta SIEMPRE. Bloquear la subida
    # entera porque cuatro operaciones de quinientas vienen raras deja al
    # usuario sin herramienta hasta que las arregla, y en un reporte de MT5 las
    # celdas vacias son lo normal (en el de ejemplo, 67 de 130).
    validas, rechazos = valida_trades_de_archivo(closed_trades, filas)

    for t in validas:
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

    # La respuesta lleva cuantos se han guardado y cuales no, con el detalle de
    # cada rechazo. El frontend enseña el numero grande y deja el detalle para
    # que el usuario lo abra si quiere.
    #
    # Cuando no hay rechazos se devuelve solo el numero, como hasta ahora, para
    # no cambiar la forma de la respuesta en el caso normal.
    if not rechazos:
        return {"trades_guardados": saved}

    return {
        "trades_guardados": saved,
        "trades_leidos": len(closed_trades),
        "rechazos": [r.model_dump() for r in rechazos],
    }


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
        raise errors.error(errors.TRADE_NOT_FOUND, "Trade no encontrado", status_code=404)

    # exclude_unset=True aplica solo los campos que el cliente ha enviado. Pero
    # un null explicito ("symbol": null) tambien cuenta como enviado, y se
    # intentaba guardar NULL en una columna NOT NULL: Postgres lo rechazaba y
    # el usuario veia un 500 en vez de "el simbolo no puede estar vacio".
    #
    # Asi que los null de campos obligatorios se ignoran. Para ponerlos a null de
    # verdad estan sl y tp, que si son nulables, y esos si se aplican.
    _NO_NULOS = {
        "symbol",
        "direction",
        "quantity",
        "entry_price",
        "exit_price",
        "pnl_bruto",
    }

    cambios = trade_in.model_dump(exclude_unset=True)
    for field, value in cambios.items():
        if value is None and field in _NO_NULOS:
            continue
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
        raise errors.error(errors.TRADE_NOT_FOUND, "Trade no encontrado", status_code=404)

    db.delete(trade)
    db.commit()