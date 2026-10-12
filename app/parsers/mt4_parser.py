"""
Parser de reportes de MetaTrader 4.

Lee la seccion "Closed Transactions" del reporte exportado desde el
terminal MT4 (un .htm, o un .xlsx/.xls que en realidad es HTML disfrazado,
que es lo que hace MT4 cuando eliges guardar como Excel).

Al igual que en MT5, la tabla ya viene con cada operacion CERRADA y
calculada por el propio terminal, asi que no hace falta el motor FIFO:
solo se traduce al formato interno de trade cerrado que usa TradeMind.

POR QUE NO VALE EL PARSER DE MT5

La cabecera es otra y las columnas no coinciden:

    MT5:  Time | Position | Symbol | Type | Volume | Price | S/L | T/P |
          Time | Price | Commission | Swap | Profit
    MT4:  Ticket | Open Time | Type | Size | Item | Price | S/L | T/P |
          Close Time | Price | Commission | Taxes | Swap | Profit

Tres diferencias que importan:

  - MT4 tiene "Taxes", que MT5 no tiene. Se suma a "Taxes" del modelo.
  - Se llama "Size" e "Item", no "Volume" y "Symbol".
  - MT4 mete la fila del balance inicial y una fila de totales dentro de
    la misma tabla. Esas dos filas no son operaciones y hay que saltarlas.

LAS TRAMPAS DE ESTE FORMATO, Y POR QUE ESTAN AQUI ESCRITAS

  1. El separador de miles. MT4 escribe "25 000.00", con un ESPACIO.
     `float("25 000.00")` lanza ValueError, y si eso se deja pasar, un
     balance o un P/L grande se convierte en None sin avisar. Se quita
     el espacio antes de convertir.

  2. La fila de totales. Empieza con `&nbsp;` (que pandas lee como NaN)
     y tiene cuatro numeros al final. Si no se salta, se convierte en una
     operacion con ticket vacio y numeros donde no van.

  3. La fila de balance, deposito o retiro. ATENCION: NO trae cinco celdas
     ni fecha vacia, como podria suponerse. Trae las mismas catorce que una
     operacion, con un ticket numerico ("114487682") y una fecha valida, y
     el saldo repetido en las demas celdas. Las comprobaciones normales --
     celda vacia, ticket que no es numero -- NO la pillan. Lo unico que la
     delata es el tipo: no es "buy" ni "sell". Se salta: el saldo lo
     gestiona la cuenta, no una operacion.

  4. Los simbolos van en MINUSCULAS ("eurusd"). Si se guardan asi,
     Analytics trata "eurusd" y "EURUSD" como dos simbolos distintos y
     las estadisticas se parten por la mitad. Se pasan a mayusculas.

  5. S/L y T/P a veces vienen como "0.00000" en vez de vacios. Un stop
     loss en 0.0 no tiene sentido: se trata como "no tiene".

EL IDIOMA NO IMPORTA

Comprobado con dos reportes, uno con el terminal en ingles y otro con el
terminal en espanol: MT4 escribe los nombres de las secciones SIEMPRE en
ingles ("Closed Transactions", "Open Trades", "Summary"), aunque el
programa este en otro idioma. Por eso aqui no hace falta detectar idioma.
"""

from datetime import datetime
from typing import List, Optional

import pandas as pd

from app.fifo_engine import ClosedTrade
from app.parsers.file_reader import read_any_table
from app.errors import FILE_NO_POSITIONS, FileError


class MT4Parser:
    """Traduce la tabla 'Closed Transactions' de un reporte de MT4 a ClosedTrade."""

    # Como se reconoce esta tabla: la primera celda de la cabecera y la
    # segunda. Es lo unico que distingue un reporte de MT4 de uno de MT5.
    _HEADER = ("Ticket", "Open Time")

    # Encabezados con los que empieza otra seccion. Cuando aparece uno
    # DESPUES de la tabla de operaciones, esta ha terminado.
    #
    # "Closed Transactions" NO esta aqui a proposito: es el nombre de
    # nuestra propia seccion y aparece justo antes de la cabecera. Si
    # estuviera en la lista, el parser pararia antes de leer la primera
    # operacion.
    _SECTION_HEADERS = {
        "Open Trades:",
        "Working Orders:",
        "Summary:",
        "Closed P/L:",
        "Floating P/L:",
        "Deposit/Withdrawal:",
        "Balance:",
        "Equity:",
        "Credit Facility:",
        "Margin:",
        "Free Margin:",
    }

    def parse(self, file_path: str) -> List[ClosedTrade]:
        """Las operaciones del reporte, sin nada mas."""
        trades, _filas = self.parse_con_filas(file_path)
        return trades

    def parse_con_filas(self, file_path: str):
        """Igual que parse, pero cada operacion viene con su fila en el archivo.

        Devuelve una lista de (ClosedTrade, fila). La fila es la que ve el
        usuario, contando desde 1, para poder decirle "la fila 23" cuando
        una operacion no se puede importar: sin eso no tiene forma de
        encontrarla.
        """
        raw = read_any_table(file_path)

        start = self._find_closed_transactions_header_row(raw)
        trades: List[ClosedTrade] = []
        filas: List[int] = []

        for i in range(start + 1, len(raw)):
            row = raw.iloc[i].tolist()

            # El reporte tiene varias secciones seguidas: Closed
            # Transactions, Open Trades, Working Orders y un resumen. Solo
            # nos interesa la primera.
            if str(row[0]).strip() in self._SECTION_HEADERS:
                break

            # Filas que no son operaciones. Se saltan, no se termina.
            if self._no_es_operacion(row):
                continue

            # Aqui el tipo ya es "buy" o "sell": _no_es_operacion se ha
            # llevado la fila de balance y cualquier otra cosa que no sea
            # una operacion. Sin esa red, un deposito entraria como una
            # venta con el saldo inicial como P&L.
            direction = "long" if str(row[2]).strip().lower() == "buy" else "short"

            # i+1 porque el usuario ve las filas contando desde 1, e i es
            # el indice con base 0 de pandas.
            fila = i + 1

            try:
                entry_time = self._parse_time(row[1])
            except (TypeError, ValueError):
                entry_time = None

            try:
                exit_time = self._parse_time(row[8])
            except (TypeError, ValueError):
                exit_time = None

            trade = ClosedTrade(
                # MT4 escribe los simbolos en minusculas ("eurusd"). Sin el
                # upper(), EURUSD de MT5 y eurusd de MT4 serian dos simbolos
                # distintos en Analytics y las estadisticas se partirian.
                symbol=self._parse_symbol(row[4]),
                direction=direction,
                quantity=self._parse_float_or_none(row[3]),
                entry_price=self._parse_float_or_none(row[5]),
                exit_price=self._parse_float_or_none(row[9]),
                entry_time=entry_time,
                exit_time=exit_time,
                commission=self._parse_float_or_zero(row[10]),
                # MT4 tiene una columna "Taxes" que MT5 no tiene. Va a su
                # sitio, que no es comision ni swap.
                taxes=self._parse_float_or_zero(row[11]),
                swap=self._parse_float_or_zero(row[12]),
                pnl_bruto=self._parse_float_or_zero(row[13]),
                # Un 0.0 en S/L o T/P no es un stop en cero: es que no
                # tiene. MT4 a veces escribe "0.00000" en vez de vacio.
                sl=self._parse_optional_float(row[6]),
                tp=self._parse_optional_float(row[7]),
                position=self._parse_position(row[0]),
            )

            trades.append(trade)
            filas.append(fila)

        return trades, filas

    @classmethod
    def parece_mt4(cls, raw: pd.DataFrame) -> bool:
        """True si la tabla tiene la cabecera de un reporte de MT4.

        Lo usa `trades.py` para decidir que parser aplicar, y lo usa este
        test para comprobar que un reporte de MT5 NO se confunde con uno
        de MT4 (las dos cabeceras son distintas, pero las dos tienen
        "Ticket"/"Position" cerca y equivocarse aqui seria catastrofico).
        """
        for i in range(len(raw)):
            row = raw.iloc[i].tolist()
            if len(row) < 2:
                continue
            if str(row[0]).strip() == cls._HEADER[0] and str(row[1]).strip() == cls._HEADER[1]:
                return True
            # En cuanto aparece una cabecera que no es la nuestra, se para:
            # si fuera la de MT5 queremos False, no seguir buscando.
            if str(row[0]).strip() == "Time" and len(row) > 1 and str(row[1]).strip() == "Position":
                return False
        return False

    @classmethod
    def _find_closed_transactions_header_row(cls, raw: pd.DataFrame) -> int:
        for i in range(len(raw)):
            row = raw.iloc[i].tolist()
            if len(row) < 2:
                continue
            if str(row[0]).strip() == cls._HEADER[0] and str(row[1]).strip() == cls._HEADER[1]:
                return i
        raise FileError(
            FILE_NO_POSITIONS,
            "No se encontró la sección 'Closed Transactions' en el archivo",
        )

    @classmethod
    def _no_es_operacion(cls, row) -> bool:
        """True si la fila no es una operacion cerrada.

        Cubre los cuatro casos que aparecen en un reporte de MT4 y que no son
        operaciones:

          - La fila de totales: primera celda vacia (NaN) y numeros al final.
          - Separadores y pies de seccion, vacios del todo.
          - Cualquier fila cuya primera celda no sea un ticket, que es un
            numero.
          - La fila de balance, deposito o retiro. Es la unica que se cuela
            por las tres anteriores: trae ticket numerico y fecha valida, con
            las mismas catorce celdas que una operacion de verdad.
        """
        if len(row) < 4:
            return True
        if pd.isna(row[0]):
            return True
        # El ticket es siempre un numero. Si no lo es, no es una operacion.
        if not cls._es_numero(row[0]):
            return True
        # El tipo tiene que ser "buy" o "sell". Lo demas que puede ocupar esa
        # columna (balance, deposito, retiro, credit) es dinero que entra o
        # sale de la cuenta, no una operacion. Dejandolo pasar, la linea de
        # direction de mas abajo lo meteria como una venta: en el reporte de
        # ejemplo eso seria un P&L inventado de 25 000 con el saldo inicial
        # como simbolo.
        return str(row[2]).strip().lower() not in ("buy", "sell")

    @staticmethod
    def _es_numero(value) -> bool:
        if pd.isna(value):
            return False
        try:
            float(str(value).strip().replace(" ", ""))
            return True
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _looks_like_datetime(value) -> bool:
        return _looks_like_mt4_datetime(value)

    @staticmethod
    def _parse_time(value) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.strptime(str(value).strip(), "%Y.%m.%d %H:%M:%S")

    @staticmethod
    def _parse_symbol(value) -> str:
        if pd.isna(value):
            return ""
        texto = str(value).strip()
        return texto.upper()

    @staticmethod
    def _parse_float_or_none(value) -> Optional[float]:
        if pd.isna(value):
            return None
        try:
            return float(str(value).strip().replace(" ", ""))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _parse_optional_float(value) -> Optional[float]:
        """Como _parse_float_or_none, pero un 0.0 se devuelve como None.

        Para S/L y T/P, que cuando vienen a "0.00000" quieren decir "no
        hay", no "el stop esta en cero".
        """
        parsed = MT4Parser._parse_float_or_none(value)
        if parsed is None or parsed == 0.0:
            return None
        return parsed

    @staticmethod
    def _parse_float_or_zero(value) -> float:
        if pd.isna(value):
            return 0.0
        try:
            return float(str(value).strip().replace(" ", ""))
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _parse_position(value) -> Optional[str]:
        if pd.isna(value):
            return None
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value).strip()


def _looks_like_mt4_datetime(value) -> bool:
    try:
        datetime.strptime(str(value).strip(), "%Y.%m.%d %H:%M:%S")
        return True
    except ValueError:
        return False
