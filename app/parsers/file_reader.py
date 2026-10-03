"""
Lector universal de archivos de trades.

MT5 a veces "exporta" un archivo con extensión .xlsx o .xls que en
realidad es una tabla HTML disfrazada, no un Excel real. Esta función
detecta el formato real por su contenido (no por la extensión) y
siempre devuelve la misma estructura: un DataFrame sin encabezado
(header=None), igual que pd.read_excel(..., header=None) -- así los
parsers (MT5Parser, ManualTemplateParser) no necesitan saber nada de
esto, siguen recibiendo la misma tabla de siempre.
"""

import pandas as pd


def read_any_table(file_path: str) -> pd.DataFrame:
    with open(file_path, "rb") as f:
        head = f.read(4000)

    is_zip_xlsx = head[:2] == b"PK"       # .xlsx real (es un zip)
    is_ole_xls = head[:2] == b"\xd0\xcf"  # .xls binario antiguo real

    sample_text = head.decode("utf-8", errors="ignore").lower()
    looks_html = "<html" in sample_text or "<!doctype" in sample_text or "<table" in sample_text

    if looks_html:
        tables = pd.read_html(file_path, header=None)
        if not tables:
            raise ValueError("El archivo parece HTML pero no encontré ninguna tabla dentro.")
        return tables[0]

    if is_zip_xlsx or is_ole_xls:
        return pd.read_excel(file_path, header=None)

    # Si no es zip/ole ni HTML, se trata como texto CSV.
    return pd.read_csv(file_path, header=None, engine="python")