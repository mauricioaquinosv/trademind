import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt solo mira los PRIMEROS 72 BYTES de la contrasena. Es un limite del
# algoritmo, no de la libreria, y se nota de dos formas:
#
#   - de 72 a 72 bytes: dos contrasenas distintas dan el MISMO hash. Comprobado:
#     "a"*100, "a"*72 y "a"*80 + "b"*20 verifican todas contra el mismo hash.
#     Es decir, escribir un caracter mas alla del 72 no protege NADA.
#   - de mas de 72 bytes: passlib lanza PasswordSizeError, y eso sin tocar es un
#     500 en el registro y en el login. Comprobado con 5000 caracteres.
#
# Por las dos cosas, una contrasena se recorta a 72 bytes ANTES de pasar por
# bcrypt. Asi el usuario puede escribir la que quiera, nunca hay un 500, y se
# acepta el mismo limite del algoritmo sin fingir que protege mas de lo que
# protege.
#
# El aviso al usuario va en el frontend (el login pide 8 caracteres minimos). El
# backend recorta en silencio a proposito: una contrasena de 100 caracteres no es
# un error de seguridad que haya que rechazar, es una contrasena.
MAX_BYTES_BCRYPT = 72


def _a_bcrypt(password: str) -> str:
    """Deja la contrasena en 72 bytes, que es lo que bcrypt mira."""
    # A bytes, porque el limite son BYTES y no caracteres: un emoji ocupa 4, y
    # contar caracteres dejaria pasar 72 emojis = 288 bytes.
    crudo = (password or "").encode("utf-8")
    if len(crudo) <= MAX_BYTES_BCRYPT:
        return password
    return crudo[:MAX_BYTES_BCRYPT].decode("utf-8", errors="ignore")


def hash_password(password: str) -> str:
    return pwd_context.hash(_a_bcrypt(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_a_bcrypt(plain_password), hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])