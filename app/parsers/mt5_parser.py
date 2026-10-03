"""
Parser de reportes de MetaTrader 5.

Lee la sección "Positions" del reporte exportado desde el terminal MT5
(acepta .xlsx real, tablas HTML disfrazadas de .xlsx/.xls, y CSV).
Esa tabla ya viene con cada posición cerrada, calculada por el propio
MT5 (funciona igual para cuentas Hedge y Netting), así que no hace
falta reconstruirla con el motor FIFO -- solo la traducimos al formato
interno de trade cerrado que usa TradeMind.
"""

from datetime import datetime
from typing import List, Optional

import pandas as pd

from app.fifo_engine import ClosedTrade
from app.parsers.file_reader import read_any_table


class MT5Parser:
    """Traduce la tabla 'Positions' de un reporte de MT5 a ClosedTrade."""

    def parse(self, file_path: str) -> List[ClosedTrade]:
        raw = read_any_table(file_path)

        start = self._find_positions_header_row(raw)
        trades: List[ClosedTrade] = []

        for i in range(start + 1, len(raw)):
            row = raw.iloc[i].tolist()

            # La tabla termina cuando la fila deja de tener una fecha de apertura válida
            if pd.isna(row[0]) or not self._looks_like_datetime(row[0]):
                break

            direction = "long" if str(row[3]).strip().lower() == "buy" else "short"

            trades.append(ClosedTrade(
                symbol=str(row[2]).strip(),
                direction=direction,
                quantity=float(row[4]),
                entry_price=float(row[5]),
                exit_price=float(row[9]),
                entry_time=self._parse_time(row[0]),
                exit_time=self._parse_time(row[8]),
                commission=float(row[10] or 0.0),
                swap=float(row[11] or 0.0),
                pnl_bruto=float(row[12] or 0.0),
                sl=self._parse_optional_float(row[6]),
                tp=self._parse_optional_float(row[7]),
                position=self._parse_position(row[1]),
            ))

        return trades

    @staticmethod
    def _find_positions_header_row(raw: pd.DataFrame) -> int:
        for i, row in raw.iterrows():
            if str(row[0]).strip() == "Time" and str(row[1]).strip() == "Position":
                return i
        raise ValueError("No se encontró la sección 'Positions' en el archivo")

    @staticmethod
    def _looks_like_datetime(value) -> bool:
        try:
            datetime.strptime(str(value).strip(), "%Y.%m.%d %H:%M:%S")
            return True
        except ValueError:
            return False

    @staticmethod
    def _parse_time(value) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.strptime(str(value).strip(), "%Y.%m.%d %H:%M:%S")

    @staticmethod
    def _parse_optional_float(value) -> Optional[float]:
        if pd.isna(value):
            return None
        try:
            parsed = float(value)
            return parsed if parsed != 0.0 else None
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_position(value) -> Optional[str]:
        if pd.isna(value):
            return None
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value).strip()