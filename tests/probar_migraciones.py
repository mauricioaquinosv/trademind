"""
PRUEBA DE LAS MIGRACIONES CONTRA UNA BASE DE DATOS DE VERDAD.

POR QUE ESTO NO ESTA EN LOS TESTS NORMALES

Los tests usan `Base.metadata.create_all()`, que crea las tablas leyendo los
modelos. Alembic no pasa por ahi. Ese fue exactamente el agujero por el que
`login_fallidos` llego a models.py sin migracion: todo en verde y, al arrancar
contra una base real, un 500.

Aqui no se usa create_all. Se crea una base VACIA, se sube toda la cadena de
migraciones y se comprueba que el resultado es lo que dicen los modelos.

COMO SE USA

    python tests/probar_migraciones.py

No es un test de pytest a proposito: necesita una base que se pueda tirar y
tocar, y soltar una base de pruebas a mitad dejaria los tests en un estado raro.
Se ejecuta a mano, y sobre todo ANTES de desplegar.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text

load_dotenv()

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOMBRE = os.getenv("TEST_MIGRACIONES_DB", "trademind_migraciones")


def main() -> int:
    from alembic import command
    from alembic.config import Config

    principal = os.environ["DATABASE_URL"]
    destino = principal.rsplit("/", 1)[0] + "/" + NOMBRE

    # `alembic/env.py` hace `config.set_main_option("sqlalchemy.url",
    # os.getenv("DATABASE_URL"))`, o sea que IGNORA lo que se le pase por
    # `cfg.set_main_option`. Sin esto, la migracion se ejecutaba contra la base
    # de DESARROLLO en vez de contra la de prueba, y esta comprobaba una base
    # vacia dando "FALTAN: todas las tablas".
    #
    # `load_dotenv()` no pisa las variables que ya estan puestas, asi que ponerla
    # aqui antes de tocar alembic es suficiente.
    os.environ["DATABASE_URL"] = destino

    admin = create_engine(principal, isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        c.execute(text(f'DROP DATABASE IF EXISTS "{NOMBRE}"'))
        c.execute(text(f'CREATE DATABASE "{NOMBRE}"'))
    admin.dispose()

    cfg = Config(os.path.join(RAIZ, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(RAIZ, "alembic"))

    try:
        print("Subiendo TODA la cadena de migraciones en una base vacia...")
        command.upgrade(cfg, "head")

        motor = create_engine(destino)
        tablas = set(inspect(motor).get_table_names()) - {"alembic_version"}
        motor.dispose()

        print(f"\nTablas creadas: {sorted(tablas)}")

        from app.database import Base
        from app import models  # noqa: F401

        esperadas = set(Base.metadata.tables)
        faltan = esperadas - tablas
        sobran = tablas - esperadas

        if faltan:
            print(f"\nFALTAN: {sorted(faltan)}")
            print("El codigo usara estas tablas y no existiran.")
            return 1
        if sobran:
            print(f"\nSobran (no estan en models.py): {sorted(sobran)}")
            return 1

        print("\nLas cuatro tablas del modelo estan. Ahora se baja y se sube otra vez:")

        command.downgrade(cfg, "base")
        motor = create_engine(destino)
        tras_bajar = set(inspect(motor).get_table_names()) - {"alembic_version"}
        motor.dispose()

        if tras_bajar:
            print(f"  ERROR: quedan tablas tras downgrade: {sorted(tras_bajar)}")
            return 1
        print("  downgrade base: bien, no queda ninguna tabla")

        command.upgrade(cfg, "head")
        motor = create_engine(destino)
        de_nuevo = set(inspect(motor).get_table_names()) - {"alembic_version"}
        motor.dispose()

        if de_nuevo != esperadas:
            print(f"  ERROR: al subir de nuevo hay {sorted(de_nuevo)}")
            return 1
        print("  upgrade head otra vez: bien, las mismas tablas")

        print("\nTODO CORRECTO: la cadena crea exactamente lo que dice models.py")
        return 0

    finally:
        admin = create_engine(principal, isolation_level="AUTOCOMMIT")
        with admin.connect() as c:
            c.execute(text(f'DROP DATABASE IF EXISTS "{NOMBRE}"'))
        admin.dispose()


if __name__ == "__main__":
    sys.exit(main())