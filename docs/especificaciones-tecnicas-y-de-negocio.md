# TradeMind — Especificaciones técnicas y de negocio

*Convertido a Markdown desde el `.docx` original, que sigue en la raíz del repositorio como*
*`DOCUMENTO DE ESPECIFICACIONES TÉCNICAS Y DE NEGOCIO.docx`.*

> Este documento es la referencia de **negocio** del proyecto: define el modelo de
> precios, el posicionamiento frente a la competencia, la arquitectura en 5 bloques y
> el cronograma por sprints. El detalle del **estado real** del código está en
> [`informe-estado-y-plan.md`](./informe-estado-y-plan.md).

---

DOCUMENTO DE ESPECIFICACIONES TÉCNICAS Y DE NEGOCIO: PROYECTO TRADING JOURNAL SAAS

## 1. ESTUDIO DE MERCADO Y BENCHMARK COMERCIAL: TRADERSYNC

### 1.1 Modelo de Monetización y Precios

El modelo de negocio se basa en el esquema SaaS (Software as a Service) con tres planes de suscripción mensual recurrentes:

#### Plan Pro ($29.95 / mes): Acceso a importación ilimitada, analíticas básicas y terminal de simulación con precisión de 1 minuto. Restringido a 5 consultas de IA al día.

#### Plan Premium ($49.95 / mes): Cuentas múltiples integradas, entrenador de IA proactivo ilimitado y simulación con precisión de 1 segundo.

#### Plan Elite ($79.95 / mes): Simulación en milisegundos, datos de profundidad de mercado (Nivel II), gráficos automatizados de ejecución avanzada (Time & Sales) y soporte total para opciones complejas.

### 1.2 Ingeniería Inversa Financiera e Ingresos Estimados

Al ser una empresa privada, sus datos fiscales están protegidos, pero el análisis de métricas SaaS permite modelar su facturación:

ARPU Ponderado (Ingreso Promedio por Usuario): Estabilizado entre $45.00 y $50.00 USD mensuales, debido a la alta concentración de usuarios en el Plan Premium.

Volumen de Suscriptores: Cruzando datos de tráfico web (proyecciones de herramientas de analítica digital) y un estimado de conversión del 2% al 5% sobre descargas activas, se calcula una base de 6,000 suscriptores de pago recurrentes.

Facturación Estimada: Consolida un MRR (Ingreso Mensual Recurrente) de $270,000 USD, lo que se traduce en una facturación bruta anualizada de $3.24M a $4.8M de dólares.

Estrategia B2B de Marca Blanca: TraderSync estabiliza su flujo de caja vendiendo licencias masivas a Academias de Trading y Prop Firms (empresas de fondeo), reduciendo el costo de adquisición de clientes (CAC).

### 1.3 Matriz de Posicionamiento Competitivo

El mercado de diarios de trading se divide en tres niveles claros:

Gama Alta (Automatizada): TraderSync, Tradervue, TradeZella. Se diferencian por la absorción de datos vía API, procesamiento en tiempo real e Inteligencia Artificial.

Gama Media (Tradicional): Edgewonk. Software rígido enfocado en la disciplina, el control emocional y el registro de texto manual.

Gama Baja (Inercial / Semillero): Excel y Notion. Herramientas gratuitas y personalizables, pero propensas al error humano y con nula automatización gráfica. Son el mercado principal a capturar mediante estrategias de migración de datos.

## 2. ARQUITECTURA DE INGENIERÍA: LOS 5 BLOQUES FUNCIONALES

### Bloque 1: Control de Acceso y Entorno Sandbox (Auth & Onboarding)

Seguridad Base: Autenticación stateless mediante JSON Web Tokens (JWT) con firma algorítmica HS256. El token se almacena del lado del cliente utilizando cookies seguras con las directivas HttpOnly, Secure y SameSite=Strict para mitigar ataques XSS y CSRF.

Cifrado: Las contraseñas en la base de datos se procesan con la biblioteca passlib utilizando la función de hash adaptativa bcrypt.

Algoritmo de Inicialización Sandbox: Para solucionar el problema del "tablero vacío" (que desmotiva al usuario nuevo al no ver datos), el backend ejecuta un trigger automático en el registro que inyecta 50 ejecuciones sintéticas y realistas (acciones, forex, cripto) en las tablas del usuario.

Endpoint de Limpieza: Ruta obligatoria DELETE /api/v1/portfolio/sandbox/clear respaldada por una consulta SQL optimizada que purga las tablas simuladas cuando el trader desea empezar a subir sus operaciones reales.

### Bloque 2: Motor de Ingesta y Normalización de Archivos (Data Ingestion)

Patrón de Diseño: Implementación del Strategy Pattern en Python. Una clase abstracta define el contrato del método parse(), y clases derivadas se encargan de la lógica específica de cada bróker (ej. InteractiveBrokersParser, ThinkOrSwimParser, BinanceParser).

Esquema DDL de la Tabla de Ejecuciones (PostgreSQL):

sql

CREATE TABLE executions (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

user_id UUID REFERENCES users(id) ON DELETE CASCADE,

portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,

execution_time TIMESTAMPTZ NOT NULL,

symbol VARCHAR(20) NOT NULL,

side VARCHAR(10) NOT NULL, -- Valores estrictos: 'BUY' o 'SELL'

price NUMERIC(18, 8) NOT NULL, -- Evita errores de redondeo de punto flotante

quantity NUMERIC(18, 8) NOT NULL,

commission NUMERIC(10, 4) DEFAULT 0.0000,

raw_payload JSONB -- Almacena el CSV original para auditorías de errores

);

CREATE INDEX idx_executions_user_symbol ON executions(user_id, symbol);

Usa el código con precaución.

Pipeline de Normalización: El archivo CSV subido por el usuario es procesado en bloques (chunks) por la API de FastAPI. Las columnas nativas del bróker (como "Action", "Ticker", "Qty") son mapeadas, limpiadas de caracteres especiales y transformadas al estándar de la base de datos central.

### Bloque 3: Algoritmo de Reconciliación de Operaciones (The Journal Core)

Lógica de Agrupación FIFO / LIFO: Las ejecuciones individuales de compra o venta se deben empaquetar en un "Trade" o posición cerrada. El sistema corre un algoritmo en segundo plano:

Mantiene una pila de inventario para cada activo por usuario.

Cuando el inventario neto del activo regresa exactamente a cero, el algoritmo cierra el ciclo de vida del Trade.

Extrae la fecha de la primera ejecución (open_time), la fecha de la última (close_time) y calcula el resultado financiero neto.

Cálculo Matemático del PnL:

PnL Bruto=∑(Precios de Venta×Cantidades)−∑(Precios de Compra×Cantidades)PnL Bruto equals sum of open paren Precios de Venta cross Cantidades close paren minus sum of open paren Precios de Compra cross Cantidades close paren

PnL Bruto=(Precios de Venta×Cantidades)−(Precios de Compra×Cantidades)

PnL Neto=PnL Bruto−∑(Comisiones de Ejecución)PnL Neto equals PnL Bruto minus sum of open paren Comisiones de Ejecución close paren

PnL Neto=PnL Bruto−(Comisiones de Ejecución)

Estructura de la Tabla de Trades Cerrados: Almacena los punteros a los catálogos personalizados del usuario como setup_id (estrategia técnica aplicada) y mistake_id (error conductual cometido), junto con un campo de texto enriquecido para las anotaciones del diario.

### Bloque 4: Motor de Métricas e Informes Analíticos (Analytics Dashboard)

El servidor procesa en memoria o mediante agregaciones SQL los KPIs del Dashboard:

Win Rate (%):

Número de Trades con PnL Neto >0Total de Trades Cerrados

×100

Profit Factor:

∑(PnL de Trades Ganadores)|∑(PnL de Trades Perdedores)|the fraction with numerator sum of open paren PnL de Trades Ganadores close paren and denominator the absolute value of sum of open paren PnL de Trades Perdedores close paren end-absolute-value end-fraction

∑(PnL de Trades Ganadores)||∑(PnL de Trades Perdedores)||

Métricas de Gestión de Riesgo Flotante (MAE y MFE):

MAE (Maximum Adverse Excursion): Mide la pérdida máxima flotante que experimentó la posición mientras estuvo abierta. Revela si el trader usa un Stop Loss adecuado.

MFE (Maximum Favorable Excursion): Mide la ganancia máxima flotante que llegó a estar disponible. Revela si el trader cierra sus posiciones de manera anticipada por miedo.

Implementación: Requiere que el backend realice peticiones de marcas de tiempo a una base de datos de precios históricos (tick-by-tick o velas de 1 minuto) para reconstruir el camino del precio durante la operación.

### Bloque 5: Premium Engine (Asistente de IA y Consultas SQL)

Pipeline de Procesamiento: Módulo conversacional Text-to-SQL. El usuario escribe una pregunta abierta (ej. "Muéstrame mi Profit Factor solo en acciones operadas los lunes por la mañana"). El backend toma el texto y lo procesa con la API de Claude.

Contexto del Esquema: El prompt del sistema le provee a la IA el esquema DDL exacto de las tablas de la base de datos del usuario, exigiéndole que retorne únicamente una sentencia SELECT limpia para PostgreSQL.

Capa de Sanitización Obligatoria (Seguridad Backend): Antes de pasar la consulta generada por la IA al motor de la base de datos, un validador en Python analiza la sintaxis usando expresiones regulares y tokens permitidos. Si la consulta contiene palabras clave prohibidas como DROP, DELETE, UPDATE, INSERT, ALTER, TRUNCATE o GRANT, el proceso se aborta inmediatamente y se levanta una excepción de seguridad.

## 3. LINEAMIENTOS VISUALES Y TOKENS DE DISEÑO UI/UX

### 3.1 Tokens del Sistema de Diseño (Estilo Terminal Financiera)

Para maquetar la interfaz usando Tailwind CSS, se deben aplicar estrictamente las siguientes variables visuales:

Fondo del Canvas General (Fondo de Pantalla): Modo oscuro profundo nativo (bg-slate-950 / Hex: #020617).

Contenedores, Módulos y Tarjetas: Gris azulado metálico (bg-slate-900 / Hex: #0f172a), con bordes delgados de alta definición (border border-slate-800).

Semántica Cromática Financiera:

Estados Positivos / Ganancias: Verde Esmeralda (text-emerald-400 y fondos translúcidos bg-emerald-500/10).

Estados Negativos / Pérdidas / Alertas: Rojo Coral (text-red-400 y fondos translúcidos bg-red-500/10).

Regla Tipográfica Estricta: El texto narrativo utiliza la tipografía Inter, pero todas las tablas numéricas, balances, tasas, precios y decimales deben usar obligatoriamente una tipografía monoespaciada (font-mono de Tailwind CSS). Esto previene la desalineación de los puntos decimales en las tablas analíticas densas.

### 2.2 Wireframes y Distribución de Diseños (Layouts)

Dashboard Rejilla Asimétrica: Panel lateral de navegación izquierdo (w-64 colapsable). Fila superior compuesta por 4 tarjetas rectangulares limpias con KPIs masivos. El cuerpo central se divide en un 70% para la visualización gráfica de la curva de patrimonio (Equity Curve) y un 30% para métricas de efectividad rápidas.

Calendario Mensual de Rendimiento: Un contenedor con rejilla CSS fija de 7 columnas (grid-cols-7). Cada celda mapea un día del mes. El color de la celda se inyecta condicionalmente de forma reactiva: si el balance total de los trades cerrados ese día es positivo, la celda toma clases de ganancia; si es negativo, toma clases de pérdida.

Split-Screen View al 50% (Detalle del Trade): Al expandir una operación, la pantalla se divide simétricamente. El panel izquierdo dibuja el gráfico técnico integrando la librería de JavaScript TradingView Lightweight Charts, inyectando flechas de ejecución automatizadas. El panel derecho muestra los formularios interactivos de notas y etiquetas.

## 4. CRONOGRAMA ÁGIL Y PRESUPUESTO "SOLOPRENEUR + IA"

### 4.1 Plan de Trabajo por Sprints (Fases de 3 Semanas)

Semanas 1 a 3 (Fase 1: Infraestructura e Ingesta): Configuración del entorno local automatizado en Docker mediante Qoder. Creación de las migraciones de base de datos con Alembic. Desarrollo del primer parser funcional para archivos CSV de Interactive Brokers con FastAPI.

Semanas 4 a 6 (Fase 2: Core del Diario y Lógica del Servidor): Programación del algoritmo de reconciliación FIFO en Python. Escritura de los modelos matemáticos financieros y endpoints REST para servir los datos analíticos del Dashboard y métricas MAE/MFE.

Semanas 7 a 9 (Fase 3: Frontend y Gráficos React): Maquetación de las vistas con Next.js y Tailwind CSS siguiendo los tokens de diseño de la terminal financiera. Integración de los gráficos interactivos de TradingView y la cuadrícula del Calendario Mensual.

Semanas 10 a 12 (Fase 4: Pasarela, Sanitización de IA y Despliegue): Integración de los webhooks de Stripe para suscripciones periódicas. Montaje de la capa de seguridad y sanitización en el motor de chat de IA. Despliegue final de producción en la nube (AWS / DigitalOcean / Render).

### 4.2 Presupuesto SaaS y Punto de Equilibrio Financiero

Al eliminar por completo los salarios de equipos de programación y diseño técnico gracias al desarrollo agéntico asistido por Inteligencia Artificial, el capital se reasigna a la adquisición de usuarios:

Categoría de Gasto

Concepto Operativo

Costo Estimado (USD)

Frecuencia

Inversión Inicial (MVP)

Suscripciones de desarrollo (Claude Pro + Qoder Pro)

$50.00

Pago único de desarrollo

Infraestructura Cloud

Servidores en la nube optimizados y bases de datos SQL

$150.00

Mensual

Datos Financieros

APIs de precios de mercado e historiales (Polygon.io)

$250.00

Mensual

SaaS Stack

Pasarela de pago (Stripe), correos y herramientas de soporte

$100.00

Mensual

Tráfico y Crecimiento

Presupuesto de marketing digital y adquisición de clientes

$700.00

Mensual

Presupuesto Fijo

Total gastos fijos operativos del negocio en línea

$1,200.00

Mensual

Punto de Equilibrio Operativo: Estableciendo una suscripción mensual promedio de $25.00 USD, la plataforma requiere exactamente 48 usuarios activos de pago recurrentes para cubrir sus $1,200 USD de gastos de mantenimiento.

Punto de Equilibrio Absoluto (Retorno de Inversión): Bajo un modelo de crecimiento escalonado realista de usuarios, la intersección donde se recuperan todos los gastos acumulados y se generan utilidades netas libres se sitúa entre el Mes 6 y el Mes 7 del proyecto.

## 5. PROMPT MAESTRO DE INICIALIZACIÓN COMPLETA (CÓDIGO FUENTE)

text

Actúa como un Ingeniero de Software Principal y Arquitecto de Soluciones SaaS Financieras. Vamos a inicializar el desarrollo de una aplicación web de Diario de Trading (Trading Journal) clonando la lógica operativa de TraderSync, utilizando la metodología de desarrollo agéntico.

Requisitos de Arquitectura y Stack Tecnológico:

- Backend: Python con FastAPI, asíncrono, usando SQLAlchemy como ORM y Alembic para las migraciones de base de datos.

- Base de Datos: PostgreSQL corriendo en un contenedor independiente.

- Frontend: Next.js (App Router), TypeScript y Tailwind CSS para los estilos de la interfaz oscura.

- Contenedores: Un archivo docker-compose.yml que levante el backend, la base de datos PostgreSQL y PgAdmin para la administración visual.

Estructura de Directorios Requerida:

Genera un árbol estructurado de carpetas siguiendo las mejores prácticas de Arquitectura Limpia (Clean Architecture) separando la lógica por módulos:

/backend

/app

/api

/v1

/endpoints (auth.py, trades.py, ingestion.py, analytics.py)

/core (config.py, security.py, database.py)

/models (user.py, trade.py, execution.py)

/schemas (user.pydantic, trade.pydantic)

/services (fifo_reconciliation.py, parsers.py)

main.py

Dockerfile

requirements.txt

docker-compose.yml

Tu Tarea Inicial Obligatoria:

Escribe y entrégame el código completo y optimizado para producción de los siguientes 3 archivos raíz para poder arrancar el entorno en Qoder de inmediato:

1. 'docker-compose.yml': Configurando los servicios de app de FastAPI, la base de datos PostgreSQL con variables de entorno para las credenciales y volúmenes persistentes, y PgAdmin.

2. 'requirements.txt': Incluyendo las dependencias con versiones bloqueadas estables para fastapi, uvicorn, sqlalchemy, psycopg2-binary, alembic, passlib[bcrypt], pyjwt y pydantic.

3. 'backend/app/main.py': El archivo de entrada de FastAPI configurando el ciclo de vida de la aplicación, los middlewares de CORS obligatorios para conectar el frontend, y un endpoint de prueba 'GET /health' que devuelva el estado del servidor.

Proporciona el código de forma limpia, modular y documentada internamente en español.

Usa el código con precaución.

Ya tienes la especificación completa lista para copiar. Cuando abras tu entorno de desarrollo en VS Code o Qoder, ¿quieres que arranquemos con el código en Python (SQLAlchemy) para modelar las tablas del proyecto, o prefieres maquetar primero el diseño visual en React de la pantalla del Calendario Mensual?
