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
from app.errors import FILE_NO_POSITIONS, FileError


class MT5Parser:
    """Traduce la tabla 'Positions' de un reporte de MT5 a ClosedTrade."""

    # Encabezados con los que empieza otra seccion del reporte. Cuando aparece
    # uno DESPUES de la tabla de Positions, esta ha terminado.
    #
    # "Positions" NO va aqui: es el nombre de nuestra propia tabla y aparece en
    # la fila 5, justo antes de la cabecera de las columnas (fila 6). Si estuiera
    # en la lista, el parser pararia antes de leer la primera operacion.
    _SECTION_HEADERS = {
        "Orders",
        "Deals",
        "Results",
        "Tickets",
        "Order History",
        "Deal History",
        "Balance:",
        "Credit Facility:",
        "Floating P/L:",
        "Equity:",
        "Stop Loss",
        "Limit Orders",
    }

    def parse(self, file_path: str) -> List[ClosedTrade]:
        raw = read_any_table(file_path)

        start = self._find_positions_header_row(raw)
        trades: List[ClosedTrade] = []

        for i in range(start + 1, len(raw)):
            row = raw.iloc[i].tolist()

            # El reporte de MT5 tiene VARIAS secciones seguidas: Positions,
            # Orders, Deals, y al final un resumen. Solo nos interesa la
            # primera, asi que aqui se termina.
            #
            # Antes se usaba `break` en cuanto una fila no tenia fecha, lo cual
            # paraba el bucle en la fila 27, que es la que dice "Orders". Eso
            # hacia que solo se leyeran las 20 posiciones y se perdia todo lo
            # demas. Con `break` aqui, la tabla de Positions se lee completa y
            # se corta en el cambio de seccion.
            if str(row[0]).strip() in self._SECTION_HEADERS:
                break

            # Filas sueltas sin fecha dentro de la tabla (separadores, pies de
            # seccion). Se saltan, no se termina.
            if pd.isna(row[0]) or not self._looks_like_datetime(row[0]):
                continue

            direction = "long" if str(row[3]).strip().lower() == "buy" else "short"

            trades.append(ClosedTrade(
                symbol=str(row[2]).strip(),
                direction=direction,
                quantity=float(row[4]),
                entry_price=float(row[5]),
                exit_price=float(row[9]),
                entry_time=self._parse_time(row[0]),
                exit_time=self._parse_time(row[8]),
                # El reporte de MT5 deja estas tres celdas VACIAS con mucha
                # frecuencia (67 de 130 filas en el reporte de ejemplo). Con
                # `float(x or 0.0)` el 0.0 nunca se usaba, porque en Python NaN
                # es "verdadero": el `or` devuelve NaN. El resultado era un NaN
                # guardado en commission/swap/pnl_bruto, que hacia que TODAS las
                # sumas de la cuenta dieran NaN y que GET /trades/ devolviera un
                # 500 al serializar.
                #
                # _parse_optional_float ya hacia esto bien con pd.isna; para estas
                # tres se quiere 0.0 y no None, asi que hay un helper aparte.
                commission=self._parse_float_or_zero(row[10]),
                swap=self._parse_float_or_zero(row[11]),
                pnl_bruto=self._parse_float_or_zero(row[12]),
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
        raise FileError(
            FILE_NO_POSITIONS,
            "No se encontró la sección 'Positions' en el archivo",
        )

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
    def _parse_float_or_zero(value) -> float:
        """Como _parse_optional_float pero devuelve 0.0 en vez de None.

        Para comision, swap y pnl_bruto, que no admiten nulo: en la base de
        datos son NOT NULL y ademas 0.0 es su valor correcto cuando la celda
        viene vacia (el broker no cobro nada).

        Hace falta un helper propio porque `float(x or 0.0)` NO funciona: pandas
        convierte la celda vacia en NaN, y en Python NaN es verdadero, asi que
        el `or` devuelve NaN y nunca se llega a usar el 0.0. Eso guardaba un NaN
        en la columna y hacia que cualquier suma con ese trade diera NaN.
        """
        if pd.isna(value):
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _parse_position(value) -> Optional[str]:
        if pd.isna(value):
            return None
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value).strip()