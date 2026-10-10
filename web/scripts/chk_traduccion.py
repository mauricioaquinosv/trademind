"""
Guard de traduccion: falla si queda algun texto visible escrito a mano en la
interfaz, en vez de pasar por el diccionario ES/EN.

Existe porque el idioma se dio por terminado cuando solo se habian comprobado
las claves: que las 213 claves existieran y la app no mostrara errores. Eso es
cierto, pero no comprueba que no quede texto suelto en el JSX, y habia 28.

Uso:
    python web/scripts/chk_traduccion.py

Sale con codigo 1 si encuentra algo, para poder encadenarlo.
"""

import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

FICHEROS = [
    "app/page.tsx",
    "app/dashboard/page.tsx",
    "app/login/page.tsx",
    "app/components/Landing.tsx",
    "app/components/SummaryView.tsx",
    "app/components/AnalyticsView.tsx",
    "app/components/CfControls.tsx",
    "app/components/PanelAnimado.tsx",
    "app/components/AvisoImportacion.tsx",
    "app/components/CabeceraFlujo.tsx",
    "app/components/PasosFlujo.tsx",
    "app/components/PantallaPlan.tsx",
    "app/components/PantallaBienvenida.tsx",
    "app/components/PantallaPago.tsx",
    "app/components/PantallaFacturacion.tsx",
    "app/components/PantallaAccesoPausado.tsx",
    "app/plan/page.tsx",
    "app/pago/page.tsx",
    "app/facturacion/page.tsx",
    "app/facturacion/FacturacionInterna.tsx",
    "app/acceso-pausado/page.tsx",
    "app/acceso-pausado/PausaInterna.tsx",
    "app/bienvenida/page.tsx",
    "app/layout.tsx",
]

# Prefijos de utilidades de Tailwind, que no son texto.
PLACEHOLDER = re.compile(r"^(hover:|focus:|sm:|md:|lg:|xl:|2xl:|dark:|group-|peer-)")

# Nombres propios, marcas y valores que no se traducen.
PROPIO = re.compile(
    r"TradeMind|EURUSD|USDJPY|GBPUSD|XAUUSD|Facebook|Twitter|LinkedIn|"
    r"ReportHistory\.xlsx|"
    r"Moon|Sun|Star|var\(--|&nbsp;|^\s*$|^\d",
    re.I,
)

# Expresiones de codigo, no texto.
CODIGO = re.compile(r"[?=&|{}();]|\bt\.\w|^\s*(const|let|var|return|if|for|map|import|export)\b")

# Cadidas tecnicas que se leen igual en los dos idiomas. Estan aqui a proposito:
# permitir que se declaren una vez en el diccionario en vez de escribirlas a mano.
NEUTRAS = {
    "Hr", "Min", "Auto", "Swap", "P&L", "USD", "EUR", "MT5", "CSV", "XLSX", "ID", "FIFO",
    # Las extensiones de archivo son universales: traducirlas no aportaria nada
    # y solo abriria la puerta a escribirlas distintas en cada idioma.
    ".xlsx · .xls · .csv",
    # Etiqueta del grupo de botones que cambian de idioma. Es bilingue a proposito
    # y por eso es IGUAL en los dos idiomas: quien lee la pagina en cualquiera de
    # los dos tiene que reconocer las dos palabras. No es un texto sin traducir,
    # es un texto que no tiene traduccion. Ya estaba en LanguageSwitcher.tsx.
    "Idioma / Language",
}


defines = pathlib.Path(RAIZ / "lib/i18n/es.ts").read_text(encoding="utf-8")
diccionario = set(re.findall(r'^  "([^"]+)":', defines, re.M))


def revisar_linea(linea: str) -> list[str]:
    """Devuelve los textos visibles de una linea que no pasan por t()."""
    if linea.strip().startswith(("//", "*", "/*")):
        return []

    hallazgos = []

    # 1) Texto visible:  >texto<
    for m in re.finditer(r">([^<>{}]{2,60})<", linea):
        t = m.group(1).strip()
        if not re.search(r"[A-Za-z\u00C0-\u017F]{3}", t):
            continue
        if PLACEHOLDER.match(t) or PROPIO.search(t) or CODIGO.search(t):
            continue
        if t in NEUTRAS:
            continue
        hallazgos.append(t)

    # 2) Atributos que se ven
    for m in re.finditer(r'(?:title|placeholder|alt|aria-label)="([^"]{2,40})"', linea):
        t = m.group(1).strip()
        if (
            re.search(r"[A-Za-z\u00C0-\u017F]{3}", t)
            and not PLACEHOLDER.match(t)
            and not PROPIO.search(t)
            and t not in NEUTRAS
        ):
            hallazgos.append(t)

    # 3) Etiquetas de opcion:  label: "texto"
    for m in re.finditer(r'label:\s*"([^"]{2,40})"', linea):
        t = m.group(1).strip()
        if re.search(r"[A-Za-z\u00C0-\u017F]{3}", t) and not PLACEHOLDER.match(t):
            if t not in NEUTRAS:
                hallazgos.append(t)

    # 4) Texto suelto en una linea, entre etiquetas multilinea
    s = linea.strip()
    if re.fullmatch(r">[A-Za-z\u00C0-\u017F][^<>{}]{1,50}", s):
        t = s[1:].strip()
        if not PLACEHOLDER.match(t) and not PROPIO.search(t) and t not in NEUTRAS:
            hallazgos.append(t)

    return hallazgos


def main() -> int:
    total = 0
    for rel in FICHEROS:
        ruta = RAIZ / rel
        if not ruta.exists():
            print(f"  AVISO: no existe {rel}")
            continue
        lineas = ruta.read_text(encoding="utf-8").split("\n")
        for i, ln in enumerate(lineas, 1):
            for t in revisar_linea(ln):
                total += 1
                print(f"  SIN TRADUCIR  {rel}:{i}  {t!r}")

    # Claves usadas en el codigo que no existen en el diccionario.
    # El `t` debe ir suelto: si no, `createElement("a")` parece una llamada a t().
    Patron_Llamada = r'(?<![A-Za-z0-9_$])t\("([a-zA-Z][a-zA-Z0-9._]*)"'
    usadas = set()
    for rel in FICHEROS + ["lib/i18n/LanguageSwitcher.tsx"]:
        ruta = RAIZ / rel
        if ruta.exists():
            usadas |= set(re.findall(Patron_Llamada, ruta.read_text(encoding="utf-8")))
    huerfanas = sorted(u for u in usadas if u not in diccionario)

    print()
    if huerfanas:
        print(f"  CLAVES INEXISTENTES ({len(huerfanas)}):  " + ", ".join(huerfanas))

    if total == 0 and not huerfanas:
        print("  OK: no queda ninguna cadena fuera del diccionario.")
        return 0

    print(f"  TOTAL: {total} cadenas sin traducir")
    return 1


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.exit(main())
