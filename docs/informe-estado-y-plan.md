# TradeMind — Informe de Estado y Plan

*Actualizado el 4 de octubre de 2026. Todas las cifras de este documento se midieron hoy contra el código, contra la base de datos y contra el navegador.*

---

## 1. Qué es TradeMind

SaaS de diario de trading. El usuario sube el historial de operaciones de su broker o las carga a mano; la plataforma calcula métricas de desempeño y las muestra en un dashboard.

**Stack:** FastAPI + PostgreSQL + SQLAlchemy + Alembic · Next.js 16 (App Router, TypeScript, Tailwind v4, Chart.js) · Docker para la base de datos.

---

## 2. Estado verificado hoy

| Métrica | Valor |
|---|---|
| Commits | **35**, todos en GitHub |
| Tests del backend | **145**, todos pasan |
| Tests del frontend | **69**, todos pasan |
| Claves de idioma | **253 por idioma**, equilibradas |
| Endpoints | 12 |
| Migraciones | 5, aplicadas |
| Backend | 11 ficheros, ~980 líneas |
| Frontend | 13 ficheros TS/TSX, ~4400 líneas |
| CSS | ~880 líneas |

### 2.1 Las cuatro vistas

| Vista | Estado |
|---|---|
| **Resumen** | 8 tarjetas, gráfico de PnL, radar + puntaje, calendario de trading, resumen semanal por semanas reales |
| **Trades** | Tabla, filtros, columnas configurables, paginación, detalle, editar, borrar |
| **Cuentas** | Alta, edición, borrado con protección, cambio de cuenta activa |
| **Analytics** | Barras por símbolo, 5 tarjetas, selectores de métrica y orden |

### 2.2 Los 8 puntos de mejora

| # | Punto | Estado |
|---|---|---|
| 1 | Suscripciones | ⬜ **Pendiente** |
| 2 | Editar y eliminar cuentas | ✅ Hecho |
| 3 | Botón de plantilla Excel | ✅ Hecho |
| 4 | Barra de Winrate animada | ✅ Hecho |
| 5 | Puntos visibles en el gráfico de PnL | ✅ Hecho (ocultos si hay más de 45 días) |
| 6 | Resumen semanal con semanas reales | ✅ Hecho |
| 7 | Fuentes | ✅ Hecho |
| 8 | Despliegue | ⬜ **Pendiente** |

---

## 3. Fases completadas

### Fase 0–3 · El producto
Motor FIFO de reconciliación, backend con autenticación y los tres parsers (MT5, plantilla manual, lector universal), persistencia, y la **migración completa del HTML monolítico a Next.js** con sus cuatro vistas. Verificada elemento a elemento contra el original.

### Fase 3.5 · Cimientos
Un solo repositorio Git, `.gitignore` completo, **145 tests** de backend con base de datos separada (`trademind_test`), y el repositorio privado en GitHub.

### Deprecaciones
`datetime.utcnow()` → `utcnow_naive()`, `class Config` → `ConfigDict`. Verificado con `-W error::DeprecationWarning`.

### Fase 5 · Idioma ES/EN
Sistema propio sin dependencias externas. **El español es la fuente de verdad** y el inglés está tipado contra él, así que una traducción ausente es **error de compilación**, no un texto que se cuela en pantalla.

El idioma se lee de la cookie **en el servidor**, para que no haya parpadeo al cargar.

### Trabajo hecho que no estaba en ninguna fase

| | Qué |
|---|---|
| **D1** | 28 cadenas que estaban fuera del diccionario, más un **guard automático** que falla si vuelve a pasar |
| **D2** | Se probó filtrar las tarjetas por el mes del calendario y **se revirtió**: las tarjetas son el rendimiento global de la cuenta. El gráfico mantiene la curva entera con una franja que señala el mes |
| **D3** | **69 tests de frontend**. La lógica pura del calendario y las métricas se extrajo del componente a `lib/resumen.ts` para poder probarla |
| **D4** | **47 tests** de autenticación y subida de archivos, que no tenían ninguno |
| **D11** | **13 códigos de error** en la API, más **10 tipos de validación de Pydantic**, los cuales el backend no controla y se traducen en el frontend |
| | Calendario: tres correcciones de alineación de días y de alto fijo |
| | Cifras siempre completas, nunca abreviadas |
| | `docs/` con la documentación del proyecto, incluido el documento de negocio |

### Bugs reales encontrados y corregidos

Durante el trabajo aparecieron **tres fallos que nadie había visto**, porque no había tests que los miraran:

1. **Un `.xlsx` vacío tumbaba el servidor con un error 500.** La función que elige el parser leía el archivo fuera del bloque de manejo de errores. El usuario veía "la app se cayó" en vez de "tu archivo no vale".
2. **Fuga de ficheros temporales.** El archivo que se sube se creaba sin borrarse nunca: uno por cada subida, para siempre. Se llegaron a contar **45 huérfanos**.
3. **Los errores del backend estaban siempre en español**, incluso con la interfaz en inglés.

---

## 4. Lo que falta: todo por construir

No hay deuda técnica abierta. Las siguientes fases son **desarrollo nuevo**.

### ⬜ Fase A · Landing page
**No existe.** La raíz del sitio (`app/page.tsx`) muestra todavía la pantalla de bienvenida de `create-next-app`.

Debe explicar el producto y recoger el pricing. Los precios ya están decididos en el documento de negocio: **Pro $29,95 · Premium $49,95 · Elite $79,95**.

- Bilingüe desde el principio
- El login debe quedar accesible desde la navegación

### ⬜ Fase B · Login
**Funciona y no está roto.** Permite registrarse, iniciar sesión y crear cuentas con normalidad. Lo que falta es de acabado:

- Los botones de **Google** y **Apple** no hacen nada todavía. Apple se ha descartado por su coste anual de 99 USD; Google es gratuito y se puede activar
- Los iconos de redes sociales están pendientes de que existan los perfiles
- La fotografía del fondo es decorativa y se prevé cambiarla
- Los colores son distintos de los del dashboard

### ⬜ Fase C · Despliegue
**Nada está en internet.** Todo corre en local. No existe configuración de Vercel, Railway ni ningún otro proveedor.

- Backend y base de datos en un proveedor
- Frontend en Vercel
- Variables de entorno separadas para producción
- Clave secreta nueva y fuerte
- Verificar el flujo completo con un usuario real

### ⬜ Fase D · Suscripciones
Stripe: planes, webhooks, control de acceso según plan, página de pago bilingüe.

**Requiere decidir antes:** ¿se lanza gratis primero y se cobra después, o se cobra desde el primer día? Si es gratis primero, el registro tiene que guardar el plan aunque sea "free", porque si no más adelante no habrá forma de distinguir a los usuarios de pago.

### ⬜ Fase E · Asistente de inteligencia artificial
Endpoint que traduce preguntas en lenguaje natural a consultas SQL sobre los datos del propio usuario, con las restricciones de solo lectura y de aislamiento.

### ⬜ Fase F · MAE/MFE
Medida de cuánto se movió el precio en contra y a favor antes de cerrar una operación.

> **Aviso:** el reporte de operaciones cerradas de MT5 **no incluye datos de cada tick**, que es lo que hace falta para calcular esto. Tal como está planteada, esta fase **no es viable** con el flujo actual de subir archivo. Habría que confirmar que el broker puede dar esos datos por otra vía.

---

## 5. Dos decisiones pendientes

Ninguna bloquea el trabajo técnico, pero las dos llevan esperando:

| Decisión | Qué determina |
|---|---|
| **¿Gratis primero o cobrar desde el día uno?** | Si el registro pide plan o no, y qué se dice en la landing |
| **¿Hosting gratuito o de pago?** | Los planes gratuitos se suspenden por inactividad |

---

## 6. Documentación del proyecto

En `docs/`:

| Documento | Qué es |
|---|---|
| `especificaciones-tecnicas-y-de-negocio.md` | El plan de negocio: precios, arquitectura, cronograma, presupuesto |
| `informe-estado-y-plan.md` | Este documento |
| `informe-claude-2026-10-03.md` | Auditoría anterior, conservada como registro |

> Cuando los dos primeros se contradigan **manda este**, porque está medido contra el código y el otro es un plan.

---

## 7. Reglas de trabajo

1. **Fidelidad al diseño.** El HTML original es la referencia. Ante la duda de qué es correcto, se compara contra el HTML.
2. **Nada se simplifica en silencio.** Si algo se omite, se documenta aquí y se avisa en el momento.
3. **Comparar, no suponer.** Toda afirmación sobre el estado del proyecto se verifica contra el código o el navegador antes de escribirla.
4. **Sin fases a medias.** Una fase está terminada o no está terminada.
5. **Medir, no predecir.** Cuando un cambio puede tener efectos colaterales, se mide en el navegador antes de darlo por bueno.
6. **El orden lo marca el usuario.** Las propuestas de fases son sugerencias, no un plan.
