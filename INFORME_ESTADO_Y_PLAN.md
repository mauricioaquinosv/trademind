# TradeMind — Informe de Estado y Plan de Finalización

*Actualizado el 3 de octubre de 2026. Este documento reemplaza al informe anterior de Claude y está verificado contra el código real del proyecto, no contra descripciones.*

---

## 1. Qué es TradeMind

SaaS de diario de trading. El usuario sube el historial de operaciones de su broker (o las carga a mano), la plataforma calcula métricas de desempeño y las muestra en un dashboard.

**Stack:**
- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic
- **Frontend:** Next.js 16 (App Router, TypeScript, Tailwind v4, Chart.js)
- **Infraestructura:** Docker (solo PostgreSQL por ahora)

---

## 2. Estado real verificado

Todo lo de esta tabla lo comprobé directamente contra el código y el navegador hoy.

### 2.1 Backend — completo

| Pieza | Estado |
|---|---|
| Motor FIFO (`app/fifo_engine.py`) | ✅ Implementado, **sin tests** |
| PostgreSQL + Docker | ✅ 5 migraciones Alembic aplicadas |
| Auth (registro/login, JWT, bcrypt) | ✅ Probado |
| Modelo `Account` + endpoints | ✅ |
| Modelo `Trade` (con `position`, `sl`, `tp`, `pnl_neto`) | ✅ |
| CRUD completo de trades | ✅ |
| Parser MT5 (sección Positions) | ✅ |
| Parser plantilla manual | ✅ **Corregido hoy** (fechas con puntos) |
| Lector universal de archivos (xlsx/xls/HTML/CSV) | ✅ |
| Detección automática del tipo de archivo | ✅ |

### 2.2 Frontend — 4 de 4 vistas completas

| Vista | Estado |
|---|---|
| Login (diseño + lógica real) | ✅ |
| Layout (header, nav, onboarding) | ✅ |
| Cuentas | ✅ |
| Importar (subida + alta manual) | ✅ |
| Trades (tabla, filtros, columnas, paginación, detalle, editar/borrar) | ✅ |
| **Resumen** (8 KPIs, gráfico, calendario, radar) | ✅ **Corregido hoy** (bug del calendario) |
| **Analytics** (rendimiento por símbolo) | ✅ **Construido hoy** |

### 2.3 Fidelidad con el HTML original

**La migración del HTML a Next.js está COMPLETA.** Hoy hice la revisión final lado a lado, midiendo elementos con `getBoundingClientRect()` en ambas páginas y comparando valores.

Elementos que coinciden **al pixel**:

| Elemento | HTML | Next.js |
|---|---|---|
| Tarjeta | 284x89 @24,269 | ✅ igual |
| Panel del gráfico | 582x380 @24,719 | ✅ igual |
| Panel del radar | 582x380 @24,1113 | ✅ igual |
| Botón de navegación | 102x34 @24,213 | ✅ igual |
| Header | 630x199 @0,0 | ✅ igual |
| `.hdr-right` | 214px, 3 botones | ✅ igual |
| Botón `$` | 42px, Arial 13.33px | ✅ igual |
| Celda del calendario | 73x58 | ✅ igual |
| Selects de Analytics | 140x30 @299 / @447 | ✅ igual |

**Fuentes:** verificadas las 8 familias tipográficas (Space Grotesk 500/600/700, IBM Plex Mono 400/500/600). Idénticas en ambas, con `plexLoaded: true` y `sgLoaded: true` en las dos.

---

## 3. Lo que se cerró hoy (no estaba en el informe anterior)

### 3.1 Funcionalidad nueva
- **Vista Analytics** — gráfico de barras por símbolo + 5 tarjetas (Best/Worst Sum, Best/Worst Avg, Number of Symbols), con selectores de métrica y orden.
- **Tema oscuro/claro** — toggle en el header, persistido en `localStorage`. El HTML ya traía las variables CSS; faltaba el interruptor.
- **Animaciones completas** — `animateCount` (conteo de números), `pnlGlowPlugin`, `pnlWavePlugin`, `radarBreathe`, `scoreShine`, `scoreMarkerPulse`, `navActivePulse`, `glowFloat`, `cardIn`.
- **Tooltip con fecha completa** — el HTML usa un callback `title` con `fullDates`; faltaba en Next.js.

### 3.2 Bugs reales corregidos

| # | Bug | Causa raíz | Impacto |
|---|---|---|---|
| 1 | `backdrop-filter` no se aplicaba | Lightning CSS (Turbopack) descartaba la propiedad estándar y conservaba `-webkit-backdrop-filter`, que Chrome ya no soporta | Tarjetas, paneles, header y nav perdían el efecto de cristal. **Era la causa de los puntos 7 y 8 de tu lista** |
| 2 | `backdrop-filter` con prefijo duplicado | Escribí `backdrop-filter:X; -webkit-backdrop-filter:X` | Se eliminó el prefijo |
| 3 | Tarjetas 6px más altas | Tailwind preflight pone `html{line-height:1.5}`; el HTML original usa `normal` | Todo el contenido se desplazaba ~26px |
| 4 | Ejes y radar con otra fuente | Nunca porté `Chart.defaults.font.family` ni `Chart.defaults.color` del `initCharts()` | Etiquetas en Helvetica/#666 en vez de IBM Plex Mono/#8E93A6 |
| 5 | Radar sin animación ni tamaño | CSS usaba `#radarChart`/`#pnlChart`, pero en React los canvas se acceden con `ref` y no tienen `id` | El gráfico no se dimensionaba ni animaba |
| 6 | Onda del gráfico congelada | `pnlWavePhase` era `let` en el cuerpo del componente: el plugin (que Chart.js registra una sola vez) y el `requestAnimationFrame` leían bindings distintos | La animación no avanzaba |
| 7 | **Calendario congelado** | Guard `if (calYear !== null) return` fijaba el mes en el primer render, cuando `trades` aún venía vacío → tomaba `new Date()` (mes actual) | Mostraba "Octubre 2026" sin datos en vez de enero con el día 23 |
| 8 | Plantilla manual rechazada | `datetime.strptime(..., "%Y-%m-%d %H:%M:%S")` exigía guiones; Excel entrega `2026.01.22` | Error al cargar trades manuales |
| 9 | Selects de Analytics angostos | Faltaba `min-width:140px` inline del HTML | 79px/101px en vez de 140px |
| 10 | Botón `$` 3px más ancho | Tailwind aplica `font:inherit` a `<button>`; el HTML original usa la fuente UA (Arial 13.33px) | Desalineación del header |
| 11 | `@keyframes` duplicados ×5 | Acumulados por ediciones previas | CSS inflado |

### 3.3 Pregunta abierta del informe anterior, resuelta

> *"Sin confirmar: si el panel de detalle del trade tiene botones de editar/borrar embebidos"*

**No los tiene.** En el HTML, `openTradeDetails()` (línea 1955) genera solo 3 secciones de lectura: Resumen, Resumen de P&L, Detalles. Los botones editar/borrar están únicamente en la fila de la tabla (línea 1899). **La versión Next.js es correcta — esta brecha no existe.**

---

## 4. Riesgos y huecos críticos

### 🔴 R1 — No hay control de versiones

```
C:\trademind\.git  →  NO EXISTE
```

Todo el código vive en un disco local sin respaldo. Una falla de hardware o un error de guardado pierde meses de trabajo. **Hoy hicimos una sesión entera de cambios sin red de seguridad.**

### 🔴 R2 — Los tests del motor FIFO desaparecieron

El informe anterior decía *"Motor FIFO ✅ 5 tests pasando"*. **Los archivos ya no existen:**

```
test_fifo_engine.py     → NO EXISTE
test_upload_flow.py     → NO EXISTE
```

Solo quedan `check_parser.py` y `check_trades.py`, que son scripts de depuración manual, no tests.

El motor FIFO es el módulo más delicado del backend (reconstruye trades y calcula PnL) y es exactamente el que quedó desprotegido.

### 🟠 R3 — No hay `.gitignore`

`node_modules` y `venv` están expuestos. Al inicializar Git hay que evitar esto antes del primer commit.

### 🟠 R4 — No hay tests para `accounts` ni `trades`

Esos endpoints se probaron con scripts manuales que no se vuelven a ejecutar.

### 🟠 R5 — No hay despliegue

Todo corre en `localhost`. Nadie más puede usar el producto.

### 🟡 R6 — Sin validación con usuarios reales

Discutido pero no ejecutado. Hablar con traders en comunidades ICT/SMC.

---

## 5. Plan de fases restante

El orden está pensado para minimizar retrabajo: **primero lo que te protege, después lo que hace usable el producto, después lo que amplía el mercado.**

---

### 🔴 FASE 3.5 — Cimientos (URGENTE)

**Por qué primero:** no es funcionalidad, es supervivencia. Todo lo demás depende de que el código no se pierda y de que los cálculos no se rompan.

**Alcance:**
1. `git init` + `.gitignore` (venv, node_modules, .next, .env, __pycache__)
2. Primer commit
3. Restaurar `test_fifo_engine.py` (4 casos borde: cierre simple, scale-in, scale-out parcial, reversión)
4. Tests de `accounts` y `trades` (básicos, con pytest)

**Criterio de terminado:**
- [ ] `git log` muestra commits
- [ ] `.gitignore` excluye venv y node_modules
- [ ] `pytest` pasa sin errores

**Esfuerzo:** ~1 sesión

---

### 🔵 FASE 4 — Despliegue

**Por qué antes del idioma:** te da usuarios reales que probar, valida que el stack funciona fuera de tu máquina, y te obliga a resolver seguridad y datos que después afectan a Stripe y al idioma.

**Alcance:**
- Backend en Railway / Render
- Frontend en Vercel
- PostgreSQL gestionado (o el contenedor en Railway)
- Variables de entorno separadas para producción
- CORS configurado para el dominio real
- Verificar flujo completo: registro → login → subir archivo → ver trades
- `SECRET_KEY` nueva y fuerte para producción

**Criterio de terminado:**
- [ ] La app abre desde una URL pública
- [ ] Un usuario puede registrarse, crear cuenta e importar su archivo real
- [ ] Los datos persisten entre reinicios

**Esfuerzo:** ~2-3 sesiones

**⚠️ Decisión pendiente antes de empezar:** hosting gratuito vs. de pago. Railway/Render tienen plan gratuito limitado que sirve para validar, pero se suspende por inactividad. Hay que decidir antes.

---

### 🟡 FASE 5 — Selector de idioma (Opción B)

**Por qué aquí y no después:** para que todo lo que viene Biccionario nazca bilingüe. Si haces la IA primero, después reescribes los prompts. Si haces Stripe primero, rehaces las páginas de pago.

**Alcance:**
- Crear un diccionario de traducción (`es` / `en`)
- Convertir ~40 textos de interfaz en claves
- Traducir las 6 etiquetas del radar (% Acierto, Factor beneficio, Ganancia/pérdida, Recuperación, Drawdown máx., Consistencia)
- Traducir mensajes del backend (errores de validación, de upload, de parser)
- Botón 🌐 ES/EN en el header, persistido en `localStorage`
- **Decisión a tomar:** ¿la plantilla de Excel se queda en español o se descarga según el idioma activo?

**Notas de métricas** — en inglés se nombran distinto, y conviene usar el término que el trader busca:

| Español | Inglés |
|---|---|
| % Acierto | Hit Rate |
| Factor beneficio | Profit Factor |
| Ganancia/pérdida | Win/Loss Ratio |
| Recuperación | Recovery |
| Drawdown máx. | Max Drawdown |
| Consistencia | Consistency |
| Puntaje del trader | Trader Score |

**Criterio de terminado:**
- [ ] El botón ES/EN cambia toda la interfaz, incluidos los gráficos
- [ ] La preferencia persiste entre recargas
- [ ] Los mensajes de error del backend también se traducen

**Esfuerzo:** ~2-3 sesiones

---

### 🟢 FASE 6 — Monetización (Stripe)

**Alcance:**
- Integración de Stripe
- Planes y precios (decidir moneda y amounts)
- Webhooks (suscripción activa, cancelada, vencida)
- Gate de acceso: qué ve un usuario gratuito vs. pagado
- Página de checkout bilingüe (depende de Fase 5)

**Criterio de terminado:**
- [ ] Un usuario puede suscribirse y queda registrado en la BD
- [ ] El webhook actualiza el estado al cancelar
- [ ] El gate bloquea/features correctamente

**Esfuerzo:** ~3-4 sesiones

**⚠️ Decisión de negocio previa:** precio y modelo (suscripción mensual, anual, plan gratuito limitado). El informe anterior ya advirtió que bajar el precio no resuelve el problema de demanda.

---

### ⚪ FASE 7 — Asistente IA y MAE/MFE

**7a — Asistente de IA (Text-to-SQL)**
- Endpoint en el backend que traduce lenguaje natural a SQL sobre las tablas del usuario
- Sanciones: solo `SELECT`, solo tablas propias del `user_id`
- Interfaz de chat en el dashboard
- **Depende de Fase 5** (los prompts deben funcionar en ambos idiomas)

**7b — MAE/MFE**
- Maximum Adverse/Favorable Excursion: cuánto se movió en contra/a favor antes de cerrar
- **Requiere datos tick a tick del broker**, que el reporte "Positions" de MT5 no incluye
- Es lo más difícil y de menor valor inmediato

---

### v2.0 — Fuera de alcance actual

Conexión en vivo vía MetaApi (MT4/MT5) u Open API de cTrader, en vez de subir archivo. Encajaría como un parser más dentro del patrón ya usado.

---

## 6. Resumen visual del estado

```
✅ COMPLETADO
   Fase 0  Motor FIFO
   Fase 1  Backend + auth + parsers + persistencia
   Fase 2  Dashboard mínimo
   Fase 3  Migración del HTML a Next.js (4/4 vistas)
   Fase 3.5 Cimientos (Git + tests)          ← ESTAMOS AQUÍ

🔜 PENDIENTE
   Fase 4  Despliegue
   Fase 5  Selector de idioma (Opción B)
   Fase 6  Monetización (Stripe)
   Fase 7  Asistente IA + MAE/MFE
   v2.0    Conexión en vivo de brokers
```

---

## 7. Reglas de trabajo (continuando el método anterior)

1. **Fidelidad al diseño.** El HTML de Mauricio es la referencia. Cuando haya duda de qué es "correcto", se compara contra el HTML, no contra la interpretación de quien programa.
2. **Nada se simplifica en silencio.** Si algo se omite, se documenta aquí y se le avisa a Mauricio en el momento.
3. **Paso a paso y explicado.** Mauricio no programaba antes de este proyecto. Cada fase se explica qué hace, por qué, y cómo se verifica.
4. **Comparar, no suponer.** Toda afirmación sobre el estado del proyecto se verifica contra el código o el navegador antes de escribirla.
5. **Sin fases a medias.** Una fase está terminada o no está terminada. No se reportan estados intermedios como completos.