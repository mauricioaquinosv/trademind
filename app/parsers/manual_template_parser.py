"""
Parser de la plantilla propia de TradeMind para carga manual.

Formato de columnas (una fila de encabezado, luego una fila por trade):
Fecha apertura, Hora apertura, Posición, Símbolo, Tipo (buy/sell),
Volumen, Precio apertura, S/L, T/P, Fecha cierre, Hora cierre,
Precio cierre, Comisión, Swap, Beneficio.

Acepta .xlsx real, tablas HTML disfrazadas, y CSV.
"""

from datetime import datetime
from typing import List, Optional

import pandas as pd

from app.fifo_engine import ClosedTrade
from app.parsers.file_reader import read_any_table
from app.errors import FILE_BAD_DATE, FILE_BAD_TEMPLATE, FileError

EXPECTED_HEADERS_PREFIX = ["Fecha apertura", "Hora apertura", "Posición", "Símbolo"]


class ManualTemplateParser:
    """Traduce la plantilla propia de TradeMind (fecha/hora separadas) a ClosedTrade."""

    def parse(self, file_path: str) -> List[ClosedTrade]:
        """Las operaciones de la plantilla, sin nada mas.

        Se mantiene por compatibilidad: la usaban el resto de codigo y los
        tests. Para el aviso de operaciones rechazadas hace falta saber de
        que fila salio cada una, y eso lo da `parse_con_filas`.
        """
        trades, _filas = self.parse_con_filas(file_path)
        return trades

    def parse_con_filas(self, file_path: str):
        """Igual que parse, pero cada operacion viene con su fila en el archivo.

        Devuelve (trades, filas): dos listas del mismo tamano y en el mismo
        orden, porque `trades.py` las usa pareadas para asignar a cada
        rechazo su numero de linea. La fila es la que ve el usuario en su
        Excel contando desde 1, con la 1 siendo la de los encabezados.

        Antes la plantilla no tenia este metodo, asi que el endpoint rellenaba
        `filas = [None] * n` y el usuario recibia el motivo del rechazo sin
        saber cual era la linea que lo provocaba. MT4 y MT5 si lo traian.
        """
        raw = read_any_table(file_path)

        header_row = [str(c).strip() for c in raw.iloc[0].tolist()]
        header_starts = [h.split("(")[0].strip() for h in header_row[:4]]
        if header_starts != EXPECTED_HEADERS_PREFIX:
            raise FileError(
                FILE_BAD_TEMPLATE,
                "El archivo no coincide con la plantilla de TradeMind. "
                "Descarga la plantilla desde la vista de importar y vuelve a intentar.",
            )

        trades: List[ClosedTrade] = []
        filas: List[int] = []

        for i in range(1, len(raw)):
            row = raw.iloc[i].tolist()

            if pd.isna(row[0]) or pd.isna(row[3]):
                continue  # fila vacía, se ignora

            # No se fuerza a "short". Si quien llena la plantilla escribe algo
            # que no es "buy" ni "sell" (un "compra", o la celda vacia), el
            # valor pasa tal cual a la validacion, que rechaza esa fila con
            # direction_invalid y le dice al usuario que fila es y que valor
            # tenia. Forzando "short" aqui se fabricaria una operacion vendida
            # que nadie pidio, y saldria como una venta mas en las estadisticas
            # sin que hubiera forma de enterarse.
            tipo = None if pd.isna(row[4]) else str(row[4]).strip().lower()
            if tipo == "buy":
                direction = "long"
            elif tipo == "sell":
                direction = "short"
            else:
                direction = tipo

            # `fila` es i+1 porque el indice de pandas empieza en 0, mientras
            # que el usuario ve su Excel contando desde 1 (la 1 es el
            # encabezado). Es el mismo criterio que MT4 y MT5.
            #
            # Las filas que el `continue` de arriba salta NO desplazan el
            # numero: es el del archivo, no un contador de operaciones. Si se
            # cambiase a contar de uno en uno, el aviso apuntaria a la linea
            # equivocada. Esta cubierto por
            # test_la_plantilla_devuelve_la_fila_absoluta_de_cada_operacion.
            fila = i + 1

            trades.append(ClosedTrade(
                symbol=str(row[3]).strip(),
                direction=direction,
                quantity=float(row[5]),
                entry_price=float(row[6]),
                exit_price=float(row[11]),
                entry_time=self._combine_datetime(row[0], row[1]),
                exit_time=self._combine_datetime(row[9], row[10]),
                commission=float(row[12] or 0.0),
                swap=float(row[13] or 0.0),
                pnl_bruto=float(row[14] or 0.0),
                sl=self._parse_optional_float(row[7]),
                tp=self._parse_optional_float(row[8]),
                position=self._parse_position(row[2]),
            ))
            filas.append(fila)

        return trades, filas

    @staticmethod
    def _combine_datetime(date_val, time_val) -> Optional[datetime]:
        if pd.isna(date_val):
            return None

        # Si la celda ya viene como datetime/Timestamp de pandas, se usa tal cual.
        if isinstance(date_val, datetime):
            date_part = date_val.strftime("%Y-%m-%d")
            time_part = "00:00:00"
            if not pd.isna(time_val):
                if isinstance(time_val, datetime):
                    time_part = time_val.strftime("%H:%M:%S")
                else:
                    time_part = ManualTemplateParser._normalize_time(str(time_val))
            return datetime.strptime(f"{date_part} {time_part}", "%Y-%m-%d %H:%M:%S")

        # Excel entrega la fecha con puntos ("2026.01.22") y también con barras
        # ("2026/01/22"); se normalizan a guiones para poder usar un solo formato.
        date_str = str(date_val).strip().replace(".", "-").replace("/", "-")

        if pd.isna(time_val):
            time_str = "00:00:00"
        elif isinstance(time_val, datetime):
            time_str = time_val.strftime("%H:%M:%S")
        else:
            time_str = ManualTemplateParser._normalize_time(str(time_val))

        try:
            return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            # Último recurso: la fecha ya venía con hora dentro de la misma celda
            # (algunos usuarios unen las columnas al exportar).
            combined = f"{date_str} {time_str}"
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
                try:
                    return datetime.strptime(combined, fmt)
                except ValueError:
                    continue
            raise FileError(
                FILE_BAD_DATE,
                f"No se pudo interpretar la fecha '{date_str} {time_str}'. "
                "Usa el formato AAAA-MM-DD en la columna de fecha.",
                extra={"date": f"{date_str} {time_str}"},
            )

    @staticmethod
    def _normalize_time(value: str) -> str:
        """Normaliza la hora a HH:MM:SS aunque venga como texto o como fracción de Excel."""
        v = value.strip()
        if not v:
            return "00:00:00"

        # Hora de Excel guardada como número (fracción del día): 0.5 = 12:00:00
        try:
            as_float = float(v)
        except ValueError:
            pass
        else:
            if 0 <= as_float < 1:
                total_seconds = int(round(as_float * 86400))
                return f"{total_seconds // 3600:02d}:{(total_seconds % 3600) // 60:02d}:{total_seconds % 60:02d}"
            # El decimal es en realidad una fecha completa de Excel (número de serie).
            try:
                return (pd.Timestamp("1899-12-30") + pd.Timedelta(days=as_float)).strftime("%H:%M:%S")
            except (ValueError, OverflowError):
                pass

        parts = v.split(":")
        if len(parts) == 2:
            return f"{int(parts[0]):02d}:{int(parts[1]):02d}:00"
        if len(parts) >= 3:
            return f"{int(parts[0]):02d}:{int(parts[1]):02d}:{int(float(parts[2])):02d}"
        if len(parts) == 1 and parts[0].isdigit():
            return f"{int(parts[0]):02d}:00:00"
        return v

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