"""
VALIDACION DE LAS OPERACIONES QUE LLEGAN DE UN ARCHIVO.

POR QUE ESTO EXISTE

El endpoint de subida construye las operaciones con el modelo de la base de
datos directamente, saltandose el TradeCreate que si valida. Eso significa que
una operacion incoherente de un reporte de broker entra en la base sin rechistar
y luego rompe las estadisticas, y el usuario ve numeros raros sin saber por que.

Ademas, antes de este modulo, un solo numero ilegible en la fila 300 tumbo el
archivo entero: float() sobre una celda vacia lanza ValueError, la excepcion
sube hasta el endpoint y no se importaba ninguna de las 502 operaciones.

La decision de producto es: el archivo se acepta SIEMPRE, se importan las
operaciones validas, y las invalidas se le explican al usuario una a una.

QUE NECESITA SABER EL USUARIO DE CADA RECHAZO

  1. Que fila del archivo era, para encontrarla en su Excel
  2. Que dato era
  3. Por que no vale
  4. Que puede hacer al respecto

Sin el numero de fila el aviso no sirve de nada: el usuario no puede corregir lo
que no encuentra.

POR QUE AQUI NO HAY NI UNA PALABRA EN ESPANOL

El usuario puede estar usando la interfaz en ingles. Si el backend mandara el
motivo ya redactado en espanol, existiria en dos sitios a la vez y no habria
forma de comprobar que los dos idiomas estan. Asi que aqui solo viajan CODIGOS
("quantity_not_positive") y los datos que necesita el mensaje, y la traduccion
la hace el cliente, que es donde vive el diccionario ES/EN.

Los codigos son el contrato entre backend y frontend. Si se cambia uno hay que
cambiarlo tambien en web/lib/i18n/, y hay un test que lo comprueba.
"""

from typing import List, Optional, Tuple

from pydantic import BaseModel

from app.fifo_engine import ClosedTrade

# Los codigos de rechazo que el frontend tiene que saber traducir.
# Si se anade uno aqui, hay que anadir su clave en web/lib/i18n/es.ts y en
# en.ts. El test `test_codigos_de_rechazo_traducidos` falla si no.
CODIGOS_RECHAZO = {
    "symbol_empty",
    "symbol_too_long",
    "direction_invalid",
    "quantity_unreadable",
    "quantity_not_positive",
    "entry_price_unreadable",
    "entry_price_not_positive",
    "exit_price_unreadable",
    "exit_price_not_positive",
}

# Que clave del campo recibio el problema, para que el frontend ponga la etiqueta
# correcta ("Volumen", "Precio de apertura"...) sin adivinar por el codigo.
CAMPOS_RECHAZO = {"symbol", "direction", "quantity", "entry_price", "exit_price"}


class Rechazo(BaseModel):
    """Una operacion que no se ha importado, con la explicacion de por que.

    No lleva ni el motivo ni la solucion en texto: lleva el codigo del motivo
    (para que el cliente lo traduzca) y el dato que lo provoca.
    """

    # Numero de fila en el archivo del usuario, empezando por 1 como las ve en
    # Excel. None si el parser no sabe contarlas.
    fila: Optional[int]

    # Como se lee esa operacion, para que el usuario la identifique.
    simbolo: Optional[str] = None
    # ISO 8601. El formato lo pone el cliente, que sabe en que idioma esta.
    fecha: Optional[str] = None

    # Que campo falla: "quantity", "symbol"...
    campo: str

    # Que tenia el archivo. None si la celda venia vacia, que el cliente
    # escribe como "(vacio)" en el idioma activo.
    valor: Optional[str] = None

    # Por que no vale, como codigo. De CODIGOS_RECHAZO.
    codigo: str


# --- Las operaciones que ya estaban en la cuenta ---------------------------
#
# Un rechazo por "ya la tienes" es lo mismo que un rechazo por dato malo, pero
# con otra lectura: aqui el dato ESTA bien, lo que pasa es que ya existe. Por eso
# van aparte, para no mezclarlos al traducir.

CODIGOS_YA_EXISTE = {"already_imported"}


class YaImportada(BaseModel):
    """Una operacion valida que el usuario ya tenia en esa cuenta.

    Mismo esquema que `Rechazo` para que el cliente los pinte con el mismo
    componente, pero con su propio codigo y su propio texto: uno es un dato que
    hay que corregir y el otro es algo que ya tienes.
    """

    fila: Optional[int]
    simbolo: Optional[str] = None
    fecha: Optional[str] = None
    campo: str = "position"
    valor: Optional[str] = None
    codigo: str = "already_imported"


def huella(t: ClosedTrade) -> tuple:
    """La identidad de una operacion cuando no hay ticket del broker.

    La plantilla manual deja el ticket vacio, asi que hace falta otra cosa que
    diga "esto es la misma operacion". Se comparan los datos que la definen: si
    coinciden todos, es la misma.

    El redondeo a 8 decimales es el mismo que usa `ClosedTrade.pnl_neto`, y no es
    casual: los brokers mandan los precios con ruido de coma flotante, y sin
    redondear dos veces el mismo precio darian numeros distintos y la comparacion
    fallaria siempre.
    """
    return (
        (t.symbol or "").strip().upper(),
        t.direction,
        _redondear(t.quantity),
        _redondear(t.entry_price),
        _redondear(t.exit_price),
        _iso(t.entry_time),
        _iso(t.exit_time),
    )


def _redondear(valor) -> Optional[float]:
    if valor is None or valor != valor:
        return None
    try:
        return round(float(valor), 8)
    except (TypeError, ValueError):
        return None


def _iso(fecha) -> Optional[str]:
    if fecha is None or not hasattr(fecha, "isoformat"):
        return None
    try:
        return fecha.isoformat()  # type: ignore[union-attr]
    except (TypeError, ValueError):
        return None


def separa_repetidas(
    trades: List[ClosedTrade],
    ya_existentes: List[ClosedTrade],
    filas: Optional[List[Optional[int]]] = None,
) -> Tuple[List[ClosedTrade], List[YaImportada]]:
    """Separa las operaciones nuevas de las que el usuario ya tenia.

    `ya_existentes` son las que ya hay en ESA cuenta, no las de otras: una cuenta
    distinta con el mismo ticket es una cuenta distinta.

    La comparacion es por ticket cuando lo hay, y por huella cuando no. Se mira
    primero el ticket y solo si falta se pasa a la huella, porque dos operaciones
    pueden coincidir en todos los datos y tener tickets distintos: eso son dos
    operaciones de verdad (por ejemplo, la misma apertura cerrada en dos
    tramos), y unirlas seria peor que duplicarlas.
    """
    nuevos: List[ClosedTrade] = []
    repetidas: List[YaImportada] = []

    tickets = {(t.position or "").strip() for t in ya_existentes if (t.position or "").strip()}
    huellas = {huella(t) for t in ya_existentes}

    # Los tickets ya vistos, para no avisar dos veces del mismo: se compara con
    # lo que hay en la cuenta MAS lo que se ha visto en este mismo archivo.
    # Subir un archivo con dos operaciones identicas tiene que avisar una vez y
    # importar la otra, no avisar dos veces y no importar ninguna.
    vistos = set(tickets)
    repetidas_ya_vistas: set = set()

    for i, t in enumerate(trades):
        fila = filas[i] if filas and i < len(filas) else None
        ticket = (t.position or "").strip()

        if ticket:
            es_repetida = ticket in vistos
        else:
            h = huella(t)
            es_repetida = h in huellas or h in repetidas_ya_vistas

        if es_repetida:
            repetidas.append(
                YaImportada(
                    fila=fila,
                    simbolo=(t.symbol or "").strip() or None,
                    fecha=_fecha_iso(t.entry_time),
                    valor=ticket or None,
                )
            )
            continue

        # Una operacion sin ticket no tiene donde apuntar el "ya visto": se
        # anade su huella al conjunto para que la siguiente repetida se detecte.
        if not ticket:
            repetidas_ya_vistas.add(huella(t))
        else:
            vistos.add(ticket)

        nuevos.append(t)

    return nuevos, repetidas


def _texto(valor: object) -> Optional[str]:
    """Un valor para mostrar. None si no hay nada."""
    if valor is None:
        return None
    try:
        # NaN es "verdadero" en Python, asi que un NaN suplantaria a un None.
        if valor != valor:
            return None
    except TypeError:
        pass
    s = str(valor).strip()
    return s or None


def _fecha_iso(t: Optional[object]) -> Optional[str]:
    """La fecha en ISO, que es lo unico que se puede traducir despues."""
    if t is None:
        return None
    if hasattr(t, "isoformat"):
        try:
            return t.isoformat()  # type: ignore[union-attr]
        except (TypeError, ValueError):
            return None
    return _texto(t)


def _valida_una(t: ClosedTrade) -> Optional[Tuple[str, str, Optional[str]]]:
    """Valida una operacion.

    Devuelve None si es valida, o el (campo, codigo, valor) que falla. Solo uno:
    se informa del primer problema encontrado, que es el que hay que arreglar
    primero. Avisar de tres cosas a la vez sobre la misma fila solo confunde.
    """
    simbolo = (t.symbol or "").strip()

    if not simbolo:
        return ("symbol", "symbol_empty", None)

    if len(simbolo) > 40:
        return ("symbol", "symbol_too_long", simbolo[:40])

    if t.direction not in ("long", "short"):
        return ("direction", "direction_invalid", _texto(t.direction))

    if t.quantity is None or t.quantity != t.quantity:
        return ("quantity", "quantity_unreadable", None)

    if t.quantity <= 0:
        return ("quantity", "quantity_not_positive", _texto(t.quantity))

    for campo, codigo_vacio, codigo_negativo in (
        ("entry_price", "entry_price_unreadable", "entry_price_not_positive"),
        ("exit_price", "exit_price_unreadable", "exit_price_not_positive"),
    ):
        valor = getattr(t, campo)

        if valor is None or valor != valor:
            return (campo, codigo_vacio, None)

        if valor <= 0:
            return (campo, codigo_negativo, _texto(valor))

    return None


def valida_trades_de_archivo(
    trades: List[ClosedTrade],
    filas: Optional[List[Optional[int]]] = None,
) -> Tuple[List[ClosedTrade], List[Rechazo]]:
    """Separa las operaciones validas de las que no. Devuelve (validas, rechazos).

    `filas` es opcional: el numero de fila en el archivo del usuario para cada
    operacion, en el mismo orden. Los parsers que saben contarlas lo pasan; los
    que no, lo dejan vacio y el aviso lo dirá.
    """
    validas: List[ClosedTrade] = []
    rechazos: List[Rechazo] = []

    for i, t in enumerate(trades):
        problema = _valida_una(t)

        if problema is None:
            validas.append(t)
            continue

        campo, codigo, valor = problema
        rechazos.append(
            Rechazo(
                fila=filas[i] if filas and i < len(filas) else None,
                simbolo=(t.symbol or "").strip() or None,
                fecha=_fecha_iso(t.entry_time),
                campo=campo,
                valor=valor,
                codigo=codigo,
            )
        )

    return validas, rechazos