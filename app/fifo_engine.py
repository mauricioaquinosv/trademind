"""
TradeMind — Motor de reconciliación FIFO

Recibe ejecuciones (compras/ventas) y devuelve trades cerrados,
aplicando lógica FIFO por símbolo. El PnL de cada trade se toma
del profit ya calculado por el broker en cada ejecución de cierre
(no se recalcula con precio × tamaño de contrato), para no depender
de conocer el multiplicador de cada instrumento. Comisión y swap
se reparten igual, proporcionalmente por unidad.
"""

from dataclasses import dataclass
from typing import Deque, Dict, List, Optional
from collections import deque
from datetime import datetime


@dataclass
class Execution:
    """Una ejecución individual (un 'Deal' de MT5, ya parseado)."""
    symbol: str
    side: str  # 'buy' o 'sell'
    quantity: float
    price: float
    timestamp: Optional[datetime] = None
    execution_id: Optional[str] = None
    commission: float = 0.0
    swap: float = 0.0
    profit: float = 0.0  # PnL ya calculado por el broker para esta ejecución
    # Datos descriptivos que se conservan al cerrar el trade.
    sl: Optional[float] = None
    tp: Optional[float] = None
    position: Optional[str] = None  # ID de posición/ticket del broker

    def __post_init__(self):
        if self.side not in ("buy", "sell"):
            raise ValueError(f"side debe ser 'buy' o 'sell', recibido: {self.side}")
        if self.quantity <= 0:
            raise ValueError("quantity debe ser positivo")


@dataclass
class Lot:
    """Un lote abierto pendiente de cierre (unidad interna de la cola FIFO)."""
    side: str
    quantity: float
    price: float
    timestamp: Optional[datetime] = None
    commission_per_unit: float = 0.0
    swap_per_unit: float = 0.0
    profit_per_unit: float = 0.0
    sl: Optional[float] = None
    tp: Optional[float] = None
    position: Optional[str] = None


@dataclass
class ClosedTrade:
    """Un trade ya cerrado, con el desglose completo del resultado."""
    symbol: str
    direction: str  # 'long' o 'short'
    quantity: float
    entry_price: float
    exit_price: float
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    commission: float = 0.0
    swap: float = 0.0
    # Impuestos retenidos por el broker. MT4 trae una columna "Taxes" que MT5
    # no tiene; casi siempre es 0.00, pero cuando no lo es no puede meterse
    # dentro de `commission`, porque entonces la comisión que se enseña al
    # usuario no sería la que cobró el broker. En los reportes de MT5 no
    # existe, así que se queda a 0.0.
    taxes: float = 0.0
    pnl_bruto: float = 0.0  # profit real reportado por el broker
    sl: Optional[float] = None
    tp: Optional[float] = None
    position: Optional[str] = None  # ID de posición/ticket, si el origen lo trae

    @property
    def pnl(self) -> float:
        """Alias retrocompatible con la Fase 0."""
        return self.pnl_bruto

    @property
    def pnl_neto(self) -> float:
        """Resultado calculado: profit del broker + comisión + swap + impuestos.

        Este es el mismo número que MT4 pone en su propia fila "Closed P/L",
        que suma Commission + Taxes + Swap + Profit. Si `taxes` no entrara
        aquí, un broker que retenga impuestos daría un neto mayor que el que
        reporta el propio terminal, y el usuario lo notaría al cuadrar.
        """
        return round(self.pnl_bruto + self.commission + self.swap + self.taxes, 8)


class FifoEngine:
    """Motor de reconciliación FIFO por símbolo."""

    def __init__(self):
        self._open_lots: Dict[str, Deque[Lot]] = {}

    @staticmethod
    def _direction_of(side: str) -> str:
        return "long" if side == "buy" else "short"

    def process(self, executions: List[Execution]) -> List[ClosedTrade]:
        closed_trades: List[ClosedTrade] = []
        for ex in executions:
            closed_trades.extend(self._process_one(ex))
        return closed_trades

    def _process_one(self, ex: Execution) -> List[ClosedTrade]:
        closed: List[ClosedTrade] = []
        queue = self._open_lots.setdefault(ex.symbol, deque())
        remaining = ex.quantity

        ex_commission_per_unit = (ex.commission / ex.quantity) if ex.quantity else 0.0
        ex_swap_per_unit = (ex.swap / ex.quantity) if ex.quantity else 0.0
        ex_profit_per_unit = (ex.profit / ex.quantity) if ex.quantity else 0.0

        if not queue or queue[0].side == ex.side:
            queue.append(Lot(
                side=ex.side, quantity=remaining, price=ex.price, timestamp=ex.timestamp,
                commission_per_unit=ex_commission_per_unit, swap_per_unit=ex_swap_per_unit,
                profit_per_unit=ex_profit_per_unit,
                sl=ex.sl, tp=ex.tp, position=ex.position,
            ))
            return closed

        while remaining > 0 and queue and queue[0].side != ex.side:
            lot = queue[0]
            match_qty = min(lot.quantity, remaining)

            entry_commission = lot.commission_per_unit * match_qty
            entry_swap = lot.swap_per_unit * match_qty
            entry_profit = lot.profit_per_unit * match_qty
            exit_commission = ex_commission_per_unit * match_qty
            exit_swap = ex_swap_per_unit * match_qty
            exit_profit = ex_profit_per_unit * match_qty

            closed.append(ClosedTrade(
                symbol=ex.symbol,
                direction=self._direction_of(lot.side),
                quantity=match_qty,
                entry_price=lot.price,
                exit_price=ex.price,
                entry_time=lot.timestamp,
                exit_time=ex.timestamp,
                commission=round(entry_commission + exit_commission, 8),
                swap=round(entry_swap + exit_swap, 8),
                pnl_bruto=round(entry_profit + exit_profit, 8),
                # SL/TP/ticket vienen de la ejecución de ENTRADA (el lot); si la
                # salida los trae y la entrada no, se usan los de la salida.
                sl=lot.sl if lot.sl is not None else ex.sl,
                tp=lot.tp if lot.tp is not None else ex.tp,
                position=lot.position or ex.position,
            ))

            lot.quantity -= match_qty
            remaining -= match_qty
            if lot.quantity <= 1e-12:
                queue.popleft()

        if remaining > 1e-12:
            queue.append(Lot(
                side=ex.side, quantity=remaining, price=ex.price, timestamp=ex.timestamp,
                commission_per_unit=ex_commission_per_unit, swap_per_unit=ex_swap_per_unit,
                profit_per_unit=ex_profit_per_unit,
                sl=ex.sl, tp=ex.tp, position=ex.position,
            ))

        return closed