"""
Tests de las MIGRACIONES de alembic.

POR QUE EXISTE ESTE FICHERO

Una tabla se anadio a `models.py` (`LoginFallido`, el freno del login) y se
olvido la migracion. Los tests PASABAN: `conftest.py` crea las tablas con
`Base.metadata.create_all()`, que las saca de los modelos y no pasa por alembic.
El build pasaba. El guard pasaba. Todo en verde.

El fallo solo aparece al arrancar contra una base de verdad: `alembic upgrade
head` no crea la tabla y el login revienta con un 500 en la pantalla de acceso.

QUE COMPRUEBA

  1. Cada tabla de `models.py` aparece en ALGUNA migracion.
  2. Todas las migraciones tienen `downgrade()`.
  3. La cadena de revisiones no esta rota: una sola cabeza, todos los
     `down_revision` existen.
  4. Las columnas coinciden entre el modelo y las migraciones.

El punto 4 tiene que mirar `create_table` Y `add_column`: la tabla `trades` se
creo con pocas columnas y las demas se fueron anadiendo con `add_column`. Si
solo se mirase `create_table`, faltarian casi todas y el test no serviria para
nada.
"""

import ast
import pathlib

from app.database import Base
from app import models  # noqa: F401  (registra los modelos en Base.metadata)

RAIZ = pathlib.Path(__file__).resolve().parent.parent
VERSIONS = RAIZ / "alembic" / "versions"


def _migraciones():
    """Cada migracion, con su codigo parseado."""
    salida = []
    for f in sorted(VERSIONS.glob("*.py")):
        if f.name.startswith("__"):
            continue
        salida.append((f, ast.parse(f.read_text(encoding="utf-8"))))
    return salida


def _llamadas(arbol, metodo: str):
    """Todas las llamadas a op.<metodo>(...) del arbol."""
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Call) and isinstance(nodo.func, ast.Attribute):
            if nodo.func.attr == metodo:
                yield nodo


def _tablas_creadas() -> set:
    tablas = set()
    for _, arbol in _migraciones():
        for llamada in _llamadas(arbol, "create_table"):
            if llamada.args:
                t = llamada.args[0]
                if isinstance(t, ast.Constant) and isinstance(t.value, str):
                    tablas.add(t.value)
    return tablas


def _tablas_anadidas() -> set:
    """Tablas a las que se les anade una columna con op.add_column()."""
    tablas = set()
    for _, arbol in _migraciones():
        for llamada in _llamadas(arbol, "add_column"):
            # add_column('trades', sa.Column(...))
            if not llamada.args:
                continue
            t = llamada.args[0]
            if isinstance(t, ast.Constant) and isinstance(t.value, str):
                tablas.add(t.value)
    return tablas


def _columnas_de_create_table(llamada: ast.Call) -> set:
    """Las columnas de un op.create_table(...).

    OJO: en las migraciones de este proyecto las columnas van como argumentos
    POSICIONALES (`op.create_table('users', sa.Column(...), sa.Column(...))`), no
    con nombre. Mirar solo los keywords daria una lista vacia y el test pasaria
    sin comprobar nada.
    """
    columnas = set()

    # Posicionales: el primero es el nombre de la tabla, el resto son columnas.
    for arg in llamada.args[1:]:
        if isinstance(arg, ast.Call) and arg.args:
            nombre = arg.args[0]
            if isinstance(nombre, ast.Constant) and isinstance(nombre.value, str):
                columnas.add(nombre.value)

    # Y tambien las que vinieran con nombre, por si alguien las escribiera asi.
    for kw in llamada.keywords:
        if kw.arg == "sa.Column" and isinstance(kw.value, ast.Call) and kw.value.args:
            nombre = kw.value.args[0]
            if isinstance(nombre, ast.Constant) and isinstance(nombre.value, str):
                columnas.add(nombre.value)

    return columnas


def _columnas_de_tabla(tabla: str) -> set:
    """Todas las columnas que las migraciones dan a una tabla.

    Se suman las de su `create_table` y las de todos los `add_column` que la
    nombren. Importa mirar las dos: `trades` se creo con pocas columnas.
    """
    columnas = set()

    for _, arbol in _migraciones():
        for llamada in _llamadas(arbol, "create_table"):
            if not llamada.args:
                continue
            t = llamada.args[0]
            if not (isinstance(t, ast.Constant) and t.value == tabla):
                continue
            columnas |= _columnas_de_create_table(llamada)

        for llamada in _llamadas(arbol, "add_column"):
            if len(llamada.args) < 2:
                continue
            t = llamada.args[0]
            if not (isinstance(t, ast.Constant) and t.value == tabla):
                continue
            col = llamada.args[1]
            if isinstance(col, ast.Call) and col.args:
                nombre = col.args[0]
                if isinstance(nombre, ast.Constant):
                    columnas.add(nombre.value)

    return columnas


def _revisiones():
    salida = []
    for _, arbol in _migraciones():
        rev = down = None
        for nodo in ast.walk(arbol):
            if isinstance(nodo, ast.AnnAssign) and isinstance(nodo.target, ast.Name):
                if nodo.target.id == "revision" and isinstance(nodo.value, ast.Constant):
                    rev = nodo.value.value
                if nodo.target.id == "down_revision":
                    v = nodo.value
                    down = v.value if isinstance(v, ast.Constant) else None
        salida.append((rev, down))
    return salida


# --- 1. toda tabla tiene su migracion -----------------------------------


def test_toda_tabla_del_modelo_tiene_migracion():
    """EL TEST QUE HABRIA EVITADO EL FALLO.

    Una tabla en `models.py` sin `create_table` en ninguna migracion significa
    que en una base creada con alembic no existira, y el primer uso petara.
    """
    en_modelos = set(Base.metadata.tables)
    en_migraciones = _tablas_creadas()

    faltan = en_modelos - en_migraciones
    assert not faltan, (
        f"Estas tablas estan en models.py pero en NINGUNA migracion: {sorted(faltan)}.\n"
        f"En una base creada con `alembic upgrade head` no existiran.\n"
        f"Crea la migracion con `alembic revision --autogenerate -m ...` contra una base\n"
        f"que este al dia de las migraciones, NO contra la de desarrollo: esa esta creada\n"
        f"con create_all y ya tiene la tabla, asi que autogenerate no veria nada que hacer."
    )


# --- 2. toda migracion se puede deshacer ---------------------------------


def test_toda_migracion_tiene_downgrade():
    """Sin `downgrade` no se puede volver atras, y un despliegue que falla a
    mitad se queda sin salida."""
    sin_downgrade = [
        f.name for f, arbol in _migraciones()
        if not any(isinstance(n, ast.FunctionDef) and n.name == "downgrade"
                   for n in ast.walk(arbol))
    ]

    assert not sin_downgrade, (
        f"Migraciones sin downgrade(): {sin_downgrade}.\n"
        f"Un despliegue que falle a mitad no tendria forma de volver atras."
    )


# --- 3. la cadena esta entera --------------------------------------------


def test_la_cadena_no_esta_rota():
    """Cada `down_revision` tiene que existir, y solo puede haber una cabeza.

    Dos cabezas hacen que `alembic upgrade head` falle con "multiple heads", y eso
    para el despliegue, no para el desarrollo.
    """
    revs = [r for r, _ in _revisiones() if r]
    downs = {d for _, d in _revisiones() if d}

    assert len(revs) == len(set(revs)), f"hay revisiones repetidas: {revs}"

    sueltas = downs - set(revs)
    assert not sueltas, f"estas down_revision no existen: {sorted(sueltas)}"

    cabezas = [r for r in revs if r not in downs]
    assert len(cabezas) == 1, (
        f"hay {len(cabezas)} cabezas de migracion: {cabezas}. "
        f"`alembic upgrade head` falla si hay mas de una."
    )


def test_la_primera_migracion_no_tiene_padre():
    revs = [r for r, d in _revisiones() if r]
    downs = {d for _, d in _revisiones() if d}
    raices = [r for r in revs if r not in downs]

    assert len(raices) == 1, f"deberia haber una migracion raiz, hay {len(raices)}: {raices}"


# --- 4. las columnas coinciden -------------------------------------------


def test_las_columnas_coinciden_entre_el_modelo_y_las_migraciones():
    """El fino: si se anade una columna al modelo y no a la migracion, el test de
    "la tabla tiene migracion" sigue pasando y el fallo se cuela igual.

    Se miran las columnas de `create_table` Y las de `add_column`, porque la
    tabla `trades` se creo con pocas y las demas se fueron anadiendo luego.
    """
    problemas = []
    para_revisar = []

    for tabla, meta in Base.metadata.tables.items():
        if tabla not in _tablas_creadas():
            continue

        cols_migracion = _columnas_de_tabla(tabla)
        cols_modelo = {c.name for c in meta.columns}

        solo_modelo = cols_modelo - cols_migracion
        if solo_modelo:
            para_revisar.append((tabla, sorted(solo_modelo), sorted(cols_migracion), sorted(cols_modelo)))

    assert not para_revisar, (
        "Columnas que estan en el modelo y en ninguna migracion:\n"
        + "\n".join(
            f"  {t}: faltan {f}   (migracion tiene {m}, modelo tiene {mod})"
            for t, f, m, mod in para_revisar
        )
        + "\nSi anades una columna al modelo, anadela tambien a la migracion."
    )


def test_la_tabla_del_freno_existe_de_verdad():
    """El caso concreto que fallo. Se deja explicito para que se entienda por
    que existe este fichero entero."""
    assert "login_fallidos" in Base.metadata.tables, "el modelo no tiene la tabla"
    assert "login_fallidos" in _tablas_creadas(), (
        "FALTA LA MIGRACION de login_fallidos. Sin ella, el login da un 500 en "
        "cualquier base creada con alembic."
    )


# --- 5. la migracion del freno esta bien escrita ------------------------


def test_los_indices_de_login_fallidos_estan_en_la_migracion():
    """El freno consulta por email, por ip y limpia por fecha. Sin los indices,
    cada login seria un recorrido entero de la tabla."""
    fuente = "\n".join(f.read_text(encoding="utf-8") for f, _ in _migraciones())
    for col in ("email", "ip", "cuando"):
        assert f"ix_login_fallidos_{col}" in fuente, f"falta el indice de {col}"


def test_las_columnas_de_login_fallidos_son_not_null():
    """Una fila sin email o sin ip no sirve para contar nada."""
    for _, arbol in _migraciones():
        for llamada in _llamadas(arbol, "create_table"):
            if not llamada.args:
                continue
            t = llamada.args[0]
            if not (isinstance(t, ast.Constant) and t.value == "login_fallidos"):
                continue
            for kw in llamada.keywords:
                if kw.arg != "sa.Column" or not isinstance(kw.value, ast.Call):
                    continue
                nombre = kw.value.args[0].value
                opcionales = {k.arg: k.value for k in kw.value.keywords}
                nullable = opcionales.get("nullable")
                valor = nullable.value if isinstance(nullable, ast.Constant) else None
                assert valor is False, f"la columna {nombre} deberia ser NOT NULL"
            return  # solo hay una migracion que la crea
    raise AssertionError("no se ha encontrado el create_table de login_fallidos")