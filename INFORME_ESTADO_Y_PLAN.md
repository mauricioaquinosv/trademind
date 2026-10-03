# TradeMind — Informe de Estado y Plan

*Actualizado el 3 de octubre de 2026, tras cerrar el punto 7 (fuentes). Este documento reemplaza al informe anterior. Cada cifra de aquí está verificada contra el código o contra el navegador el día de la redacción, no heredada de descripciones anteriores.*

---

## 1. Qué es TradeMind

SaaS de diario de trading. El usuario sube el historial de operaciones de su broker (o las carga a mano), la plataforma calcula métricas de desempeño y las muestra en un dashboard.

**Stack real:**

| Capa | Tecnología |
|---|---|
| Backend | FastAPI + PostgreSQL + SQLAlchemy + Alembic |
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind v4, Chart.js) |
| Traducción | Sistema propio ES/EN, sin dependencias |
| Infraestructura | Docker (solo PostgreSQL por ahora) |

---

## 2. Estado verificado

### 2.1 Cifras del proyecto

| Métrica | Valor | Cómo se midió |
|---|---|---|
| Commits | 25 | `git log` |
| **Commits sin subir** | **19** | `git status -sb` → `ahead 19` |
| Tests | **98, todos pasan** (9,22 s) | `pytest` |
| Backend | 11 ficheros, 924 líneas | recuento |
| Tests (backend) | 4 ficheros, 1069 líneas | recuento |
| Frontend | 12 ficheros TS/TSX, 4109 líneas | recuento |
| CSS | 830 líneas | recuento |
| Claves i18n | **213 por idioma, equilibradas** | `es.ts` / `en.ts` |
| Migraciones | 5, todas aplicadas | `alembic/versions` |
| Endpoints | 12 | routers |
| Ficheros versionados | 72 | `git ls-files` |
| Peso del repo | 3,5 MB | `.git` |

### 2.2 Reparto de los tests

| Fichero | Tests | Qué cubre |
|---|---|---|
| `test_accounts.py` | 43 | CRUD de cuentas, `trade_count`, borrado protegido |
| `test_trades.py` | 28 | Alta, listado, filtros, detalle, borrado |
| `test_fifo_engine.py` | 27 | Motor FIFO: cierre simple, scale-in, scale-out, reversión |

Base de datos de tests separada: `trademind_test`.

### 2.3 Funcionalidad

| Pieza | Estado |
|---|---|
| Auth (registro, login, JWT, bcrypt) | Completo, **sin tests** |
| Motor FIFO | Completo, 27 tests |
| Parser MT5 (sección Positions) | Completo, **sin tests** |
| Parser de plantilla manual | Completo, **sin tests** |
| Lector universal (xlsx, xls, HTML, CSV) | Completo, **sin tests** |
| Endpoints de cuentas (CRUD completo) | Completo, 43 tests |
| Endpoints de trades | Completo, 28 tests |
| Login / Registro | Completo |
| Onboarding | Completo |
| Vista **Resumen** (8 KPIs, PnL, radar, calendario, resumen semanal) | Completo |
| Vista **Trades** (tabla, filtros, columnas, paginación, detalle, editar/borrar) | Completo |
| Vista **Cuentas** (alta, edición, borrado, cambio) | Completo |
| Vista **Analytics** (barras por símbolo, 5 tarjetas) | Completo |
| Sistema ES/EN | 213 claves × 2, tipado cruzado |
| Tema oscuro/claro | Completo, persistido |

---

## 3. Fases completadas

### Fase 0–3 · Base del producto
Motor FIFO, backend con auth y parsers, persistencia, y la **migración completa del HTML monolítico a Next.js** con las 4 vistas. Verificada elemento a elemento contra el original con `getBoundingClientRect()`.

### Fase 3.5 · Cimientos
- `git init` con **un solo repositorio** (se eliminó el `.git` embebido de `web/`, que tenía 1 commit vacío)
- `.gitignore` con venv, node_modules, `.next`, `.env`, `__pycache__`
- **98 tests** con base de datos separada
- Repo privado en GitHub: `mauricioaquinosv/trademind`

### Deprecaciones
`datetime.utcnow()` → `utcnow_naive()`; `class Config` → `ConfigDict`. Verificado con `-W error::DeprecationWarning` y con un control negativo.

### Fase 5 · Idioma ES/EN
- Sistema propio, **sin dependencias** (`next-intl` obligaría a rutas `/es/...`)
- `es.ts` es la fuente de verdad; `en.ts` está **tipado contra él**, así que una traducción que falta es **error de compilación**, no un texto en inglés que se cuela
- El idioma se lee de la cookie **en el servidor** (`layout.tsx`), para que no haya parpadeo
- Botón ES/EN en el header, persistido

### Los 8 puntos de la lista de mejoras

| # | Punto | Estado |
|---|---|---|
| 1 | Suscripciones | **Pendiente** |
| 2 | Editar y eliminar cuentas | Hecho, 20 tests nuevos |
| 3 | Botón de plantilla Excel | Hecho |
| 4 | Barra de Winrate animada | Hecho |
| 5 | Puntos visibles en el gráfico de PnL | Hecho (ocultos si hay más de 45 días) |
| 6 | Resumen semanal con semanas reales | Hecho |
| 7 | Fuentes | **Hecho hoy** |
| 8 | Despliegue | Pendiente (depende de decisión de hosting) |

**Punto 7, en detalle.** Medido con `getComputedStyle` sobre todos los botones, inputs, enlaces y selects de cada vista:

| Vista | En Arial | Con texto visible |
|---|---|---|
| Resumen / Trades / Cuentas / Analytics | 8 / 8 / 10 / 8 | 1 — el `$` |
| Login | 3 | 3 — Entrar, Google, Apple |
| Pantalla de carga | 1 | `fontFamily:"sans-serif"` en línea |

El `$` **se queda en Arial a propósito**: el HTML original tampoco pone `font-family` en `.icon-btn`, y por eso ese botón mide 42px y no 45px, que es lo que mantiene alineado el header. El login sí se arregló, porque el HTML original **no tiene login** (cero `<form>`, cero `type=password`, cero "Entrar") y no hay referencia de fidelidad que respetar ahí.

Resultado tras el arreglo: login de 3 en Arial a **0**, dashboard **sin cambios**, `$` sigue en Arial 13,33 px y 42 px.

---

## 4. Bugs reales encontrados y corregidos

| # | Bug | Causa raíz |
|---|---|---|
| 1 | `backdrop-filter` no se aplicaba | Lightning CSS descartaba la propiedad estándar y conservaba el prefijo `-webkit-`, que Chrome ya no soporta |
| 2 | Tarjetas 6 px más altas | Tailwind preflight pone `line-height:1.5`; el HTML usa `normal` |
| 3 | Ejes y radar con otra fuente | Nunca se portó `Chart.defaults.font.family` ni `.color` |
| 4 | Radar sin animación ni tamaño | El CSS usaba `#radarChart`, pero en React los canvas se acceden por `ref` |
| 5 | Onda del gráfico congelada | `pnlWavePhase` era `let` en el cuerpo del componente: el plugin y el `requestAnimationFrame` leían bindings distintos |
| 6 | Calendario congelado en el mes actual | Un guard fijaba el mes en el primer render, cuando `trades` aún venía vacío |
| 7 | La barra de Winrate nunca se animaba | React fijaba el ancho final en el primer render |
| 8 | Contador de operaciones siempre a 0 | No se agrupaba por cuenta |
| 9 | Días del calendario una columna a la izquierda | Las filas van de lunes a domingo pero las cabeceras en orden domingo-primero |
| 10 | Botón `$` 3 px más ancho | Tailwind aplica `font:inherit` a `<button>`; el HTML usa la fuente del navegador |
| 11 | `@keyframes` duplicados ×5 | Acumulados por ediciones previas |
| 12 | Plantilla manual rechazada | `strptime` exigía guiones; Excel entrega `2026.01.22` |
| 13 | Selects de Analytics a 79 px | Faltaba el `min-width:140px` del HTML |

---

## 5. Deuda técnica y huecos VERIFICADOS

Esta sección es lo que **no** está bien. Todo lo de aquí está comprobado hoy contra el código.

### 🔴 D1 — 28 cadenas de la interfaz fuera del diccionario

El idioma está implementado, pero **no cubre el 100%**. Escaneo estático de los 5 ficheros de la interfaz:

| Dónde | Cadenas | En |
|---|---|---|
| `page.tsx` L1263–1298 | 15 — **todo el modal de detalle de trade**: Resumen, Símbolo, Volumen, Precio apertura, Precio cierre, Apertura, Cierre, Resumen de P&L, Beneficio, Comisión, Swap, Neto, Detalles, Posición (Trade ID), Duración | español fijo |
| `page.tsx` L1130 | 1 — `Siguiente ›` (la paginación) | español fijo |
| `page.tsx` L1462 | 1 — `Cancelar` del modal de confirmación | español fijo |
| `page.tsx` L1350 | 1 — `placeholder="Auto"` | español fijo |
| `page.tsx` L771 | 1 — `label: "Todos"` del filtro de símbolo | español fijo |
| `AnalyticsView.tsx` L182 | 1 — **`Symbol Performance`** | **inglés fijo** |
| `CfControls.tsx` L185–186 | 2 — **`Clear`**, **`Today`** | **inglés fijo** |
| `CfControls.tsx` L390, 398, 400 | 3 — `Limpiar`, `Ahora`, `Aplicar` | español fijo |

**El caso más visible:** los **dos selectores de fecha están en idiomas distintos**. `CfDate` dice "Clear"/"Today" en inglés y `CfDateTime` dice "Limpiar"/"Ahora"/"Aplicar" en español, y aparecen en la misma pantalla.

**El más raro:** `Symbol Performance` es un encabezado **en inglés dentro de la interfaz en español**.

### 🟠 D2 — Los KPIs y el gráfico no responden al mes

Cuando navegas el calendario, cambian el calendario, el resumen semanal y el resumen del mes. **No cambian** los 8 KPIs ni el gráfico de PnL, que siguen usando todos los trades desde el principio.

Verificado en `SummaryView.tsx`: solo `filas` (resumen semanal, L818) y `resumenMes` (L903) dependen de `calYear`/`calMonth`. Las 8 tarjetas leen el objeto `s`, que no lleva filtro de mes.

**Esto es una decisión de diseño, no un error de código.** Pero está sin responder desde que se señaló: ¿los KPIs son "de la cuenta" o "del mes que estás viendo"?

### 🟠 D3 — El frontend no tiene ni un test

Cero tests en `web/`. Los 98 tests cubren el backend. Todo el navegador —cálculo de KPIs, filtros, paginación, calendario, resumen semanal— no tiene red.

Lo que sí se hizo, en su lugar, son scripts de verificación de un solo uso en la carpeta temporal: se extrae el `useMemo` real del archivo y se ejecuta (1.463 días de 48 meses comprobados para el calendario). Sirven para verificar en el momento, pero **no se quedan** en el repositorio.

### 🟠 D4 — Huecos en los tests del backend

| Módulo | Tests |
|---|---|
| `fifo_engine` | 27 |
| `accounts` | 43 |
| `trades` | 28 |
| **`auth`** (registro, login, JWT, bcrypt) | **0** |
| **`trades.py::upload`** (los 3 parsers) | **0** |

El motor FIFO está protegido. El login y los parsers —que es donde un fallo se traduce en "no puedo entrar" o "no me cargó el archivo"— no.

### 🟡 D5 — Imagen duplicada: 2,7 MB de más

`astronaut-login.png` (raíz) y `web/public/astronaut-login.jpg` son **el mismo fichero**: mismo MD5 (`B9C37ED9BB77`), mismos 2.730.174 bytes. Solo se referencia el de `public/`. El de la raíz no lo usa nada.

### 🟡 D6 — `.gitignore` con dos líneas que se contradicen

```
# --- Documentos personales que no deben versionarse ---
!INFORME_ESTADO_Y_PLAN.md
```

El comentario dice "no deben versionarse" y la línea siguiente **lo incluye**. Funciona (el informe sí está en el repo), pero el comentario miente.

### 🟡 D7 — La pantalla de login es otra aplicación

Fondo del cosmos con astronauta, `rounded-lg` de Tailwind, `bg-zinc-900`. El dashboard es cristal oscuro, Space Grotesk, acentos rosa/turquesa. Aunque se le arreglara todo lo demás, seguirían siendo dos productos distintos. **No es el punto 7** y no se ha tocado.

### 🟡 D8 — Dos scripts de depuración sueltos en la raíz

`check_parser.py` (517 B) y `check_trades.py` (826 B). Deprecated: ahora hay 98 tests que cubren lo que esos scripts comprobaban a mano. **Retirarlos del repositorio.**

### 🔴 D9 — 19 commits sin subir

Todo el trabajo de las últimas sesiones está solo en este disco.

### 🔴 D10 — No hay despliegue

`docker-compose.yml` solo levanta PostgreSQL. Todo corre en `localhost:3000` y `localhost:8000`. Nadie más puede usar el producto.

---

## 6. Lo que falta, por fases

El orden está pensado para **minimizar retrabajo**: primero lo barato que evita repetir trabajo, después lo que hace usable el producto, después lo que amplía el mercado.

---

### 🟡 FASE 3.8 — Cerrar la deuda (1 sesión)

**Por qué primero:** son 2–3 horas de trabajo que se pierden si se sigue construyendo encima. Todo lo demás se hace más caro con estas cosas abiertas.

| Trabajo | Deuda | Esfuerzo |
|---|---|---|
| 3.8a · Poner las 28 cadenas en el diccionario | D1 | 30 min |
| 3.8b · Resolver el filtrado por mes de KPIs y gráfico | D2 | depende de la decisión |
| 3.8c · Borrar la imagen duplicada y arreglar `.gitignore` | D5, D6 | 10 min |
| 3.8d · Llevar al repositorio los tests del calendario y del resumen semanal | D3 | 20 min |
| 3.8e · Tests de `auth` y de `upload` | D4 | 1 h |
| 3.8f · Retirar los scripts de depuración | D8 | 5 min |
| 3.8g · **Subir los 19 commits** | D9 | 5 min |

**Criterio de terminado:**
- [ ] Un escaneo estático de la interfaz no encuentra ninguna cadena fuera del diccionario
- [ ] `pytest` pasa con auth y upload cubiertos
- [ ] El repo está en GitHub y sin ficheros duplicados

---

### 🔴 FASE 4 — Despliegue (2–3 sesiones)

**Por qué aquí:** da usuarios reales, valida el stack fuera de la máquina, y obliga a resolver seguridad y datos que después afectan a Stripe.

| Trabajo |
|---|
| Backend en Railway / Render |
| Frontend en Vercel |
| PostgreSQL gestionado, o el contenedor en Railway |
| Variables de entorno separadas para producción |
| `SECRET_KEY` nueva y fuerte |
| CORS limitado al dominio real |
| Verificar el flujo completo: registro → login → subir archivo → ver trades |
| Los datos persisten entre reinicios |

**Criterio de terminado:**
- [ ] La app abre desde una URL pública
- [ ] Un usuario se registra, crea cuenta e importa su archivo real
- [ ] Los datos sobreviven a un reinicio

> ⚠️ **Decisión pendiente desde hace semanas:** hosting gratuito o de pago. Railway y Render tienen plan gratuito limitado que sirve para validar, pero **se suspende por inactividad**. Sin esta decisión no se puede empezar.

---

### 🟢 FASE 5 — Suscripciones / monetización (3–4 sesiones)

| Trabajo |
|---|
| Integración de Stripe |
| Planes y precios (moneda y amounts) |
| Webhooks: suscripción activa, cancelada, vencida |
| Gate de acceso: qué ve un usuario gratuito y qué uno pagado |
| Página de checkout bilingüe |

**Criterio de terminado:**
- [ ] Un usuario se suscribe y queda registrado en la base de datos
- [ ] El webhook actualiza el estado al cancelar
- [ ] El gate bloquea y desbloquea correctamente

> ⚠️ **Falta una decisión de negocio:** precio y modelo. Sin eso no se puede empezar.

---

### ⚪ FASE 6 — Asistente de IA (text-to-SQL)

| Trabajo |
|---|
| Endpoint que traduce lenguaje natural a SQL sobre las tablas del usuario |
| Sanciones: solo `SELECT`, solo tablas propias del `user_id` |
| Interfaz de chat en el dashboard |

Depende de la Fase 5: los prompts tienen que funcionar en los dos idiomas.

### ⚪ FASE 7 — MAE/MFE

Máximo Adverse/Favorable Excursion: cuánto se movió en contra o a favor antes de cerrar.

> **Aviso honesto:** el reporte "Positions" de MT5 **no trae datos tick a tick**, que es lo que hace falta para esto. Si el broker no los da por otra vía, esta fase no es viable tal como está descrita. Es lo más difícil del proyecto y el de menor valor inmediato.

### v2.0 — Fuera de alcance

Conexión en vivo vía MetaApi (MT4/MT5) u Open API de cTrader, en vez de subir archivo.

---

## 7. Tres decisiones que están esperando

Ninguna bloquea el trabajo técnico de la Fase 3.8, pero las tres llevan semanas abiertas:

| # | Decisión | Bloquea |
|---|---|---|
| 1 | **Hosting:** gratuito (se suspende por inactividad) o de pago | Fase 4 entera |
| 2 | **Suscripciones:** precio, modelo y qué ve el usuario gratuito | Fase 5 entera |
| 3 | **KPIs:** ¿de la cuenta entera o del mes que se está viendo? | El D2 |

---

## 8. Reglas de trabajo

1. **Fidelidad al diseño.** El HTML de Mauricio es la referencia. Ante la duda de qué es "correcto", se compara contra el HTML, no contra la interpretación de quien programa.
2. **Nada se simplifica en silencio.** Si algo se omite, se documenta aquí y se le avisa a Mauricio en el momento.
3. **Paso a paso y explicado.** Mauricio no programaba antes de este proyecto. Cada fase explica qué hace, por qué y cómo se verifica.
4. **Comparar, no suponer.** Toda afirmación sobre el estado del proyecto se verifica contra el código o el navegador antes de escribirla. Si este documento dice una cifra, se ha medido ese día.
5. **Sin fases a medias.** Una fase está terminada o no está terminada. No se reportan estados intermedios como completos.
6. **Medir, no predecir.** Cuando un cambioCSS podría tener efectos colaterales, se inyecta la regla en el navegador y se miden los elementos afectados antes y después, en lugar de razonar sobre lo que debería pasar.
