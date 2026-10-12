import os
import shutil
import tempfile
from uuid import UUID

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app import errors
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Trade, Account
from app.schemas import TradeCreate, TradeUpdate, TradeOut
from app.import_validacion import (
    separa_repetidas,
    valida_trades_de_archivo,
)
from app.parsers.mt5_parser import MT5Parser
from app.parsers.mt4_parser import MT4Parser
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
    Detecta si el archivo subido es un reporte de MT5 (sección 'Positions'),
    un reporte de MT4 (cabecera 'Ticket' + 'Open Time'), o la plantilla propia
    de TradeMind (encabezado 'Fecha apertura'), y devuelve el parser correcto
    para cada caso. Funciona sin importar si el archivo es .xlsx real, una
    tabla HTML disfrazada, o CSV.
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

    # MT4 se comprueba ANTES que MT5, y por la cabecera de su tabla ('Ticket'
    # | 'Open Time'), no por la primera celda del fichero: los dos reportes
    # empiezan igual, con la cabecera de la cuenta. Si MT4 pasara por
    # MT5Parser, este no encontraría 'Positions' y devolvería un rechazo
    # engañoso ("no hay operaciones") en vez de importar.
    if MT4Parser.parece_mt4(raw):
        return MT4Parser()

    return MT5Parser()


# 25 MB. Va GENEROSO a proposito: un reporte de MT5 con años de historial sigue
# siendo un Excel de un par de megas, y un limite demasiado bajo dejaria fuera a
# los usuarios que llevan mucho tiempo registrando.
TAMANO_MAXIMO = 25 * 1024 * 1024


def _copiar_con_tope(origen, destino, tope: int) -> None:
    """Copia contando, y para en cuanto se pasa del tope.

    No se comprueba al final porque entonces ya esta todo escrito: el punto de
    este limite es no llenar el disco, y eso hay que hacerlo mientras se copia.

    Los bloques son de 64 KB, que es lo que usa shutil por defecto, pero aqui se
    hace a mano para poder mirar el contador entre bloque y bloque. Con un
    bloque de 1 MB el desborde seria mayor; con uno pequeno se para antes.
    """
    escrito = 0
    while True:
        trozo = origen.read(64 * 1024)
        if not trozo:
            break
        escrito += len(trozo)
        if escrito > tope:
            raise errors.error(
                errors.FILE_TOO_LARGE,
                f"El archivo supera el máximo de {tope} bytes",
                status_code=413,
            )
        destino.write(trozo)


@router.post("/upload")
def upload_trades(
    request: Request,
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
    #
    # .htm y .html los añade MT4, que exporta el statement como HTML. No es
    # una comodidad: sin ellos el archivo se rechazaba en la puerta con un
    # 400 y el parser de MT4 ni llegaba a ejecutarse. El lector decide por el
    # CONTENIDO, no por la extension, asi que una tabla HTML con cara de .xls
    # (que es lo que MT4 hace al guardar como Excel) ya funcionaba antes.
    nombre = (file.filename or "").strip()
    if not nombre.lower().endswith((".xlsx", ".xls", ".csv", ".htm", ".html")):
        raise errors.error(
            errors.FILE_BAD_EXTENSION,
            "El archivo debe ser .xlsx, .xls, .csv, .htm o .html: "
            "un reporte de MT4 o MT5, o la plantilla de TradeMind",
            status_code=400,
        )

    # El tamaño se mira ANTES de copiar, y la copia se corta en cuanto se pasa.
    #
    # Las dos comprobaciones hacen falta por motivos distintos. La cabecera
    # `Content-Length` llega antes de recibir el cuerpo, y sirve para rechazar de
    # inmediato lo que se DECLARA enorme: es lo unico que evita que un archivo
    # grande llegue a llenarse en el temporal de Starlette, que ya lo tiene
    # escrito cuando este codigo se ejecuta.
    #
    # Pero `Content-Length` la pone el cliente y se la puede mentir, asi que no
    # basta. Por eso la copia se cuenta sobre lo que llega de verdad, y en
    # cuanto se pasa del tope se corta y se borra el temporal. Si no, alguien
    # podria declarar 1 KB y mandar 4 GB.
    #
    # 25 MB es generoso: un reporte de MT5 con años de historial sigue siendo un
    # Excel de un par de megas.
    declarado = request.headers.get("content-length")
    if declarado and declarado.isdigit() and int(declarado) > TAMANO_MAXIMO:
        raise errors.error(
            errors.FILE_TOO_LARGE,
            f"El archivo pesa {declarado} bytes y el máximo son {TAMANO_MAXIMO}",
            status_code=413,
        )

    suffix = "." + nombre.rsplit(".", 1)[-1].lower()

    # El temporal nace DENTRO del try, y no antes. Si la copia se pasa del tope
    # a la mitad, `_copiar_con_tope` lanza y hay que borrar lo ya escrito: si el
    # temporal se crease fuera, el finally de abajo no lo alcanzaria y se
    # acumularia uno por cada intento de subir un archivo enorme. Es exactamente
    # el fallo que el comentario del finally describe, solo que por otra via.
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
            _copiar_con_tope(file.file, tmp, TAMANO_MAXIMO)

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
        #
        # El `if tmp_path` cubre el caso de que la propia creación del temporal
        # falle: entonces no hay nada que borrar, y `os.remove(None)` reventaría
        # con un TypeError tapando el error de verdad.
        if tmp_path:
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

    # De las validas, las que el usuario YA tiene en esta cuenta se separan antes
    # de guardar. Sin esto, subir el mismo reporte dos veces duplicaba todo: las
    # estadisticas quedaban al doble y seguian cuadrando entre si, asi que no
    # habia forma de saber que estaban mal.
    #
    # Se comparan solo las de ESTA cuenta: otra cuenta con el mismo ticket es
    # otra cuenta.
    ya_importadas = []
    if validas:
        ya_en_la_cuenta = (
            db.query(Trade).filter(Trade.account_id == account_id).all()
        )
        # `filas` viene en el orden del ARCHIVO entero, y ya se ha filtrado la
        # lista: hay que recortar los indices de las que pasaron la validacion
        # o el numero de fila no corresponderia con nada.
        indices_validas = [
            i for i, t in enumerate(closed_trades)
            if any(t is v for v in validas)
        ]
        filas_validas = (
            [filas[i] for i in indices_validas if i < len(filas)]
            if filas
            else [None] * len(validas)
        )
        validas, ya_importadas = separa_repetidas(
            validas, ya_en_la_cuenta, filas_validas
        )

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
            taxes=t.taxes,
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
    if not rechazos and not ya_importadas:
        return {"trades_guardados": saved}

    return {
        "trades_guardados": saved,
        "trades_leidos": len(closed_trades),
        "rechazos": [r.model_dump() for r in rechazos],
        "ya_importadas": [r.model_dump() for r in ya_importadas],
        # El frontend solo ofrece "borrar todo y volver a importar" cuando el
        # archivo era IDENTICO al que ya tenia: en ese caso y solo en ese,
        # reimportar da exactamente lo mismo y no se puede perder nada.
        #
        # La condicion es `saved == 0`, no "hay repetidas": si el archivo traia
        # una sola operacion nueva, hay repetidas Y se ha guardado algo, y en
        # ese caso NO se puede ofrecer borrar porque el usuario tiene datos
        # nuevos que perder. Solo cuando no se ha guardado NADA se puede
        # prometer que reimportar no pierde nada.
        "archivo_identico": saved == 0 and bool(ya_importadas) and not rechazos,
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


@router.delete("/", status_code=204)
def borrar_todas_las_operaciones(
    account_id: UUID = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borra TODAS las operaciones de una cuenta.

    Va declarado ANTES que `/{trade_id}` a proposito: si no, FastAPI intentaria
    interpretar el camino como un UUID y devolveria un 422 en vez de borrar.

    Lo usa "borrar todo y volver a importar", que solo aparece cuando el backend
    ha confirmado que el archivo era identico al que ya habia.
    """
    _get_owned_account(db, account_id, current_user)

    db.query(Trade).filter(
        Trade.account_id == account_id,
        Trade.user_id == current_user.id,
    ).delete(synchronize_session=False)
    db.commit()


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