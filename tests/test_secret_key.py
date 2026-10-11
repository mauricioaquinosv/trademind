"""
SECRET_KEY: la app debe negarse a arrancar sin ella.

Antes arrancaba bien y fallaba con un 500 en el primer login. Se prueba en un
proceso aparte porque la comprobacion ocurre al importar app.security, y ese
modulo ya esta importado en los demas tests.

El valor se pone VACIO (no se borra) para que load_dotenv() no lo rellene con
el de un .env local: load_dotenv no pisa variables que ya existen.
"""

import os
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def _importar_security(secret_key: str) -> subprocess.CompletedProcess:
    entorno = {**os.environ, "SECRET_KEY": secret_key}
    return subprocess.run(
        [sys.executable, "-W", "error::UserWarning", "-c", "import app.security"],
        cwd=RAIZ,
        env=entorno,
        capture_output=True,
        text=True,
    )


def test_sin_secret_key_la_app_no_arranca():
    resultado = _importar_security("")
    assert resultado.returncode != 0
    assert "SECRET_KEY no esta definida" in resultado.stderr


def test_con_secret_key_larga_arranca():
    resultado = _importar_security("x" * 48)
    assert resultado.returncode == 0, resultado.stderr


def test_una_secret_key_corta_avisa_pero_no_bloquea():
    # Con -W error el aviso se vuelve excepcion: asi se comprueba que existe.
    resultado = _importar_security("corta")
    assert resultado.returncode != 0
    assert "menos de 32 caracteres" in resultado.stderr
