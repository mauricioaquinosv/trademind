"""
Tests del limite de tamaño en la subida.

POR QUE EXISTE

`shutil.copyfileobj` copiaba el archivo entero al disco sin mirar. Con un
archivo grande, cualquiera que.Subiese uno llenaba el servidor. Es el fallo mas
barato de aprovechar de todos los que quedaban.

LO QUE SE COMPRUEBA

  1. Un archivo de tamano normal entra igual que antes.
  2. Uno que se pasa del tope se rechaza con el codigo correcto.
  3. El rechazo es de TIPO 413, no un 400 generico: el usuario tiene que poder
     distinguir "el archivo esta mal" de "el archivo pesa demasiado".
  4. Al rechazar, no queda el temporal a medias. Este es el detalle que mas
     cuesta ver y mas disco come: si el corte ocurre a mitad de la copia y el
     temporal no se borra, cada intento deja un trozo behind.
  5. El `Content-Length` no basta: si el cliente miente sobre el tamaño, el
     conteo real tiene que cortarlo igual.
"""

import io
import os
import tempfile

import pytest

from conftest import detalle

from app.trades import TAMANO_MAXIMO, _copiar_con_tope

MT5 = "sample_data/ReportHistory-35023263.xlsx"


def _subir(client, cuenta, contenido: bytes, nombre="reporte.xlsx"):
    return client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": (nombre, io.BytesIO(contenido), "application/octet-stream")},
    )


# --- el limite, en aislamiento -------------------------------------------


def test_el_tope_es_25_mb():
    """Si alguien cambia el numero, este test salta. A proposito.

    25 MB es generoso para un reporte de MT5: uno con años de historial sigue
    siendo un Excel de un par de megas. Bajarlo dejaria fuera a los usuarios que
    llevan mucho tiempo registrando.
    """
    assert TAMANO_MAXIMO == 25 * 1024 * 1024


def test_copiar_un_archivo_normal_no_falla(tmp_path):
    destino = tmp_path / "salida.xlsx"
    with open(destino, "wb") as f:
        _copiar_con_tope(io.BytesIO(b"x" * 1000), f, TAMANO_MAXIMO)
    assert destino.stat().st_size == 1000


def test_copiar_exactamente_el_tope_pasa(tmp_path):
    """El tope es un maximo, no un minimo: justo en el limite tiene que entrar."""
    destino = tmp_path / "salida.bin"
    with open(destino, "wb") as f:
        _copiar_con_topo_exacto(f, 1000)
    assert destino.stat().st_size == 1000


def _copiar_con_topo_exacto(f, n: int):
    """Escribe n bytes justos, que es el caso limite."""
    from app.trades import _copiar_con_tope

    _copiar_con_tope(io.BytesIO(b"x" * n), f, n)


def test_copiar_un_byte_mas_que_el_tope_falla(tmp_path):
    destino = tmp_path / "salida.bin"
    with pytest.raises(Exception):
        with open(destino, "wb") as f:
            _copiar_con_tope(io.BytesIO(b"x" * 1001), f, 1000)


def test_al_fallar_no_escribe_mas_alla_del_tope(tmp_path):
    """Lo importante: se PARA, no copia entero y luego avisa.

    Si se comprobara al final, el archivo de 4 GB ya estaria en el disco cuando
    se dice que es demasiado grande, y el limite no habria servido de nada.
    """
    from app import errors as errores

    destino = tmp_path / "salida.bin"
    with pytest.raises(Exception):
        with open(destino, "wb") as f:
            _copiar_con_tope(io.BytesIO(b"x" * (5 * 1024 * 1024)), f, 1024)

    # El bloque es de 64 KB, asi que como mucho se escribe un bloque de mas.
    assert destino.stat().st_size <= 128 * 1024


def test_el_codigo_de_error_es_el_del_tamano():
    from app import errors as errores

    assert errores.FILE_TOO_LARGE == "file_too_large"


# --- el limite, por el endpoint -----------------------------------------


def test_un_archivo_normal_sigue_entrando(client, cuenta):
    """Lo de siempre no puede cambiarse al anadir un limite."""
    with open(MT5, "rb") as f:
        r = _subir(client, cuenta, f.read())

    assert r.status_code == 200
    assert r.json()["trades_guardados"] == 20


def test_un_archivo_grande_se_rechaza(client, cuenta, monkeypatch):
    """Se baja el tope a pelo para no subir 25 MB de verdad en un test."""
    import app.trades as modulo

    monkeypatch.setattr(modulo, "TAMANO_MAXIMO", 1024)

    grande = b"x" * (64 * 1024)  # 64 KB, muy por encima del tope de 1 KB
    r = _subir(client, cuenta, grande)

    assert r.status_code == 413
    assert detalle(r).code == "file_too_large"


def test_lo_que_se_rechaza_no_se_importa(client, cuenta, db_session, monkeypatch):
    from app.models import Trade

    import app.trades as modulo

    monkeypatch.setattr(modulo, "TAMANO_MAXIMO", 1024)
    _subir(client, cuenta, b"x" * (64 * 1024))

    assert db_session.query(Trade).count() == 0


def test_rechazar_no_deja_temporales_en_el_disco(client, cuenta, monkeypatch, tmp_path):
    """El detalle que mas cuesta ver y mas disco come.

    El corte ocurre a mitad de la copia, con el temporal ya escrito a medias. Si
    no se borrara, cada intento de subir un archivo enorme dejaria un trozo, y
    eso es un temporal que se come el disco poco a poco sin que nadie lo note.
    """
    import app.trades as modulo

    monkeypatch.setattr(modulo, "TAMANO_MAXIMO", 1024)
    # `tempfile.tempdir` es un atributo del modulo, no un modulo: por eso se
    # cambia con setattr y no con monkeypatch.setpath.
    monkeypatch.setattr(tempfile, "tempdir", str(tmp_path))

    antes = set(os.listdir(tmp_path))
    for _ in range(3):
        _subir(client, cuenta, b"x" * (64 * 1024))
    despues = set(os.listdir(tmp_path))

    nuevos = despues - antes
    assert not nuevos, f"han quedado temporales: {nuevos}"


def test_la_cabecera_content_length_no_alcanza_sola(client, cuenta, monkeypatch):
    """Si el cliente miente sobre el tamano, el conteo real tiene que cortarlo.

    `Content-Length` la pone el cliente. Compruebarla es barato y evita copiar
    nada, pero no puede ser la unica defensa: un atacante simplemente declara
    1 KB y manda 4 GB.
    """
    import app.trades as modulo

    monkeypatch.setattr(modulo, "TAMANO_MAXIMO", 1024)

    # Se manda declaring 10 bytes pero van 64 KB.
    r = client.post(
        "/trades/upload",
        params={"account_id": str(cuenta.id)},
        files={"file": ("reporte.xlsx", io.BytesIO(b"x" * (64 * 1024)), "application/octet-stream")},
        headers={"content-length": "10"},
    )

    assert r.status_code == 413
    assert detalle(r).code == "file_too_large"