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

Nueve secciones, en este orden:

1. Barra de navegacion (con el selector de idioma)
2. Hero — titulo, subtitulo, dos botones
3. El problema — tres tarjetas
4. Las cuatro fichas — la escena 3D con los paneles del producto
5. Como importar — cuatro vias (MT5, Excel, manual, universal)
6. Como funciona — tres pasos
7. Preguntas frecuentes — seis
8. Cierre — titulo y boton
9. Pie con el aviso legal

Los dos botones del nav y el del cierre **no van a ninguna parte**: los tres
apuntan a `/login`.

### `/login` — iniciar sesion

Un formulario: email y contrasena. Abajo, los botones de Google y de Apple, que
**no hacen nada todavia** (son esqueletos, y Apple se descarto por coste: 99 USD
al ano).

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

## Lo primero: lo que bloquea

Antes de probar nada mas, esto. No es una mejora, es que **hoy un usuario nuevo
no puede entrar**.

- [ ] **No hay formulario de registro.** El backend tiene `/auth/register` y
      funciona, pero el enlace "Crear cuenta" del login es `href="#"`. El boton
      "Empezar ahora" de la landing lleva a `/login`, donde no hay forma de
      crear una cuenta. **No se puede lanzar asi.**
- [ ] **No hay cerrar sesion.** El boton de la esquina solo cambia el tema.
- [ ] **"He olvidado mi contrasena"** es `href="#"`.
- [ ] **Google y Apple** no hacen nada. Entendido para Apple; Google no.
- [ ] **El boton "Preguntar a la IA"** no hace nada. Fase E, detenida.

## A. La landing

- [ ] Los tres botones ("Entrar", "Empezar ahora", los dos del nav) llevan a
      `/login`
- [ ] El selector de idioma cambia **todo**, incluida la escena 3D
- [ ] Al cambiar de idioma no hay destello: la primera pintura ya sale bien
- [ ] Las cuatro fichas se ven completas, sin recortes raros, a 1440, 1200, 1000,
      800, 540 y 375 px. Los cortes de columna estan en 1012 y 540
- [ ] El panel de metricas cuenta desde $10.000 al pasar el raton, y se para al
      salir
- [ ] Las cifras del panel no son las mismas que las del dashboard, y se ve que
      son un ejemplo
- [ ] El aviso legal se lee entero, sin cortarse
- [ ] Las seis preguntas frecuentes se abren y se cierran
- [ ] El boton de Google es de la marca y el de Apple tambien

## B. El login

- [ ] Entra con un email y una contrasena correctos y salta al dashboard
- [ ] Con email equivocado sale un mensaje en el idioma activo, **no en ingles
      fijo**. Este punto se sabe que falla: es lo de `PydanticCustomError`
- [ ] Con contrasena vacia el navegador lo avisa antes de llamar al backend
- [ ] Con un email raro (`sin-arroba`, `a@b`, 300 caracteres) sale un mensaje
      entendible
- [ ] El boton "He olvidado mi contrasena" y el de "Crear cuenta": los dos
      estan muertos
- [ ] Los botones de Google y de Apple no hacen nada al pulsarlos (hoy es lo
      esperado; si aparece algo, es un fallo)

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
cd web; npm test                         -> 98 tests de frontend
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