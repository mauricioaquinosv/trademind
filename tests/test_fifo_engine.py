"""
Tests del motor de reconciliación FIFO.

Estos tests importan el módulo REAL (app.fifo_engine), no una copia.
La versión anterior de este archivo contenía una copia del motor dentro
del propio test, lo que hacía que pasara aunque el motor real estuviera roto.

Cobertura:
  - Cierre simple (compra + venta)
  - Orden FIFO estricto (se cierra el lote MÁS ANTIGUO, no el más favorable)
  - Scale-in (varias entradas antes de cerrar)
  - Scale-out parcial (una entrada, varios cierres parciales)
  - Reversión de posición
  - Posiciones cortas (short)
  - Múltiples símbolos independientes
  - Reparto proporcional de comisión y swap
  - Cálculo de PnL (bruto + comisión + swap = neto)
  - Validación de entradas inválidas
"""

from datetime import datetime, timedelta

import pytest

from app.fifo_engine import ClosedTrade, Execution, FifoEngine

BASE = datetime(2026, 1, 22, 9, 0, 0)


def at(minutes: int) -> datetime:
    """Marca de tiempo legible: BASE + N minutos."""
    return BASE + timedelta(minutes=minutes)


def run(*executions: Execution) -> list:
    """Pasa las ejecuciones por el motor y devuelve los trades cerrados."""
    return FifoEngine().process(list(executions))


# ====================================================================
# Cierre simple
# ====================================================================

def test_cierre_simple_genera_un_trade():
    """Una compra seguida de una venta del mismo tamaño cierra un trade long."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(30), profit=50.0),
    )

    assert len(trades) == 1
    t = trades[0]
    assert t.symbol == "EURUSD"
    assert t.direction == "long"
    assert t.quantity == 1.0
    assert t.entry_price == 1.1000
    assert t.exit_price == 1.1500
    assert t.entry_time == at(0)
    assert t.exit_time == at(30)


def test_venta_seguida_de_compra_genera_short():
    """Vender antes de comprar abre un short; la compra lo cierra."""
    trades = run(
        Execution("EURUSD", "sell", 1.0, 1.1500, at(0)),
        Execution("EURUSD", "buy", 1.0, 1.1000, at(20), profit=50.0),
    )

    assert len(trades) == 1
    assert trades[0].direction == "short"
    assert trades[0].entry_price == 1.1500
    assert trades[0].exit_price == 1.1000


def test_mismo_lado_no_cierra_nada():
    """Dos compras seguidas no producen trades cerrados."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 1.0, 1.2000, at(10)),
    )
    assert trades == []


# ====================================================================
# Orden FIFO estricto — la parte que más fácil se rompe
# ====================================================================

def test_cierra_el_lote_mas_antiguo_no_el_mas_favorable():
    """
    Con dos entradas a precios distintos, FIFO debe cerrar primero la MÁS ANTIGUA,
    aunque la otra dé más beneficio. Es el comportamiento que distingue FIFO de LIFO
    y de "cerrar el más rentable".
    """
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),   # primero (peor precio)
        Execution("EURUSD", "buy", 1.0, 1.3000, at(5)),   # segundo (mejor precio)
        Execution("EURUSD", "sell", 2.0, 1.2000, at(10), profit=0.0),
    )

    assert len(trades) == 2
    # El primer cerrado debe ser el LOTE ANTIGUO (1.1000), no el de 1.3000.
    assert trades[0].entry_price == 1.1000
    assert trades[1].entry_price == 1.3000


def test_orden_de_cierre_conserva_la_orden_de_entrada():
    """Tres entradas, un cierre triple: deben cerrarse en orden de llegada."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 1.0, 1.1500, at(1)),
        Execution("EURUSD", "buy", 1.0, 1.2000, at(2)),
        Execution("EURUSD", "sell", 3.0, 1.2500, at(3)),
    )

    assert [t.entry_price for t in trades] == [1.1000, 1.1500, 1.2000]


# ====================================================================
# Scale-in y scale-out
# ====================================================================

def test_scale_in_tres_entradas_dos_cierres():
    """Se abre posición en tres veces y se cierra en dos."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 1.0, 1.1200, at(5)),
        Execution("EURUSD", "buy", 2.0, 1.1300, at(10)),
        Execution("EURUSD", "sell", 3.0, 1.1500, at(20)),   # cierra 3 de 4
    )

    assert len(trades) == 3
    assert [t.quantity for t in trades] == [1.0, 1.0, 1.0]
    assert [t.entry_price for t in trades] == [1.1000, 1.1200, 1.1300]


def test_scale_out_parcial_un_entrada_dos_salidas():
    """Una entrada de 2 unidades se cierra en dos salidas de 1."""
    trades = run(
        Execution("EURUSD", "buy", 2.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 1.0, 1.1200, at(10), profit=20.0),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(20), profit=50.0),
    )

    assert len(trades) == 2
    # Ambas deben conservar el MISMO precio de entrada (el de la única entrada).
    assert [t.entry_price for t in trades] == [1.1000, 1.1000]
    assert [t.quantity for t in trades] == [1.0, 1.0]
    assert [t.exit_price for t in trades] == [1.1200, 1.1500]


def test_escala_irregular_1_5_y_0_5():
    """Entrada fraccionada: 1.0 + 0.5, cerrada con 0.5 + 0.5 + 0.5."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 0.5, 1.1300, at(5)),
        Execution("EURUSD", "sell", 0.5, 1.1400, at(10)),   # cierra el 1.0 a medias
        Execution("EURUSD", "sell", 0.5, 1.1500, at(15)),
        Execution("EURUSD", "sell", 0.5, 1.1600, at(20)),
    )

    assert len(trades) == 3
    assert [t.quantity for t in trades] == [0.5, 0.5, 0.5]
    assert [t.entry_price for t in trades] == [1.1000, 1.1000, 1.1300]


# ====================================================================
# Reversión
# ====================================================================

def test_reversion_cierra_y_abre_en_contrario():
    """Comprar 1 y vender 2 cierra el long y abre 1 short."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 2.0, 1.2000, at(10), profit=100.0),
    )

    # Solo se cierra el long; el short queda abierto.
    assert len(trades) == 1
    assert trades[0].direction == "long"
    assert trades[0].quantity == 1.0


def test_reversion_completa_short_luego_long():
    """Tras la reversión, una compra cierra el short."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 2.0, 1.2000, at(10), profit=100.0),
        Execution("EURUSD", "buy", 1.0, 1.2500, at(20), profit=50.0),
    )

    assert len(trades) == 2
    assert trades[0].direction == "long"
    assert trades[1].direction == "short"
    assert trades[1].entry_price == 1.2000
    assert trades[1].exit_price == 1.2500


# ====================================================================
# Múltiples símbolos
# ====================================================================

def test_simbolos_se_gestionan_por_separado():
    """Las colas FIFO son independientes por símbolo."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("GBPUSD", "buy", 1.0, 1.3000, at(1)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(10), profit=50.0),
        Execution("GBPUSD", "sell", 1.0, 1.3500, at(11), profit=50.0),
    )

    assert len(trades) == 2
    assert {t.symbol for t in trades} == {"EURUSD", "GBPUSD"}
    # Cerrar EURUSD no debe afectar a GBPUSD.
    assert trades[0].entry_price == 1.1000
    assert trades[1].entry_price == 1.3000


def test_cierre_parcial_no_afecta_otro_simbolo():
    """Un símbolo queda abierto mientras el otro se cierra por completo."""
    trades = run(
        Execution("EURUSD", "buy", 2.0, 1.1000, at(0)),
        Execution("GBPUSD", "sell", 1.0, 1.3000, at(1)),
        Execution("GBPUSD", "buy", 1.0, 1.3500, at(2), profit=50.0),
    )

    assert len(trades) == 1
    assert trades[0].symbol == "GBPUSD"


# ====================================================================
# Comisión y swap proporcionales
# ====================================================================

def test_comision_y_swap_se_reparten_proporcionalmente():
    """
    Entrada de 2 unidades con -4 de comisión (=-2 por unidad) cerrada con 1 unidad
    cuya comisión es -1: el trade resultante lleva -3 de comisión (2 de entrada + 1 de salida).
    """
    trades = run(
        Execution("EURUSD", "buy", 2.0, 1.1000, at(0), commission=-4.0, swap=-1.0),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(10), commission=-1.0, swap=-0.5),
    )

    assert len(trades) == 1
    t = trades[0]
    assert t.quantity == 1.0
    # 2.0 (entrada, -2/unidad x 1) + 1.0 (salida, -1/unidad x 1)
    assert t.commission == pytest.approx(-3.0)
    # 0.5 (entrada, -0.5/unidad x 1) + 0.5 (salida)
    assert t.swap == pytest.approx(-1.0)


def test_comision_se_reparte_entre_cierres_parciales():
    """Una entrada de 2 con -4 de comisión, cerrada en dos de 1: cada trade lleva -2."""
    trades = run(
        Execution("EURUSD", "buy", 2.0, 1.1000, at(0), commission=-4.0),
        Execution("EURUSD", "sell", 1.0, 1.1200, at(10)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(20)),
    )

    assert len(trades) == 2
    # -2 por unidad en cada uno de los dos cierres de 1 unidad.
    assert trades[0].commission == pytest.approx(-2.0)
    assert trades[1].commission == pytest.approx(-2.0)


def test_profit_se_reparte_proporcionalmente():
    """Una salida de 1 unidad con profit 100 sobre una entrada de 2 deja 50 abierto."""
    trades = run(
        Execution("EURUSD", "buy", 2.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(10), profit=100.0),
    )

    assert trades[0].pnl_bruto == pytest.approx(100.0)
    # Queda 1 unidad abierta, sin trade cerrado aún.
    assert len(trades) == 1


# ====================================================================
# PnL
# ====================================================================

def test_pnl_neto_suma_bruno_mas_comision_mas_swap():
    """pnl_neto = pnl_bruto + comisión + swap (con comisión/swap negativos de MT5)."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.0850, at(0)),
        Execution("EURUSD", "sell", 1.0, 1.0912, at(104), profit=62.0, commission=-2.5, swap=-0.3),
    )

    t = trades[0]
    assert t.pnl_bruto == pytest.approx(62.0)
    assert t.commission == pytest.approx(-2.5)
    assert t.swap == pytest.approx(-0.3)
    assert t.pnl_neto == pytest.approx(59.2)
    # El alias retrocompatible debe coincidir con el bruto.
    assert t.pnl == t.pnl_bruto


def test_caso_real_de_la_plantilla():
    """Reproduce la primera fila de sample_data/plantilla_trademind.xlsx."""
    trades = run(
        Execution("EURUSD", "buy", 0.10, 1.0850, at(0)),
        Execution("EURUSD", "sell", 0.10, 1.0912, at(104), profit=62.0, commission=-2.5, swap=-0.3),
    )

    assert len(trades) == 1
    assert trades[0].symbol == "EURUSD"
    assert trades[0].pnl_neto == pytest.approx(59.2)


# ====================================================================
# Campos opcionales
# ====================================================================

def test_sl_tp_y_position_se_propagan():
    """Si la ejecución trae sl/tp/position, el trade cerrado los conserva."""
    ex_entrada = Execution("EURUSD", "buy", 1.0, 1.1000, at(0))
    ex_entrada.tp = 1.2000
    ex_entrada.position = "12345"

    trades = run(ex_entrada, Execution("EURUSD", "sell", 1.0, 1.1900, at(10), profit=90.0))

    assert trades[0].tp == 1.2000
    assert trades[0].position == "12345"


def test_campos_por_defecto_en_zer():
    """Sin comisión/swap/profit explícitos, quedan en cero."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(10)),
    )

    t = trades[0]
    assert t.commission == 0.0
    assert t.swap == 0.0
    assert t.pnl_bruto == 0.0
    assert t.pnl_neto == 0.0


# ====================================================================
# Validación de entradas inválidas
# ====================================================================

def test_side_invalido_rechazado():
    """Un lado que no sea buy/sell debe fallar al construir la ejecución."""
    with pytest.raises(ValueError, match="side debe ser"):
        Execution("EURUSD", "hold", 1.0, 1.1000)


@pytest.mark.parametrize("qty", [0, -1, -0.5])
def test_cantidad_no_positiva_rechazada(qty):
    """Cantidad cero o negativa es un error de entrada."""
    with pytest.raises(ValueError, match="quantity debe ser positivo"):
        Execution("EURUSD", "buy", qty, 1.1000)


def test_lista_vacia_devuelve_vacio():
    assert FifoEngine().process([]) == []


def test_solo_entradas_sin_salidas_no_produce_trades():
    """Con la posición todavía abierta no hay nada que cerrar."""
    trades = run(
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 2.0, 1.1500, at(5)),
    )
    assert trades == []


# ====================================================================
# Sumas conservadoras
# ====================================================================

def test_sin_perdida_de_volumen():
    """
    La suma de las cantidades cerradas más lo que queda abierto debe ser
    igual al total comprado. Detecta que el motor pierda o invente volumen.
    """
    executions = [
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 2.0, 1.1200, at(5)),
        Execution("EURUSD", "sell", 2.5, 1.1400, at(10), profit=30.0),
        Execution("EURUSD", "sell", 0.5, 1.1600, at(15), profit=20.0),
    ]

    engine = FifoEngine()
    trades = engine.process(executions)

    comprado = sum(e.quantity for e in executions if e.side == "buy")
    vendido = sum(e.quantity for e in executions if e.side == "sell")
    cerrado = sum(t.quantity for t in trades)
    abierto = sum(lot.quantity for queue in engine._open_lots.values() for lot in queue)

    assert cerrado + abierto == pytest.approx(comprado)
    assert cerrado == pytest.approx(vendido)
    assert abierto == pytest.approx(0.0)


def test_sin_perdida_de_profit():
    """El profit total de las salidas debe repartirse sin perderse."""
    executions = [
        Execution("EURUSD", "buy", 1.0, 1.1000, at(0)),
        Execution("EURUSD", "buy", 1.0, 1.1200, at(5)),
        Execution("EURUSD", "sell", 1.0, 1.1500, at(10), profit=60.0),
        Execution("EURUSD", "sell", 1.0, 1.1800, at(15), profit=90.0),
    ]

    trades = FifoEngine().process(executions)

    esperado = sum(e.profit for e in executions if e.side == "sell")
    assert sum(t.pnl_bruto for t in trades) == pytest.approx(esperado)