"""
Tests de las contrasenas.

EL LIMITE DE 72 BYTES

bcrypt solo mira los primeros 72 bytes de una contrasena. Es un limite del
algoritmo, no de la libreria, y se manifiesta de DOS formas distintas:

  1. Entre 72 y 72 bytes, dos contrasenas distintas dan el MISMO hash. Escriba
     un caracter mas alla del 72 no protege nada, porque no se mira.
  2. De mas de 72 bytes, passlib lanza `PasswordSizeError`. Sin tratar, eso es un
     500 en el registro y en el login.

Lo de abajo comprueba las dos cosas. La primera es la que hacia sospechar que
"algo raro pasa con las contrasenas largas"; la segunda es la que realmente
reventaba.

El arreglo es el mismo en los dos casos: recortar a 72 bytes ANTES de pasar por
bcrypt. El usuario escribe la que quiera, nunca hay un 500, y no se finge que
una contrasena de 300 caracteres protege mas que una de 72.
"""

import pytest
from pydantic import ValidationError

from app.schemas import UserCreate
from app.security import MAX_BYTES_BCRYPT, hash_password, verify_password


# --- el recorte ----------------------------------------------------------


def test_una_contrasena_corta_no_se_toca():
    h = hash_password("normal123")
    assert verify_password("normal123", h)


def test_no_hay_500_con_una_contrasena_de_5000_caracteres():
    """Sin el recorte, esto revienta con PasswordSizeError."""
    larga = "a" * 5000
    h = hash_password(larga)  # si lanza, el test falla aqui
    assert verify_password(larga, h)


def test_no_hay_500_al_verificar_una_contrasena_enorme():
    """El login tambien tiene que aguantar: verificar es donde mas falla."""
    h = hash_password("a" * 100)
    assert verify_password("a" * 5000, h) in (True, False)


# --- la consecuencia de no mirar los bytes de mas ------------------------


def test_despues_de_72_bytes_no_aporta_nada():
    """ASI SE COMPRUEBA QUE EL LIMITE EXISTE Y QUE ESTA APLICADO.

    Si el recorte no estuviera, estas tres contrasenas NO darian el mismo hash y
    este test fallaria. Ese es el punto: documenta que el limite de bcrypt es
    real, para que nadie piense que una contrasena larguisima protege mas.
    """
    base = "a" * 72
    h = hash_password(base)

    assert verify_password("a" * 100, h), "100 caracteres deberian coincidir con 72"
    assert verify_password("a" * 80 + "b" * 20, h), "80a+20b deberia coincidir con 72"


def test_hasta_71_bytes_si_se_miran_todos():
    """Y aqui, antes del limite, si: dos distintas NO coinciden.

    Sin esta comprobacion, el test anterior pasaria tambien si el recorte
    estuviera mal hecho y todas las contrasenas dieran el mismo hash.
    """
    h = hash_password("a" * 71)
    assert not verify_password("a" * 71 + "b", h)


def test_el_recorte_es_en_BYTES_no_en_caracteres():
    """Un emoji ocupa 4 bytes. Contar caracteres dejaria pasar 72 emojis = 288."""
    # 18 emojis = 72 bytes exactos.
    emojis = "\U0001F600" * 18
    assert len(emojis) == 18
    assert len(emojis.encode("utf-8")) == MAX_BYTES_BCRYPT

    h = hash_password(emojis)
    assert verify_password(emojis, h)

    # 19 emojis se pasan de bytes y tienen que recortarse sin reventar.
    h2 = hash_password("\U0001F600" * 19)
    assert h2


def test_el_limite_son_72_bytes():
    assert MAX_BYTES_BCRYPT == 72


# --- el minimo de 8 ------------------------------------------------------


def test_una_contrasena_de_ocho_pasa():
    """Ocho es el minimo, asi que ocho tiene que entrar.

    Este test existia con el nombre de "se rechaza" y con una contrasena de 8
    caracteres, que es justo lo que NO hay que rechazar. Fallaba, y con razon:
    el nombre era lo que estaba mal.
    """
    u = UserCreate(email="a@b.com", password="12345678")
    assert len(u.password) == 8


def test_siete_caracteres_no_llegan():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", password="1234567")


def test_no_hay_maximo_en_el_schema():
    """A proposito: el recorte lo hace bcrypt, no el schema.

    Poner un maximo aqui daria un 422 con el mensaje en ingles de Pydantic, que
    es justo el problema que ya tenemos con los mensajes de validacion.
    """
    u = UserCreate(email="a@b.com", password="x" * 500)
    assert len(u.password) == 500


def test_la_contrasena_se_guarda_cifrada_nunca_en_claro():
    """Lo obvio, pero nunca hay que dejarlo de comprobar."""
    h = hash_password("micontrasenialarga123")
    assert "micontrasenialarga123" not in h
    assert h != "micontrasenialarga123"