"""
Tests del parser de MT4.

Antes de este fichero no existia soporte para MT4: solo MT5 y la plantilla
manual. Cualquier .htm exportado desde MT4 se intentaba leer como reporte de
MT5, no encontraba la seccion 'Positions' y devolvia un rechazo enganoso.

Los dos ficheros de ejemplo son reportes REALES exportados desde el terminal,
con el programa puesto en espanol por un lado y en ingles por otro: MT4 escribe
los nombres de seccion en ingles en los dos casos, por eso aqui no se comprueba
deteccion de idioma -- no hace falta, y comprobarlo seria testear algo que no
depende de nosotros.

Las cifras no se inventan: son las que el propio MT4 escribe en su fila de
totales y en su "Closed P/L". Si un refactor cambia el mapeo de columnas, los
test de suma fallan, que es exactamente lo que tienen que hacer.
"""

import pytest

from app.fifo_engine import ClosedTrade
from app.parsers.mt4_parser import MT4Parser
from app.parsers.file_reader import read_any_table

CORTO = "sample_data/Statement_MT4.htm"
LARGO = "sample_data/Statement_MT4_largo.htm"
MT5 = "sample_data/ReportHistory-35023263.xlsx"

# --- valores que el propio reporte declara --------------------------------
#
# MT4 cierra la seccion con una fila de totales (Commission | Taxes | Swap |
# Profit) y despues con "Closed P/L:", que es la suma de las cuatro. Se usan
# como oraculo: si el parser mapea mal una columna, estas sumas no cuadran.

CORTO_TRADES = 14
CORTO_COMISION = -87.32
CORTO_IMPUESTOS = 0.00
CORTO_SWAP = 0.00
CORTO_BRUTO = -54.14
CORTO_CLOSED_PL = -141.46

LARGO_TRADES = 27
LARGO_COMISION = -193.30
LARGO_IMPUESTOS = 0.00
LARGO_SWAP = 0.00
LARGO_BRUTO = -194.62
LARGO_CLOSED_PL = -387.92

PRIMERA = {
    "position": "114488147",
    "symbol": "EURUSD",
    "direction": "long",
    "quantity": 1.0,
    "entry_price": 1.11763,
    "exit_price": 1.11798,
    "commission": -5.0,
    "pnl_bruto": 35.0,
    "pnl_neto": 30.0,
    "sl": 1.11472,
    "tp": 1.12449,
}


@pytest.fixture
def corto():
    return MT4Parser().parse(CORTO)


@pytest.fixture
def largo():
    return MT4Parser().parse(LARGO)


# --- se detecta y se parsea ------------------------------------------------


def test_el_reporte_mt4_se_detecta():
    crudo = read_any_table(CORTO)
    assert MT4Parser.parece_mt4(crudo)


def test_el_reporte_mt5_no_se_confunde_con_mt4():
    """La inversion de este test es el que mas importa.

    Si `parece_mt4` devolviera True sobre un reporte de MT5, el parser de MT5
    no llegaria a ejecutarse y el usuario veria un rechazo sin entender por
    que, con un archivo que si es valido.
    """
    crudo = read_any_table(MT5)
    assert not MT4Parser.parece_mt4(crudo)


def test_el_parser_de_mt4_no_abre_un_reporte_de_mt5():
    """`parse` sobre un MT5 debe fallar por no encontrar la seccion, no
    devolver cero operaciones en silencio."""
    from app.errors import FileError

    with pytest.raises(FileError):
        MT4Parser().parse(MT5)


# --- cuenta lo que tiene que contar ---------------------------------------


def test_el_reporte_corto_trae_14_operaciones(corto):
    assert len(corto) == CORTO_TRADES


def test_el_reporte_largo_trae_27_operaciones(largo):
    assert len(largo) == LARGO_TRADES


def test_no_se_cuenta_la_fila_del_balance_inicial(corto, largo):
    """El reporte mete el balance inicial en la MISMA tabla que las
    operaciones: `114487682 | ... | balance | Initial account balance | 25 000.00`.

    Tiene ticket numerico, asi que un chequeo solo por "el primer campo es un
    numero" la dejaria pasar y saldria una operacion inventada con simbolo
    'Initial account balance'. Por eso se comprueba el campo 'Type'.
    """
    for lista in (corto, largo):
        assert all(t.symbol != "Initial account balance" for t in lista)
        assert all(t.position != "114487682" for t in lista)


def test_no_se_cuenta_la_fila_de_totales(corto, largo):
    """La fila de totales empieza con `&nbsp;` y tiene cuatro numeros al
    final. Si pasara, saldria un trade sin ticket y con los precios en las
    columnas equivocadas."""
    for lista in (corto, largo):
        # Todas las operaciones tienen ticket numerico.
        assert all(t.position and t.position.isdigit() for t in lista)
        # ...y ninguna tiene un precio imposible.
        assert all(t.entry_price and t.entry_price > 0 for t in lista)


def test_no_se_cuenta_la_fila_de_totales_como_operacion(corto):
    """Ademas de no contarla, el parser debe PARAR en 'Closed P/L:', que es
    lo que cierra la seccion. Si siguiera leyendo, se tragaria las secciones
    'Open Trades' y 'Working Orders' del mismo fichero."""
    tickets = {t.position for t in corto}
    assert "nan" not in tickets
    assert None not in tickets


# --- las cuatro columnas de caja van a su sitio ---------------------------
#
# Este es el test que protege el mapeo. Commission, Taxes, Swap y Profit son
# cuatro columnas contiguas al final de la tabla; desplazar una por un sitio
# no produce ningun error, solo numeros equivocados.


def test_las_sumas_cuadran_con_lo_que_reporta_mt4(corto):
    assert sum(t.commission for t in corto) == pytest.approx(CORTO_COMISION, abs=0.01)
    assert sum(t.taxes for t in corto) == pytest.approx(CORTO_IMPUESTOS, abs=0.01)
    assert sum(t.swap for t in corto) == pytest.approx(CORTO_SWAP, abs=0.01)
    assert sum(t.pnl_bruto for t in corto) == pytest.approx(CORTO_BRUTO, abs=0.01)


def test_el_neto_total_es_el_closed_pl_del_propio_reporte(corto):
    """La comprobacion mas fuerte que hay: MT4 escribe 'Closed P/L: -141.46'
    y la suma de los `pnl_neto` del parser tiene que dar exactamente eso.

    `pnl_neto` suma bruto + comision + swap + impuestos, que es la misma
    suma que hace MT4 con Commission + Taxes + Swap + Profit.
    """
    assert sum(t.pnl_neto for t in corto) == pytest.approx(CORTO_CLOSED_PL, abs=0.01)


def test_las_sumas_del_reporte_largo_tambien_cuadran(largo):
    assert sum(t.commission for t in largo) == pytest.approx(LARGO_COMISION, abs=0.01)
    assert sum(t.taxes for t in largo) == pytest.approx(LARGO_IMPUESTOS, abs=0.01)
    assert sum(t.swap for t in largo) == pytest.approx(LARGO_SWAP, abs=0.01)
    assert sum(t.pnl_bruto for t in largo) == pytest.approx(LARGO_BRUTO, abs=0.01)
    assert sum(t.pnl_neto for t in largo) == pytest.approx(LARGO_CLOSED_PL, abs=0.01)


def test_taxes_tiene_su_propio_campo_y_no_va_a_comision(corto):
    """`taxes` no puede meterse dentro de `commission`: si lo hiciera, la
    comision que se le ensena al usuario no seria la que cobro el broker.

    En estos reportes todo vale 0.00, pero el campo tiene que existir y ser
    distinto, o el dia que un broker retenga impuestos nadie lo notaria.
    """
    for t in corto:
        assert isinstance(t, ClosedTrade)
        assert t.taxes == 0.0
        assert t.commission != 0.0  # las comisiones si existen en estos datos


# --- las trampas del formato ----------------------------------------------


def test_los_simbolos_se_pasan_a_mayusculas(corto, largo):
    """MT4 escribe 'eurusd' en minusculas. Si se guarda asi, Analytics trata
    eurusd y EURUSD como dos simbolos distintos y parte las estadisticas.
    """
    for lista in (corto, largo):
        for t in lista:
            assert t.symbol == t.symbol.upper()


def test_el_reporte_largo_cubre_ocho_simbolos_distintos(largo):
    assert sorted({t.symbol for t in largo}) == [
        "BTCUSD",
        "EURUSD",
        "GBPUSD",
        "LTCUSD",
        "USDCHF",
        "USDJPY",
        "XAUEUR",
        "XAUUSD",
    ]


def test_sl_y_tp_a_cero_se_toman_como_no_tiene(largo):
    """La operacion 114489835 trae `0.00000` en S/L y T/P en vez de la celda
    vacia que traen las demas. Un stop loss en 0.0 no tiene sentido: es que
    no tiene.

    Sin este caso, el parser guardaria sl=0.0 y cualquier filtro o grafico
    pintaria un stop en el precio cero.
    """
    sin_stops = [t for t in largo if t.sl is None and t.tp is None]
    assert [t.position for t in sin_stops] == ["114489835"]


def test_las_demas_operaciones_si_tienen_sl_y_tp(largo):
    """Si el manejo del 0.00000 se aplicara a todo, desaparecerian los stops
    de las 26 operaciones que si los traen. Este test impide que pase."""
    con_stops = [t for t in largo if t.sl is not None and t.tp is not None]
    assert len(con_stops) == LARGO_TRADES - 1


def test_los_espacios_de_miles_no_rompen_la_conversion():
    """MT4 escribe `25 000.00`, con un ESPACIO como separador de miles.

    `float('25 000.00')` lanza ValueError, y si eso se dejara pasar, un P/L
    grande se convertiria en `None` sin avisar. El balance inicial del
    reporte trae exactamente ese formato.
    """
    assert MT4Parser._parse_float_or_none("25 000.00") == 25000.0
    assert MT4Parser._parse_float_or_none("-1 234.56") == -1234.56
    assert MT4Parser._parse_float_or_zero("25 000.00") == 25000.0


def test_una_celda_ilegible_no_tumba_el_archivo_entero():
    """Si una celda viene rara, el dato sale `None`/`0.0` y el resto de la
    operacion se importa. Tumbar el archivo entero dejaria al usuario sin
    poder importar nada por una sola celda mala."""
    assert MT4Parser._parse_float_or_none("") is None
    assert MT4Parser._parse_float_or_none(float("nan")) is None
    assert MT4Parser._parse_float_or_zero("") == 0.0
    assert MT4Parser._parse_float_or_none(0.0) == 0.0


def test_el_ticket_se_conserve_como_texto(corto):
    """El ticket viaja como texto, no como numero, para no perder los ceros
    a la izquierda ni chocar con los identificadores que son alfanumericos."""
    assert all(isinstance(t.position, str) for t in corto)
    assert corto[0].position == PRIMERA["position"]


def test_las_fechas_se_leen_como_fecha(corto):
    from datetime import datetime

    assert isinstance(corto[0].entry_time, datetime)
    assert isinstance(corto[0].exit_time, datetime)
    assert corto[0].entry_time < corto[0].exit_time


# --- la primera operacion, valor por valor -------------------------------


def test_la_primera_operacion_valor_por_valor(corto):
    t = corto[0]
    assert t.position == PRIMERA["position"]
    assert t.symbol == PRIMERA["symbol"]
    assert t.direction == PRIMERA["direction"]
    assert t.quantity == pytest.approx(PRIMERA["quantity"])
    assert t.entry_price == pytest.approx(PRIMERA["entry_price"])
    assert t.exit_price == pytest.approx(PRIMERA["exit_price"])
    assert t.commission == pytest.approx(PRIMERA["commission"])
    assert t.pnl_bruto == pytest.approx(PRIMERA["pnl_bruto"])
    assert t.pnl_neto == pytest.approx(PRIMERA["pnl_neto"])
    assert t.sl == pytest.approx(PRIMERA["sl"])
    assert t.tp == pytest.approx(PRIMERA["tp"])


def test_hay_compras_y_ventas(corto, largo):
    for lista in (corto, largo):
        assert {t.direction for t in lista} == {"long", "short"}


def test_las_comisiones_con_decimales_se_leen_bien(largo):
    """El reporte largo trae comisiones de 0.42 y 26.92, no solo de 5.00.
    Cubre el caso de volumen pequeno, donde la comision no es redonda."""
    comisiones = {t.commission for t in largo}
    assert -0.42 in comisiones
    assert -26.92 in comisiones


def test_los_volumenes_van_de_0_1_a_2(largo):
    assert sorted({t.quantity for t in largo}) == [0.1, 0.25, 0.5, 1.0, 2.0]


# --- la fila de balance no es una operacion ---------------------------------
#
# Es la fila mas trampa del reporte entero. Dentro de la tabla de operaciones
# trae ticket numerico y fecha VALIDA, con las mismas catorce celdas que una
# operacion de verdad, asi que las comprobaciones normales (celda vacia, ticket
# que no es numero) no la pillan. Lo unico que la delata es el tipo.


def test_un_deposito_no_se_convierte_en_operacion(tmp_path):
    """Se renombra la fila de balance a 'deposit' y se comprueba que no entra.

    Con la palabra original ya la saltaba el `if` de 'balance'. Cambiada,
    entraba como una venta: 15 operaciones en vez de 14, con el saldo inicial
    (25 000.00) como P&L y 'INITIAL ACCOUNT BALANCE' de simbolo. Eso no es un
    error de lectura puntual: son 25 000 de beneficio inventados que
    reventarian el win rate y el profit factor de la cuenta entera, y en
    pantalla no se veia nada raro.
    """
    with open(CORTO, encoding="utf-8", errors="replace") as fh:
        html = fh.read()
    assert html.count(">balance<") == 1, (
        "el reporte de ejemplo ya no trae la fila de balance como se esperaba"
    )

    copia = tmp_path / "con_deposito.htm"
    copia.write_text(html.replace(">balance<", ">deposit<", 1), encoding="utf-8")

    trades = MT4Parser().parse(str(copia))

    assert len(trades) == CORTO_TRADES
    assert all(t.quantity is not None for t in trades)
    assert all((t.pnl_bruto or 0) < 1000 for t in trades)
    assert all(t.direction in ("long", "short") for t in trades)


@pytest.mark.parametrize(
    "tipo", ["balance", "deposit", "withdrawal", "credit", "transfer"]
)
def test_las_filas_de_dinero_no_son_operaciones(tipo):
    """Ticket numerico y fecha valida, como una operacion de verdad, pero el
    tipo no es 'buy' ni 'sell'."""
    fila = (
        [114487682, "2026.10.12 15:27:10", tipo]
        + ["Initial account balance"] * 10
        + ["25 000.00"]
    )
    assert MT4Parser._no_es_operacion(fila) is True


@pytest.mark.parametrize("tipo", ["buy", "sell", "BUY", " Sell "])
def test_las_operaciones_de_verdad_no_se_saltan(tipo):
    """La red nueva no se puede comer una operacion real: si lo hiciera, la
    cuenta saldria con menos trades de los que tiene y las sumas dejarian de
    cuadrar con el Closed P/L del propio MT4."""
    fila = [
        114488147,
        "2026.10.12 15:27:10",
        tipo,
        1.0,
        "eurusd",
        1.11763,
        1.11472,
        1.12449,
        "2026.10.12 16:00:00",
        1.11798,
        -5.0,
        0.0,
        0.0,
        35.0,
    ]
    assert MT4Parser._no_es_operacion(fila) is False
