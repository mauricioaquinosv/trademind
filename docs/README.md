# Documentación del proyecto TradeMind

Toda la documentación vive aquí. Cada documento dice **qué es** y **cuándo se escribió**.

## Documentos

| Documento | Qué es | Estado |
|---|---|---|
| [`especificaciones-tecnicas-y-de-negocio.md`](./especificaciones-tecnicas-y-de-negocio.md) | **Referencia de negocio.** Modelo de precios (3 planes), posicionamiento frente a la competencia, arquitectura en 5 bloques, cronograma por sprints y presupuesto. | Vigente |
| [`informe-estado-y-plan.md`](./informe-estado-y-plan.md) | **Estado real del código**, medido, y las fases que quedan. Es el documento de trabajo. | Vigente |
| [`informe-claude-2026-10-03.md`](./informe-claude-2026-10-03.md) | Auditoría anterior del proyecto, hecha antes de añadir Git, tests, el idioma y los 8 puntos de mejora. | **Superado** — se conserva como registro |

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

El documento de especificaciones **ya responde** a una de las tres decisiones que
estaban esperando. No hay que decidirlo otra vez:

| Decisión | Respuesta | Dónde |
|---|---|---|
| Precio y modelo | **3 planes mensuales**: Pro $29,95 · Premium $49,95 · Elite $79,95 | Sección 1.1 |
| Costes fijos | $1.200/mes (infraestructura $150, datos $250, Stripe $100, marketing $700) | Sección 4.2 |
| Punto de equilibrio | Subscription media de $25/mes | Sección 4.2 |

Las otras dos siguen sin decidir:

| Decisión | Bloquea |
|---|---|
| **Hosting:** gratuito (se suspende por inactividad) o de pago | La Fase 4 entera |
| **KPIs:** ¿de la cuenta entera o del mes que se está viendo? | La incoherencia D2 del informe de estado |

---

## Una advertencia sobre el plan original

Las especificaciones son un documento de **planificación**, y tienen dos cosas que
no se han contrastado con la realidad del proyecto:

1. **Simulación con precisión de milisegundos y datos de Nivel II** (planes Pro a Elite) requieren una **conexión en vivo al broker**. El proyecto actual funciona subiendo un archivo. Eso está fuera de alcance y no hay decisión tomada.

2. **MAE/MFE necesita datos tick a tick**, y el reporte "Positions" de MT5 no los trae. Como está descrita, esa fase no es viable con el flujo actual de subir archivo.

Ninguna de las dos bloquea el trabajo actual. Ambas están anotadas para que no seheny sales de la pantalla.
