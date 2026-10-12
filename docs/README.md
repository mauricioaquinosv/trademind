# Documentación del proyecto TradeMind

Toda la documentación vive aquí. Cada documento dice **qué es** y **cuándo se escribió**.

## Documentos

| Documento | Qué es | Estado |
|---|---|---|
| [`especificaciones-tecnicas-y-de-negocio.md`](./especificaciones-tecnicas-y-de-negocio.md) | **Referencia de negocio.** Modelo de precios (3 planes), posicionamiento frente a la competencia, arquitectura en 5 bloques, cronograma por sprints y presupuesto. | Vigente, **pero ver la advertencia de abajo** |
| [`mapa.html`](./mapa.html) | **El mapa del sitio y plan de QA.** Empieza por aquí. Dónde está cada pieza, qué hay que comprobar y qué está roto. | Vigente |
| [`estado.html`](./estado.html) | **La foto del proyecto hoy.** Qué funciona, qué es solo diseño y qué falta. | Vigente |
| [`mapa-y-qa.md`](./mapa-y-qa.md) | El mapa en texto plano: las 13 zonas de QA para tachar, parte por parte. | Vigente |
| [`informe-estado-y-plan.md`](./informe-estado-y-plan.md) | **Estado real del código**, medido, y las fases que quedan. Es el documento de trabajo. | Vigente |
| [`informe-claude-2026-10-03.md`](./informe-claude-2026-10-03.md) | Auditoría anterior del proyecto, hecha antes de añadir Git, tests, el idioma y los 8 puntos de mejora. | **Superado** — se conserva como registro |
| [`landing-vista.html`](./landing-vista.html) | La landing pública renderizada, para verla sin levantar el proyecto. | Vigente |

**Orden de lectura:** `mapa.html` (o `estado.html` si quieres la foto rápida) →
`mapa-y-qa.md` para lo que hay que comprobar → `especificaciones` para por dónde
iba el negocio. Los dos HTML se abren con doble clic, no necesitan servidor.

El original de las especificaciones sigue en la raíz del repositorio como
`DOCUMENTO DE ESPECIFICACIONES TÉCNICAS Y DE NEGOCIO.docx`. La versión en Markdown
de aquí es una conversión para poder leerla y compararla en el control de versiones.

---

## Los dos documentos no cuentan lo mismo

Conviene tener claro cuál consultar:

- **`especificaciones-tecnicas-y-de-negocio.md` dice lo que el proyecto DEBERÍA ser.** Es un plan: precios, arquitectura prevista, sprints de 3 semanas. Está escrito en condicional, como algo que se va a construir.

- **`informe-estado-y-plan.md` dice lo que el proyecto ES.** Está medido contra el código y contra el navegador el día en que se escribió. Sus secciones de "deuda técnica" y "bugs corregidos" son las que no están en ningún otro sitio.

Cuando los dos se contradigan, **manda el segundo**, porque se verificó con el código y el primero no.

---

## Cronograma: qué dice el plan original y dónde estamos

El documento de especificaciones define 4 fases de 3 semanas. Este es su estado real:

| Fase del plan original | Contenido | Estado |
|---|---|---|
| **1** · Semanas 1–3 | Infraestructura e ingesta de archivos | **Completa** — FastAPI, PostgreSQL, Docker, 3 parsers (MT5, plantilla, universal) |
| **2** · Semanas 4–6 | Core del diario y lógica de servidor | **Completa** — motor FIFO, auth JWT/bcrypt, 12 endpoints, 98 tests |
| **3** · Semanas 7–9 | Frontend y gráficos React | **Completa** — migración del HTML a Next.js, 4 vistas, tema claro/oscuro, idioma ES/EN |
| **4** · Semanas 10–12 | Pasarela de pago, IA y despliegue | **Pendiente** — Stripe, asistente de IA text-to-SQL, despliegue |

Las tres primeras se hicieron, más trabajo que no estaba en el plan: la suite de
tests, el control de versiones, el sistema de idiomas y las 7 de las 8 mejoras
que pidió el usuario.

**La Fase 4 del plan original es exactamente donde estamos hoy.** Lo que sigue
en el proyecto son fases nuevas, no deuda: la landing page, el acabado del
login, el despliegue, las suscripciones y el asistente de IA. Están descritas
en [`informe-estado-y-plan.md`](./informe-estado-y-plan.md).

---

## Decisiones de negocio ya tomadas

| Decisión | Estado |
|---|---|
| **Precio y modelo** | **Un solo plan: 7 días gratis y después $9,99/mes.** Se reevaluará cuando haya producto terminado y se sepa lo que vale de verdad. No bloquea nada |
| **Hosting** | **Gratuito.** Neon (base), Render (backend), Cloudflare (frontend) y StatusCake (despertador). Cuentas sin crear todavía |
| **KPIs** | **Sin decidir.** ¿De la cuenta entera o del mes que se está viendo? Bloquea la incoherencia D2 del informe de estado |

> **Nota sobre el precio.** El documento de especificaciones dice tres planes
> (Pro $29,95, Premium $49,95, Elite $79,95). Se queda como referencia de por dónde
> se empezó, pero **la decisión vigente es un solo plan de $9,99**, que es sobre lo
> que están construidas las pantallas de suscripción.

---

## Conexión en vivo con brokers

Decidido el 12 oct, después de investigar qué plataformas se pueden conectar y
cómo. **No todas se pueden, y la diferencia no es técnica.**

Hay dos modelos:

| Modelo | Cómo funciona | Plataformas |
|---|---|---|
| **Autoservicio** | El usuario da su token a la plataforma (MT4, MT5, cTrader, TradeLocker) y la app lo usa. **No necesitas permiso de nadie.** | MT4, MT5, cTrader, TradeLocker |
| **Asociación directa** | El broker tiene que autorizarte a ti como empresa, uno por uno, con acuerdo de por medio | Match-Trade, DXtrade |

**Por qué importa:** con el primer grupo puedes conectarte solo. Con el segundo
necesitas que una empresa firme contigo, y eso no depende de tu código.

### Decisiones

1. **MT4 y MT5: solo importación de archivo.** Se descarta la conexión en vivo
   porque la pasarela que la permite (MetaApi) cobra por cada cuenta conectada, y
   eso no cabe en $9,99/mes por usuario. **Queda anotado para más adelante**, con
   coste, cuando el producto lo justifique.
2. **cTrader: sí, y es la única que se construye ahora.** Su API es gratis, oficial
   y está hecha para que se conecten apps de terceros.
3. **TradeLocker: pendiente de verificar.** Su API es mucho menos conocida y no se
   ha podido confirmar que sea autoservicio de verdad. Cuando se verifique, se
   añade como otra implementación más de `LiveConnector` sin tocar el resto.
4. **Match-Trade y DXtrade: descartados por ahora.** Requieren negociar con cada
   broker por separado.

### Lo que esto implica y no hay que olvidar

- **cTrader en vivo, MT4/MT5 por archivo.** Son dos experiencias distintas para el
  usuario. No se puede anunciar "conecta tu broker" a secas.
- **Guardar credenciales de terceros cambia lo legal.** La política de privacidad
  habla de archivos, no de tokens. **Lo lleva el titular del proyecto.**
- **Un conector roto miente al usuario.** Si la API de cTrader cambia, los números
  que ve el usuario están mal hasta que se arregle. Con archivo eso no pasa. Es una
  carga de mantenimiento permanente.

---

## Lo que se está construyendo ahora

| Paso | Estado |
|---|---|
| Parser de MT4 (reporte exportado, igual que MT5) | **Hecho** (`42ef557`) |
| Esqueleto de conexión en vivo, solo cTrader | Pendiente |
| TradeLocker, cuando se verifique su API | Pendiente |
| Motor de suscripciones (lotes 2, 3 y 4) | Pendiente |

---

## Una advertencia sobre el plan original

Las especificaciones son un documento de **planificación**, y tienen dos cosas que
no se han contrastado con la realidad del proyecto:

1. **Simulación con precisión de milisegundos y datos de Nivel II** (planes Pro a Elite) requieren una **conexión en vivo al broker**. El proyecto actual funciona subiendo un archivo. Eso está fuera de alcance y no hay decisión tomada.

2. **MAE/MFE necesita datos tick a tick**, y el reporte "Positions" de MT5 no los trae. Como está descrita, esa fase no es viable con el flujo actual de subir archivo.

Ninguna de las dos bloquea el trabajo actual. Ambas están anotadas para que no
se pierdan de vista.
