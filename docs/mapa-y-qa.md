# MAPA DEL SITIO Y PLAN DE QA

Que esta escrito y por que.

Este fichero tiene dos cosas: **donde esta cada pieza** (para no perder tiempo
buscando) y **que hay que comprobar** (la lista de QA). La lista esta pensada
para tacharla, no para leerla de arriba abajo.

No es un plan de trabajo ni una lista de prioridades. El orden es tuyo.

---

# PARTE 1 — EL MAPA

## 1. Las tres paginas

Solo hay tres rutas. Next.js App Router, todo renderizado en el servidor.

| Ruta | Fichero | Que es | Acceso |
|---|---|---|---|
| `/` | `web/app/page.tsx` | La landing publica | Todo el mundo |
| `/login` | `web/app/login/page.tsx` | Iniciar sesion | Todo el mundo |
| `/dashboard` | `web/app/dashboard/page.tsx` | La aplicacion | Con token |

Lo que NO existe todavia: registro, recuperar contrasena, cerrar sesion.

### `/` — la landing

Seis bloques, en este orden:

1. Navegacion (con el selector de idioma, "Log in" y "Create account")
2. Hero — titulo, subtitulo, dos botones y tres avales
3. El problema — tres tarjetas
4. Como funciona — tres pasos
5. El producto — las tarjetas grandes con el panel de verdad
6. Como importar, preguntas frecuentes (seis) y cierre

Los ocho botones llevan a algun sitio: "Log in" a `/login?modo=entrar`, "Create
account" a `/login`, y los de seccion a sus anclas (`#producto`, `#importar`,
`#preguntas`, `#como`).

### `/login` — entrar y registrarse

Una sola pantalla con dos modos. Sin parametro se abre en registro; con
`?modo=entrar`, en entrar. El enlace de abajo cambia de uno a otro. Tras
registrarse **entra solo**, sin escribir los datos dos veces.

El fondo es el de la landing: la misma rejilla turquesa que sigue al raton. El
boton de Google **avisa de que aun no esta**; Apple se descarto por coste (99 USD
al ano) y ya no aparece.

### `/dashboard` — la aplicacion

Una sola pagina con cinco vistas, que se cambian con los botones de la barra
lateral. **No son cinco rutas: es la misma pagina cambiando de contenido.** Por
eso la vista de "trades" sigue existiendo aunque no la mires, y por eso un
mensaje puesto dentro de una vista puede no verse nunca.

| Vista | Que tiene |
|---|---|
| Resumen | Las ocho cifras, el calendario mensual, el balance |
| Trades | La tabla, los filtros, la paginacion, el modal de anadir y editar |
| Cuentas | Crear, editar y borrar cuentas |
| Analytics | Rendimiento por simbolo, con selector de metrica y de orden |
| Importar | Subir archivo o rellenar la plantilla |

Encima de todo, pero **fuera** de las vistas: el aviso de operaciones que no se
han importado. Vive ahi a proposito.

## 2. La API

Tres ficheros, tres prefijos. `app/main.py` los monta y anade el CORS.

| Prefijo | Fichero | Que hace |
|---|---|---|
| `/auth` | `auth.py` | `register`, `login` |
| `/accounts` | `accounts.py` | crear, listar, ver, editar, borrar |
| `/trades` | `trades.py` | `upload`, listar, crear, editar, borrar |

Hay un endpoint mas, `/health`, para comprobar que el backend esta vivo.

**Ninguno de los 13 esta protegido con sesion propia**: cada uno pide el token a
mano. El que filtra las cuentas de otro usuario es el `get_current_user`, no la
ruta.

### Los 13 codigos de error

Viven en `app/errors.py`. El backend **no manda frases**, manda codigos; el
cliente los traduce. Esto es deliberado: si el backend mandara el texto ya
escrito, cada mensaje existiria en dos ficheros de Python y no habria forma de
comprobar que estan los dos idiomas.

```
auth_email_taken        auth_bad_credentials      session_invalid
account_not_found       account_has_trades        trade_not_found
file_bad_extension      file_empty                file_no_positions
file_html_no_table      file_unreadable           file_bad_template
file_bad_date
```

## 3. Los ficheros que importan

Si algo se rompe, mira estos primero. Son el cuello de botella.

| Fichero | Que lleva |
|---|---|
| `app/parsers/mt5_parser.py` | Lee el reporte de MT5. Dice de que fila salio cada operacion |
| `app/parsers/manual_template_parser.py` | Lee la plantilla de Excel |
| `app/parsers/file_reader.py` | Decide como abrir el fichero segun su extension |
| `app/import_validacion.py` | Separa las operaciones buenas de las malas. Solo codigos |
| `app/schemas.py` | Valida lo que llega del formulario |
| `app/errors.py` | Los 13 codigos y como se forman |

## 4. La traduccion

Dos ficheros, y **el español manda**: su tipo define que claves existen, y el
ingles esta tipado contra el. Si anades una clave en el español y no la
traduces, TypeScript falla al compilar. Es imposible que se escape sin que se
note.

| Fichero | Que es |
|---|---|
| `web/lib/i18n/es.ts` | La fuente de verdad |
| `web/lib/i18n/en.ts` | Tipado contra el anterior |
| `web/lib/i18n/config.ts` | La logica, sin dependencias de React |
| `web/lib/i18n/LocaleProvider.tsx` | El contexto de React |
| `web/lib/i18n/apiErrors.ts` | Traduce los codigos de error |
| `web/lib/i18n/importRechazos.ts` | Traduce los codigos de rechazo |

**El idioma se lee en el servidor**, de una cookie. Por eso la primera pintura
ya sale en el idioma correcto: no hay destello a espanol cuando estas en ingles.

**El guard de traduccion** (`npm run test:traduccion`) falla si queda una
palabra visible escrita a mano en vez de pasar por el diccionario. Vigila nueve
ficheros.

## 5. Donde se guarda

Todo en `localStorage`, en el navegador:

| Clave | Que guarda |
|---|---|
| `token` | El token de sesion |
| `trademind_current_account` | La cuenta activa |
| `trademind_theme` | Claro u oscuro |
| `trademind_locale` | El idioma (tambien en cookie) |
| `trademind_columns` | Que columnas se ven en la tabla |

---

# PARTE 2 — LO QUE HAY QUE COMPROBAR

## Lo primero: lo que sigue bloqueando

Ya no esta lo del registro: **probado de punta a punta**, cuenta creada, sesion
iniciada sola y entrada al dashboard. Lo que queda:

- [ ] **No existen los terminos ni la politica de privacidad**, y el login dice
      que los aceptas (`login.terms`). Solo hay tres rutas: `/`, `/login` y
      `/dashboard`. Es lo unico de esta lista que no se resuelve solo el dia de
      publicar.

      **LO QUE FALTA RELLENAR (pendiente a proposito):** los tres documentos se
      pueden escribir casi enteros, pero hay tres datos que **no se pueden
      inventar**. Cuando llegue el momento de escribirlos, estan aqui:

      1. **Nombre** del titular o de la empresa, y si tiene **NIF**
      2. **Email de contacto** (si es el mismo que el del producto, se pone el mismo)
      3. **Pais o comunidad donde se esta**, porque de ahi depende que ley se
         aplica y por tanto que hay que incluir

      Mientras tanto, **no escribir nada de esto**: un aviso legal con datos
      inventados es peor que no tener ninguno.
- [ ] **No hay cerrar sesion.** El boton de la esquina del dashboard solo cambia
      el tema.
- [ ] **"He olvidado mi contrasena"** es `href="#"`.
- [ ] **Google** avisa de que aun no esta. Sin decision.
- [ ] **Los mensajes de validacion de Pydantic** llegan en ingles fijo.

## A. La landing

- [ ] Los ocho botones llevan a su sitio: "Log in" a `/login?modo=entrar`,
      "Create account" a `/login`, y los cuatro de seccion a sus anclas
- [ ] El selector de idioma cambia **todo**, las cifras del panel incluidas
- [ ] Al cambiar de idioma no hay destello: la primera pintura ya sale bien
- [ ] Los bloques se ven completos, sin recortes raros, a 1440, 1200, 900, 760,
      620, 520 y 375 px. Los cortes de columna estan en 900, 760, 620 y 520
- [ ] El panel de metricas cuenta al pasar el raton y se para al salir
- [ ] Las cifras del panel se ve que son de ejemplo (hoy **no se dice**, y
      Claude quito el aviso porque el diseño no lo traia)
- [ ] El aviso legal se lee entero, sin cortarse
- [ ] Las seis preguntas frecuentes se abren y se cierran
- [ ] El boton de Google es de la marca y lleva el logotipo bien

## A3. Seguridad y robustez del backend

Lista revisada punto por punto contra el codigo, el 10 oct. Cada uno lleva su
estado REAL, no el que parecia.

| Punto | Estado |
|---|---|
| `SECRET_KEY` sin validar | **pendiente** |
| Contrasenas: minimo y limite de bcrypt | **resuelto** |
| Limite del tamano de la subida | **resuelto** |
| Limite de intentos en el login | **resuelto** |
| Token en `localStorage` | **a decision** |
| `GET /trades/` sin paginar | **pendiente** |
| Importes en `Float` | **a decision** |
| Postgres expone el 5432 | **pendiente** |

### Lo que se ha resuelto

- [x] **Contrasenas.** `UserCreate.password` es ahora `Field(min_length=8)`, que
      es lo que ya pedia el navegador; asi tambien queda protegido quien llame a
      la API directamente.
- [x] **El limite de 72 bytes de bcrypt, que era un 500 real.** Confirmado y
      probado: con mas de 72 bytes, `passlib` lanza `PasswordSizeError`. Sin
      tratar, una contrasena larga decia "500 Internal Server Error" al
      registrarse o al entrar. Y entre 72 y 72 bytes, dos contrasenas distintas
      dan el MISMO hash: escribir un caracter mas alla del 72 no protege nada.

      Ahora `_a_bcrypt` recorta a 72 bytes ANTES de pasar por bcrypt. El usuario
      escribe la que quiera, nunca hay un 500, y no se finge que una contrasena
      de 300 caracteres protege mas que una de 72. El recorte es en BYTES, no en
      caracteres, porque un emoji ocupa cuatro.

- [x] **Tope de 25 MB** en la subida. Corta al copiar y mira `Content-Length`.
- [x] **10 intentos y 15 minutos** en el login, contados por email y por IP.

### Lo que sigue pendiente

- [ ] **`SECRET_KEY` se valida al arrancar.** Hoy `security.py:10` es
      `os.getenv("SECRET_KEY")` y ya. Si falta, la app arranca bien y revienta en
      el primer login. Lo que hay que hacer no es un 500 mas claro: es **fallar
      al arrancar**, que es cuando se arregla.
- [ ] **`GET /trades/` devuelve todas las operaciones sin paginar.** La paginacion
      se hace en el navegador. Con 20 operaciones no se nota; con cinco mil, el
      `GET` pesa y el navegador se atasca. Y no es solo rendimiento: es un payload
      que puede acabar siendo megabytes.
- [ ] **Postgres no expone el 5432.** Sigue siendo `"5432:5432"` en
      `docker-compose.yml:15`, o sea que abre a todas las interfaces. En un
      servidor hay que poner `127.0.0.1:5432:5432`.
- [ ] **`version: "3.9"` de `docker-compose.yml` está obsoleto** y avisa. Es
      cosmetico: la version ya no hace falta y Docker Compose moderno la ignora.

### Los dos que son decision, no fallo

- [ ] **El token va en `localStorage`.** Es vulnerable si algun dia hay un XSS.
      Una cookie `HttpOnly` lo evita, pero obliga a rehacer la autenticacion y a
      tocar el CORS, porque el navegador dejaria de mandar la cabecera
      `Authorization`. Es un cambio de medio dia para algo que solo afecta si ya
      hubo un XSS. **Decides tu**, y no lo mezclaria con lo otro.
- [ ] **Los importes son `Float`.** Para un diario de trading es tolerable: los
      errores de coma flotante son de milimasimas y las estadisticas no se ven.
      Para cobrar suscripciones o cuadrar balances al centimo, habria que pasar
      a `Numeric`. **Decides tu**, y de nuevo: es cosa de cuando haya ingresos,
      no de ahora.

## A2. Lo que falta antes de lanzar

De una segunda revisión, posterior a la de los cinco puntos. Ninguna comprobada
con tests: se dedujo leyendo el código.

Lo importante es que **no son las seis del mismo tipo**, y por eso llevan
etiquetas distintas. Mezclarlas hizo que parecieran todas igual de urgentes.

| Qué | Tipo | Dónde |
|---|---|---|
| Subir el mismo archivo dos veces | **resuelto** | `separa_repetidas`, en `import_validacion.py` |
| Tamaño de la subida | **resuelto** | `TAMANO_MAXIMO`, 25 MB, en `trades.py` |
| Freno en el login | **resuelto** | `login_freno.py`, 10 intentos / 15 min |
| `SECRET_KEY` | **despliegue** | `security.py:10` |
| Instalar el backend | **despliegue** | no hay `requirements.txt` |
| Puerto 5432 abierto | **despliegue** | `docker-compose.yml:15` |
| Crear cuenta desde la web | **resuelto** | ya no aplica: `login/page.tsx` |
| Dirección del backend escrita a mano | **despliegue** | `dashboard/page.tsx` y `login/page.tsx` |

- [ ] **Subir el mismo archivo dos veces no duplica.** Es el más grave en el uso
      diario: el usuario sube el reporte, ve algo raro y lo vuelve a subir "por
      si acaso". Las operaciones entran dos veces y las estadísticas quedan
      multiplicadas por dos. **Sigue cuadrando entre sí**, así que no hay forma
      de saber que están mal. Esto no estaba en la revisión anterior porque allí
      se miró si algo se rompía, no si algo se repetía.

      **CÓMO SE RESOLVE (decidido el 10 oct, NO HECHO AÚN)**

      Comparar lo que llega con lo que ya hay en la cuenta, operación por
      operación, y tratarlas como el aviso de la importación parcial que ya
      existe: mismo mecanismo, misma pantalla.

      La comparación es por `position` (el ticket del broker), que en MT5
      **siempre viene y nunca se repite**: comprobado en las 20 operaciones del
      reporte de ejemplo. Donde el ticket venga vacío (plantilla manual) se usa
      una huella: símbolo + tipo + hora de apertura + hora de cierre + precios.

      Casos:
      - Todas repetidas: "ya tienes estas 20, no hemos importado nada", y sale
        el botón **"Borrar todo y volver a importar"**.
      - Algunas nuevas: se importan solo las nuevas y se avisa de cuántas había
        ya, **sin** botón de borrar.
      - El botón de borrar **solo aparece en el primer caso**, y solo si los
        datos coinciden en todos los campos. Así se puede prometer que reimportar
      no pierde nada.

      Dos decisiones ya tomadas y que no hay que volver a preguntar:
      - **No se borra nada solo.** Siempre con el botón, porque `pnl_neto` es
        editable a mano y perder esas correcciones sería peor que el duplicado.
      - **No se añade un índice único a la base.** Con esto no hace falta, y un
        `UNIQUE` que rechaza la fila entera traería de vuelta el problema de
        "el archivo con una operación rara no carga".

- [x] **La subida tiene un tope de tamaño.** 25 MB, contando mientras copia y mirando
      la cabecera `Content-Length`. Un archivo demasiado grande da 413, no 400.
- [x] **El login tiene freno de intentos.** 10 intentos y 15 minutos, contados en la base
      por email **y** por IP. El bloqueo da 429, no 401.
- [ ] **La app no arranca si falta `SECRET_KEY`.** Ahora arranca y revienta en el
      primer login, que es el peor momento para descubrirlo.
- [ ] **Se puede instalar el backend desde cero**, con las versiones fijadas.
- [ ] **En producción, Postgres no está abierto a internet.**
- [ ] **La dirección del backend sale de una variable de entorno.** Hoy está
      escrita a mano (`"http://127.0.0.1:8000"`) en el login y en el dashboard.
      **En local no da ningún problema**: el navegador busca en el propio
      ordenador y ahí está el backend. Con un dominio, el visitante buscará en
      *su* ordenador y le saldrá la web vacía. Lo peligroso es que **ninguna
      comprobación automática lo detecta**: los tipos son válidos, los tests
      usan el servidor real y el build compila. Solo se ve probándolo desde
      fuera.

## B. El login

- [ ] Entra con un email y una contrasena correctos y salta al dashboard
- [ ] Con email equivocado sale un mensaje en el idioma activo, **no en ingles
      fijo**. Este punto se sabe que falla: es lo de `PydanticCustomError`
- [ ] Con contrasena vacia el navegador lo avisa antes de llamar al backend
- [ ] Con un email raro (`sin-arroba`, `a@b`, 300 caracteres) sale un mensaje
      entendible
- [ ] El boton "He olvidado mi contrasena" y el de "Crear cuenta": los dos
      estan muertos
- [ ] El boton de Google avisa de que aun no esta, y no rompe nada

## C. La primera vez que entras

- [ ] Sin cuentas, sale el onboarding con sus dos opciones
- [ ] "Subir un archivo" lleva a la vista de importar
- [ ] "Anadir a mano" abre el formulario, y pide el balance antes de nada
- [ ] Con balance negativo o texto en el campo de balance, sale el error y no se
      crea nada
- [ ] Al crear la cuenta, se entra solo y ya no se ve el onboarding

## D. Importar un archivo

La parte nueva. Con mas detalle porque es lo que se acaba de hacer.

- [ ] El reporte de MT5 de ejemplo (`sample_data/ReportHistory-35023263.xlsx`)
      sube **20 operaciones**. Ni una mas, ni una menos
- [ ] El archivo limpio dice "20 operaciones cargadas" y **no sale el aviso
      naranja**
- [ ] Con una celda vacia en la columna de volumen: se importan las otras 19 y
      sale el aviso
- [ ] El aviso dice las dos cifras: cuantas entraron y cuantas habia
- [ ] El detalle viene plegado y se abre al pulsar
- [ ] **El numero de fila es el de su Excel**, contando desde 1. Comprobarlo
      abriendo el archivo y yendo a esa fila
- [ ] El aviso se ve **aunque navegues a otra vista**, y se queda al volver
- [ ] Con el idioma en ingles, el aviso sale entero en ingles
- [ ] Al empezar una segunda subida, el aviso anterior desaparece
- [ ] La cuenta se actualiza con lo recien importado
- [ ] Al borrar la cuenta, no se Imports nada: se avisa de que tiene operaciones
- [ ] La plantilla de Excel se descarga, se rellena y se sube: funciona
- [ ] Sin cuenta previa, pide el balance antes de dejar subir el archivo

### Archivos raros (esto lo hago yo, pero conviene que lo veas)

- [ ] Un `.txt` renombrado a `.xlsx`
- [ ] Un archivo de 0 bytes
- [ ] Un archivo enorme (100 MB)
- [ ] Un `.xlsx` que en realidad es una pagina web guardada
- [ ] Un Excel sin la seccion `Positions`
- [ ] Un Excel con la seccion `Positions` pero 0 operaciones
- [ ] Un CSV con separador `;` en vez de `,`
- [ ] Un Excel con las columnas en otro orden
- [ ] Un Excel con tildes y ñ en los simbolos

## E. Trades

- [ ] Anadir una operacion a mano: se guarda y aparece en la tabla
- [ ] Editar una existente: los cambios se ven
- [ ] Borrar una: pide confirmacion, y se puede cancelar
- [ ] Con la cantidad a 0 o negativa: sale el error y **no se guarda**
- [ ] Con un simbolo de mas de 40 letras: sale el error
- [ ] Con `direction` en minusculas o como "compra": se guarda bien
- [ ] Al abrir el detalle de una operacion, sale con todos sus datos
- [ ] Los filtros por fecha, simbolo y tipo funcionan, y se pueden limpiar
- [ ] La paginacion: cambiar de 10 a 20, a 50 y a "todas"
- [ ] Con mas operaciones que en una pagina, el contador dice "X de Y"
- [ ] Con cero operaciones tras filtrar, sale el mensaje de vacio y no una tabla
      en blanco
- [ ] Las columnas se pueden ocultar y **se recuerdan al recargar**

## F. Cuentas

- [ ] Crear una cuenta nueva
- [ ] Editar su nombre y su balance
- [ ] Borrar una cuenta **vacia**
- [ ] Borrar una cuenta **con operaciones**: avisa y no la borra
- [ ] Cambiar de cuenta: la tabla cambia a las operaciones de esa cuenta
- [ ] La cuenta activa se recuerda al recargar
- [ ] El nombre se ve en la cabecera, con su origen (MT5 o manual)

## G. Analytics

- [ ] Con operaciones, salen las tarjetas por simbolo
- [ ] El selector de metrica cambia lo que se ordena
- [ ] El orden ascendente y descendente funciona
- [ ] **Sin operaciones, no se rompe**: sale vacio o un cero
- [ ] Con un solo simbolo, la grafica no se queda en blanco

## H. El resumen y el calendario

- [ ] Las ocho cifras cuadran con las operaciones cargadas
- [ ] El balance es el inicial mas el resultado
- [ ] El calendario gira de mes hacia atras y hacia delante
- [ ] Los dias con operaciones tienen el color correcto: verde, rojo o neutro
- [ ] Al pasar el raton por un dia, sale su detalle
- [ ] "Hoy" lleva al mes actual
- [ ] **Los meses sin operaciones** no rompen nada
- [ ] **Un mes con un solo dia** no rompe el calculo de la semana
- [ ] Cambiar de cuenta recalcula el calendario entero

## I. El idioma

- [ ] Todo lo anterior, en las dos versiones. Si algo sale en espanol con la
      app en ingles, es un fallo
- [ ] El idioma se mantiene al recargar
- [ ] Los meses y los dias de la semana salen traducidos
- [ ] **Los numeros**: con el idioma en ingles no deben llevar el formato
      español de coma decimal

## J. Lo que se rompe con facilidad

- [ ] **Recargar en mitad de una subida**: la paginaaguanta?
- [ ] **Pulsar "ver por que" y cambiar de idioma con el aviso abierto**: el
      aviso cambia de idioma entero?
- [ ] **Dejar el aviso abierto y subir otro archivo**: se queda el viejo?
- [ ] **Cerrar el navegador y volver a entrar**: se recuerda la sesion?
- [ ] **Dos pestanas abiertas con cuentas distintas**: se pisan?
- [ ] **El backend apagado**: sale un mensaje entendible o se queda en blanco?
- [ ] **Sin conexion a mitad de la subida**: no dice "cargadas" si no lo estan

## K. Lo que yo no puedo comprobar

Esto necesita tus ojos. No tengo forma de verlo:

- [ ] Que los textos esten bien redactados, en los dos idiomas
- [ ] Que el ingles suene natural y no una traduccion literal
- [ ] Que nada quede torcido en tu pantalla ni en la de un movil
- [ ] Que las animaciones se vean bien (yo no veo animaciones)

## L. Lo que ya esta automatizado

Esto no lo pruebas tu, corre solo. Sirve para saber si se ha roto algo de lo
de arriba:

```
.\venv\Scripts\python.exe -m pytest     -> 216 tests de backend
cd web; npm test                         -> 106 tests de frontend
cd web; npm run test:traduccion          -> el guard de las cadenas sueltas
cd web; npx tsc --noEmit                 -> los tipos
cd web; npm run build                    -> que compile de verdad
```

---

## Notas de como se prueba

- Las capturas se hacen en **produccion** (`:3100`), no en desarrollo, para que
  el boton `N` de Next.js no quede grabado
- Para lo que necesite animacion hay un problema: en mi pestaña
  `requestAnimationFrame` no da cuadros, asi que **no puedo ver animaciones**.
  Eso lo compruebas tu
- Los botones que dependen del raton no se disparan con la tecla de Play:
  hay que chamarles al manejador a mano desde el DOM
- Los servidores que hay levantados ahora: 3000 (desarrollo), 3100 (produccion),
  8000 (backend)