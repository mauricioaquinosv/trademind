"""
Errores de la API: codigo + texto en espanol.

POR QUE UN CODIGO Y NO SOLO TEXTO. El backend no sabe en que idioma esta el
usuario: no tiene ni cookie ni cabecera que se lo diga, y meterle una seria
arrastrar el idioma a cada endpoint. Ademas, si el backend mandara el texto ya
traducido, cada mensaje existiria en dos ficheros de Python y no habria forma de
comprobar que estan los dos.

Lo que hace es devolver un CODIGO estable mas el texto en espanol, que es lo
que vera un humano si abre /docs en el navegador:

    {"detail": {"code": "account_has_trades", "n": 12, "text": "..."}}

El frontend traduce el codigo con su diccionario. El texto se queda para dos
cosas: el que depura con curl, y el respaldo cuando el frontend no conoce el
codigo y no puede inventarse nada.

Un codigo nuevo que el frontend no conozca no rompe nada: cae al texto en
espanol. Es degradable, que es como tiene que ser un contrato de API.
"""

from fastapi import HTTPException


def error(codigo: str, texto: str, status_code: int = 400, **extra) -> HTTPException:
    """
    Construye el HTTPException de un error de API.

    `texto` es el mensaje en espanol, para quien lee la respuesta sin pasar por
    la interfaz. `extra` son parametros para que el frontend pueda componer el
    mensaje en su idioma (por ejemplo, cuantas operaciones tiene la cuenta).
    """
    return HTTPException(
        status_code=status_code,
        detail={"code": codigo, "text": texto, **extra},
    )


class FileError(ValueError):
    """
    Error de lectura de un archivo, con su codigo.

    Hereda de ValueError para que los `except ValueError` que ya habia en el
    endpoint sigan capturandolo, pero anade el codigo que necesita la interfaz
    para traducirlo. Si solo fuera un ValueError con texto, el mensaje llegaria
    al usuario en español pase lo que pase con el idioma.
    """

    def __init__(self, codigo: str, texto: str, **extra):
        super().__init__(texto)
        self.codigo = codigo
        self.texto = texto
        self.extra = extra


# --- codigos ---------------------------------------------------------------
# El prefijo dice de donde viene, para no tener una bolsa de nombres sin origen:
#   account_*  cuentas
#   trade_*    operaciones
#   auth_*     registro y login
#   file_*     subida de archivos
#   session_*  validacion del token
#   validation_*  reglas de los datos de entrada

AUTH_EMAIL_TAKEN = "auth_email_taken"
AUTH_BAD_CREDENTIALS = "auth_bad_credentials"
AUTH_TOO_MANY_ATTEMPTS = "auth_too_many_attempts"
SESSION_INVALID = "session_invalid"

ACCOUNT_NOT_FOUND = "account_not_found"
ACCOUNT_HAS_TRADES = "account_has_trades"

TRADE_NOT_FOUND = "trade_not_found"

FILE_BAD_EXTENSION = "file_bad_extension"
FILE_EMPTY = "file_empty"
FILE_NO_POSITIONS = "file_no_positions"
FILE_HTML_NO_TABLE = "file_html_no_table"
FILE_UNREADABLE = "file_unreadable"
FILE_BAD_TEMPLATE = "file_bad_template"
FILE_BAD_DATE = "file_bad_date"
FILE_TOO_LARGE = "file_too_large"

VALIDATION_EMPTY_NAME = "El nombre de la cuenta no puede estar vacío"
VALIDATION_NEGATIVE_BALANCE = "El balance inicial no puede ser negativo"
