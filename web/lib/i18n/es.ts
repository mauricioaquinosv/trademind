/**
 * Diccionario en español — ES LA FUENTE DE VERDAD.
 *
 * El tipo de este objeto define qué claves existen. El diccionario inglés
 * (en.ts) está tipado como Record<keyof typeof es, ...>, así que si se añade
 * aquí una clave y no se traduce al inglés, TypeScript da error al compilar.
 * Es imposible que se escape una traducción.
 */

export const es = {
  // ------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------
  "nav.summary": "Resumen",
  "nav.trades": "Trades",
  "nav.accounts": "Cuentas",
  "nav.analytics": "Analytics",

  // ------------------------------------------------------------------
  // Comunes
  // ------------------------------------------------------------------
  "common.loading": "Cargando...",
  "common.readingFile": "Leyendo archivo…",
  "common.select": "Seleccionar",
  "common.all": "Todos",
  "common.buy": "Compra",
  "common.sell": "Venta",
  "common.cancel": "Cancelar",
  "common.save": "Guardar",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.close": "Cerrar",
  "common.thisMonth": "Este mes",
  "common.today": "Hoy",
  "common.now": "Ahora",
  "common.hourShort": "Hr",
  "common.minuteShort": "Min",
  "common.settings": "Ajustes",
  "common.noAccount": "Sin cuenta",
  "common.of": "de",
  "common.resetView": "Restablece filtros, cantidad mostrada y columnas",

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  "login.welcome": "Welcome Back!",
  "login.subtitle": "Let's Get You Signed In",
  "login.email": "Email",
  "login.password": "Contraseña",
  "login.forgot": "¿Olvidaste tu contraseña?",
  "login.submit": "Entrar",
  "login.quickLogin": "Acceso rápido con",
  "login.newHere": "¿Eres nuevo?",
  "login.createAccount": "Crea tu cuenta",
  "login.wrongCredentials": "Email o contraseña incorrectos",

  // ------------------------------------------------------------------
  // Errores (vienen del backend o de la validación del navegador)
  // ------------------------------------------------------------------
  "errors.noActiveAccount": "No hay una cuenta activa seleccionada.",
  "errors.symbolRequired": "El símbolo es obligatorio.",
  "errors.openDateRequired": "La fecha de apertura es obligatoria.",
  "errors.invalidBalance": "Ingresa un balance inicial válido (0 o mayor).",
  "errors.invalidBalanceBeforeUpload":
    "Ingresa un balance inicial válido (0 o mayor) antes de subir el archivo.",
  "errors.accountCreateFailed": "No se pudo crear la cuenta. Intenta de nuevo.",
  "errors.accountCreateError": "Ocurrió un error creando la cuenta. Intenta de nuevo.",
  "errors.accountUpdateFailed": "No se pudo guardar la cuenta. Intenta de nuevo.",
  "errors.accountDeleteFailed": "No se pudo eliminar la cuenta. Intenta de nuevo.",
  "errors.nameRequired": "El nombre de la cuenta no puede estar vacío.",
  "errors.tradeSaveFailed": "No se pudo guardar el trade. Verifica los datos.",
  "errors.fileProcessing": "Error al procesar el archivo.",

  /* Mensajes que devuelve la API. El backend manda un codigo y estos son sus
     traducciones: asi el backend no necesita saber en que idioma esta nadie. */
  "apiErrors.emailTaken": "Ese email ya está registrado.",
  "apiErrors.badCredentials": "Email o contraseña incorrectos.",
  "apiErrors.sessionInvalid": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "apiErrors.accountNotFound": "Esa cuenta ya no existe.",
  "apiErrors.accountHasTrades": "La cuenta tiene {n} operaciones. Bórralas también para eliminarla.",
  "apiErrors.tradeNotFound": "Esa operación ya no existe.",
  "apiErrors.fileBadExtension": "El archivo debe ser .xlsx, .xls o .csv: un reporte de MT5 o la plantilla de TradeMind.",
  "apiErrors.fileEmpty": "El archivo está vacío: no se encontró ninguna tabla dentro.",
  "apiErrors.fileNoPositions": "No se encontró la sección 'Positions' en el archivo. Este parece un reporte de MT5 incompleto.",
  "apiErrors.fileHtmlNoTable": "El archivo parece una página web guardada, pero no tiene ninguna tabla de operaciones.",
  "apiErrors.fileUnreadable": "No se pudo leer el archivo. Comprueba que no esté dañado.",
  "apiErrors.fileBadTemplate": "El archivo no coincide con la plantilla de TradeMind. Descárgala desde la vista de importar.",
  "apiErrors.fileBadDate": "No se pudo interpretar una fecha del archivo. Usa el formato AAAA-MM-DD.",
  "apiErrors.emptyName": "El nombre de la cuenta no puede estar vacío.",
  "apiErrors.negativeBalance": "El balance inicial no puede ser negativo.",

  /* Errores de validación de Pydantic. Son los únicos que no podemos evitar
     desde el backend: Pydantic los genera en inglés y no hay forma de cambiarlo
     sin reescribir sus mensajes. Se traducen por su `type`, que sí es estable. */
  "apiErrors.fieldRequired": "Falta {field}.",
  "apiErrors.fieldInvalid": "{field} no es válido.",
  "apiErrors.fieldTooShort": "{field} es demasiado corto.",
  "apiErrors.fieldTooLong": "{field} es demasiado largo.",
  "apiErrors.fieldMinValue": "{field} debe ser {n} o mayor.",
  "apiErrors.fieldMaxValue": "{field} debe ser {n} o menor.",
  "apiErrors.fieldMustBeText": "{field} debe ser texto.",
  "apiErrors.fieldMustBeNumber": "{field} debe ser un número.",
  "apiErrors.fieldMustBeWholeNumber": "{field} debe ser un número entero.",
  "apiErrors.fieldInvalidChoice": "El valor de {field} no es una opción válida.",

  // ------------------------------------------------------------------
  // Tarjetas de indicadores (vista Resumen)
  // ------------------------------------------------------------------
  "kpi.balance": "Balance",
  "kpi.netPnl": "P&L neto",
  "kpi.winrate": "Winrate",
  "kpi.riskReward": "Ratio riesgo/beneficio",
  "kpi.profitFactor": "Profit Factor",
  "kpi.totalTrades": "Total Trades",
  "kpi.tradesWon": { one: "{n} ganada", other: "{n} ganadas" },
  "kpi.tradesLost": { one: "{n} perdida", other: "{n} perdidas" },
  "kpi.expectedValue": "Expected Value",
  "kpi.expectedValueHelp":
    "Ganancia/pérdida promedio esperada por trade: (% acierto × ganancia promedio) + (% pérdida × pérdida promedio). Equivale a P&L neto ÷ total de trades.",
  "kpi.avgTradeTime": "Average Trade Time",
  "chart.monthBandHint": "Franja turquesa: el mes que estás viendo en el calendario. La línea es de todo el histórico.",
  "kpi.allTimeTitle": "Rendimiento de toda la cuenta",
  "kpi.allTimeNote": "Estas cifras no cambian al navegar el calendario. El mes solo mueve los días y sus resúmenes.",

  // ------------------------------------------------------------------
  // Gráfico de PnL acumulado
  // ------------------------------------------------------------------
  "chart.cumulativePnl": "P&L acumulado diario",
  "chart.tradeCount": { one: "{n} trade", other: "{n} trades" },
  "chart.profit": "Beneficio: {pnl}",

  // ------------------------------------------------------------------
  // Radar "Puntaje del trader"
  // ------------------------------------------------------------------
  "score.title": "Puntaje del trader",
  "radar.winRate": "% Acierto",
  "radar.profitFactor": "Factor beneficio",
  "radar.wlRatio": "Ganancia/pérdida",
  "radar.recovery": "Recuperación",
  "radar.maxDrawdown": "Drawdown máx.",
  "radar.consistency": "Consistencia",

  // ------------------------------------------------------------------
  // Resumen semanal
  // ------------------------------------------------------------------
  "weekly.title": "Resumen semanal",
  "weekly.empty": "Sin operaciones todavía.",
  "weekly.week": "Semana {n}",
  "weekly.dayCount": { one: "{n} día", other: "{n} días" },
  "weekly.noTrades": "sin operaciones",

  // ------------------------------------------------------------------
  // Resumen del mes bajo el calendario
  // ------------------------------------------------------------------
  "cal.noTrades": "sin operaciones este mes",
  "cal.monthTotal": "Total del mes",
  "cal.title": "Calendario de trading",
  "cal.weekColumn": "Resumen Semanal",
  "cal.prevMonth": "Mes anterior",
  "cal.nextMonth": "Mes siguiente",
  "cal.backToCurrent": "Volver al mes actual",
  "cal.daysOperated": { one: "{n} día operados", other: "{n} días operados" },
  "cal.bestDay": "Mejor día",
  "cal.worstDay": "Peor día",

  // ------------------------------------------------------------------
  // Vista Analytics
  // ------------------------------------------------------------------
  "analytics.empty": "Aún no hay operaciones para mostrar en Analytics.",
  "analytics.metric.pnl": "PNL",
  "analytics.metric.winrate": "Winrate",
  "analytics.metric.count": "Nº de trades",
  "analytics.order.asc": "Creciente",
  "analytics.order.desc": "Decreciente",
  "analytics.bestSum": "Mejor símbolo (suma)",
  "analytics.bestSumHelp":
    "Símbolo con la suma de P&L más alta entre todas sus operaciones.",
  "analytics.worstSum": "Peor símbolo (suma)",
  "analytics.worstSumHelp":
    "Símbolo con la suma de P&L más baja entre todas sus operaciones.",
  "analytics.bestAvg": "Mejor símbolo (promedio)",
  "analytics.bestAvgHelp":
    "Símbolo con el P&L promedio por operación más alto.",
  "analytics.worstAvg": "Peor símbolo (promedio)",
  "analytics.worstAvgHelp":
    "Símbolo con el P&L promedio por operación más bajo.",
  "analytics.numSymbols": "Nº de símbolos",
  "analytics.symbolPerformance": "Rendimiento por símbolo",
  "analytics.numSymbolsHelp": "Cantidad de símbolos distintos operados.",

  // ------------------------------------------------------------------
  // Cuentas
  // ------------------------------------------------------------------
  "accounts.title": "Cuentas",
  "accounts.count": { one: "{n} cuenta", other: "{n} cuentas" },
  "accounts.new": "Nueva cuenta",
  "accounts.myAccount": "Mi cuenta",
  "accounts.myAccountMT5": "Mi cuenta MT5",
  "accounts.imported": "Cuenta importada",
  "accounts.createManual": "Crear cuenta manual",
  "accounts.nameLabel": "Nombre de la cuenta",
  "accounts.balanceLabel": "Balance inicial",
  "accounts.create": "Crear cuenta",
  "accounts.currency": "Moneda",
  "accounts.headerAccount": "Account",
  "accounts.hint":
    "Puedes llevar varias cuentas (por ejemplo, manual y MT5 importada) y cambiar entre ellas en cualquier momento. Los trades de cada cuenta se guardan por separado.",
  "accounts.empty": "Aún no tienes cuentas creadas.",
  "accounts.current": "Actual",
  "accounts.initialDeposit": "Depósito inicial ${amount}",
  "accounts.tradesCount": { one: "{n} operación", other: "{n} operaciones" },
  "accounts.useThis": "Usar esta cuenta",
  "accounts.importInstead": "¿Quieres importarla desde MT5 en vez de crearla manual?",
  "accounts.importInsteadLink": "Importar CSV como cuenta nueva",
  "accounts.edit": "Editar cuenta",
  "accounts.editTitle": "Editar cuenta",
  "accounts.saveChanges": "Guardar cambios",
  "accounts.delete": "Eliminar cuenta",
  "accounts.deleteWarn": "Esta acción no se puede deshacer.",
  "accounts.deleteConfirm": "¿Seguro que quieres eliminar la cuenta",
  "accounts.deleteHasTrades":
    "Esta cuenta tiene {n} operación(es). También se borrarán.",
  "accounts.wasDeleted": "La cuenta se eliminó.",
  "accounts.wasUpdated": "La cuenta se actualizó.",

  // ------------------------------------------------------------------
  // Trades
  // ------------------------------------------------------------------
  "trades.title": "Historial de operaciones",
  "trades.count": { one: "{n} operación", other: "{n} operaciones" },
  "trades.countOf": "{shown} de {total} operaciones",
  "trades.add": "Agregar trade",
  "trades.importManual": "Importar Manualmente",
  "trades.addEditTitle": "Agregar / Editar trade",
  "trades.addTitle": "Agregar trade",
  "trades.editTitle": "Editar trade",
  "trades.deleteTitle": "Eliminar trade",
  "trades.deleteConfirm":
    "¿Seguro que quieres eliminar este trade{details}? Esta acción no se puede deshacer.",
  "trades.deleteAllConfirm":
    "¿Seguro que quieres eliminar TODAS las operaciones ({n}) de esta cuenta? Esta acción no se puede deshacer.",
  "trades.deleteAll": "Eliminar todas las operaciones",
  "trades.deleteAllWarn": "Elimina todas las operaciones de esta cuenta",
  "trades.viewDetail": "Ver detalle",
  "trades.detailTitle": "Detalle de la operación",
  "trades.detailSummary": "Resumen",
  "trades.detailOpen": "Apertura",
  "trades.detailClose": "Cierre",
  "trades.detailPnl": "Resumen de P&L",
  "trades.detailDetails": "Detalles",
  "trades.detailPositionId": "Posición (Trade ID)",
  "trades.detailDuration": "Duración",
  "trades.close": "Cerrar",
  "trades.resetView": "Restablece filtros, cantidad mostrada y columnas",
  "trades.startWeek": "Iniciar mi semana",
  "trades.dateFrom": "Fecha desde",
  "trades.dateTo": "Fecha hasta",
  "trades.pageSize": "Mostrar",
  "trades.pageSizeAll": "Todos",
  "trades.pageSizeN": "{n} Trades",
  "trades.columns": "Columnas",
  "trades.apply": "Aplicar",
  "trades.clear": "Limpiar",
  "trades.clearFilters": "Limpiar filtros",
  "trades.deleteTradesBtn": "Eliminar trades",
  "trades.empty": "No hay operaciones para mostrar.",
  "trades.prev": "‹ Anterior",
  "trades.next": "Siguiente ›",
  "trades.pageOf": "Página {page} de {total}",
  "trades.results": "resultados",

  // Columnas de la tabla
  "col.openTime": "Apertura",
  "col.position": "Posición",
  "col.symbol": "Símbolo",
  "col.type": "Tipo",
  "col.volume": "Volumen",
  "col.openPrice": "Precio apertura",
  "col.sl": "S/L",
  "col.tp": "T/P",
  "col.closeTime": "Cierre",
  "col.closePrice": "Precio cierre",
  "col.commission": "Comisión",
  "col.swap": "Swap",
  "col.profit": "Beneficio",
  "col.pnl": "Neto",

  // Campos del formulario de trade
  "field.position": "Posición",
  "field.symbol": "Símbolo",
  "field.volume": "Volumen",
  "field.openPrice": "Precio apertura",
  "field.closePrice": "Precio cierre",
  "field.auto": "Auto",
  "field.commission": "Comisión",
  "field.swap": "Swap",
  "field.profit": "Beneficio",
  "field.pnl": "Neto",

  // ------------------------------------------------------------------
  // Importar
  // ------------------------------------------------------------------
  "import.mt5": "Importar reporte de MT5",
  "import.manual": "Importar trades manualmente",
  "import.fromFile": "Importar desde CSV/Excel",
  "import.title": "Importar",
  "import.balanceLabel": "Balance inicial",
  "import.startWeek": "Iniciar mi semana",
  "import.success": { one: "{n} operación cargada correctamente.", other: "{n} operaciones cargadas correctamente." },
  "import.hint":
    'Exporta tu "Trade History Report" desde MetaTrader 5 (botón derecho sobre el historial → Report → Save as CSV o Guardar como .xlsx) y súbelo aquí.',
  "import.hintTemplateNote":
    "También puedes subirla ya llena: la detecto automáticamente y agrego esos trades a tu cuenta.",
  "import.downloadTemplate": "Descargar plantilla Excel",
  "import.balanceForAccount": "Balance inicial de la cuenta",
  "import.dropHere": "Haz clic para elegir un archivo o arrástralo aquí",
  "import.formats": "Formato .csv, .xlsx o .xls",

  // ------------------------------------------------------------------
  // Onboarding
  // ------------------------------------------------------------------
  "onboarding.configure": "Configura tu cuenta para comenzar",
  "onboarding.choose": "Elige cómo quieres empezar a ver tus estadísticas de trading.",
  "onboarding.loading": "Cargando...",
  "onboarding.importTitle": "Importar desde CSV/Excel",
  "onboarding.importDesc":
    "Sube tu reporte de MT5 (.csv o .xlsx) y calculamos tus estadísticas automáticamente.",
  "onboarding.manualTitle": "Crear cuenta manual",
  "onboarding.manualDesc":
    "Define un balance inicial y empieza desde cero. Podrás importar tus operaciones después.",
  "onboarding.back": "Atrás",

  // ------------------------------------------------------------------
  // Origen de los datos (pastilla del header)
  // ------------------------------------------------------------------
  "datasource.mt5": "MT5 importado",
  "datasource.manual": "Manual",
  "datasource.none": "Sin cuenta",

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------
  "header.currency": "Moneda",
  "header.filters": "Filtros",
  "header.dateRange": "Rango de fechas",
  "header.askAI": "Preguntar a la IA",
  "header.changeTheme": "Cambiar tema",
  "header.dashboard": "Dashboard",

  // ------------------------------------------------------------------
  // Landing (página pública)
  // ------------------------------------------------------------------
  "landing.badge": "Diario de trading",
  "landing.nav.login": "Iniciar sesión",
  "landing.nav.signup": "Crear cuenta",

  "landing.hero.title": "El diario de trading que te dice",
  "landing.hero.titleAccent": "cómo ganas.",
  "landing.hero.sub": "Sube el reporte real de tu broker y mira tus números: winrate, profit factor, qué días ganas y cuánto riesgo tomas. Sin operar un solo trade.",
  "landing.hero.cta": "Crear cuenta",
  "landing.hero.cta2": "Ver el dashboard",

  "landing.problem.eyebrow": "El problema",
  "landing.problem.title": "Tu winrate no es el que crees",
  "landing.problem.body": "Todo trader sabe cuánto ganó el mes pasado. Casi ninguno sabe por qué. Y sin esa respuesta, cada decisión sigue siendo una apuesta.",
  "landing.problem.p1.title": "Operas en vacío",
  "landing.problem.p1.body": "Sabes que ganaste. No sabes qué día de la semana, ni a qué hora, ni sobre qué símbolo te sale rentable.",
  "landing.problem.p2.title": "El resultado total no dice nada",
  "landing.problem.p2.body": "Doce meses y un +8% no te dicen si ese mes fue una buena racha y once malos, o al revés.",
  "landing.problem.p3.title": "Nadie te señala el patrón",
  "landing.problem.p3.body": "Tu mejor día y tu peor día están ahí, en tus datos. Solo que nadie te los enseña.",

  "landing.how.eyebrow": "Cómo funciona",
  "landing.how.title": "Tres pasos, sin cambiar tu forma de operar",
  "landing.how.s1.title": "Sube tu reporte",
  "landing.how.s1.body": "El archivo que tu broker ya te da. Tal cual: sin renombrar columnas y sin mapear campos a mano.",
  "landing.how.s2.title": "TradeMind calcula",
  "landing.how.s2.body": "Reconciliamos las operaciones con FIFO y calculamos cada indicador sobre tus datos, no sobre estimaciones.",
  "landing.how.s3.title": "Mira la verdad",
  "landing.how.s3.body": "Dónde ganas, dónde pierdes y qué estás haciendo realmente con tu riesgo.",

  "landing.views.eyebrow": "Lo que ves",
  "landing.views.title": "Cuatro vistas, un solo lugar",
  "landing.views.lead": "Estas son capturas reales del panel, con 152 operaciones importadas del reporte de MT5. No son dibujos.",
  "landing.views.summary.title": "Resumen",
  "landing.views.summary.body": "Ocho indicadores globales, el gráfico de PnL acumulado, el radar de seis ejes con tu puntaje, el calendario día a día y el resumen de cada semana.",
  "landing.views.trades.title": "Operaciones",
  "landing.views.trades.body": "Tabla con filtros por fecha, las columnas que elijas, orden, paginación, y editar o borrar cada operación.",
  "landing.views.accounts.title": "Cuentas",
  "landing.views.accounts.body": "Varias cuentas, cada una con su saldo, su moneda y su origen. Cambia de una a otra sin perder nada.",
  "landing.views.analytics.title": "Analítica",
  "landing.views.analytics.body": "Rendimiento por símbolo, con cinco tarjetas y selector de métrica y de orden.",

  "landing.import.eyebrow": "Lo que nos diferencia",
  "landing.import.title": "La importación es lo difícil, y ahí no competimos",
  "landing.import.body": "Casi todos los journals se caen justo aquí: columnas que no coinciden, fechas que no se leen, operaciones que se pierden. TradeMind lee el reporte de MT5 directamente. Y si tu broker no es MT5, tienes la plantilla de Excel y la carga manual.",
  "landing.import.mt5.title": "MetaTrader 5",
  "landing.import.mt5.body": "El reporte de operaciones cerradas se importa tal cual lo genera el broker.",
  "landing.import.excel.title": "Plantilla de Excel",
  "landing.import.excel.body": "Una plantilla con las columnas que necesitas. La llenas y la subes.",
  "landing.import.manual.title": "Carga manual",
  "landing.import.manual.body": "Si prefieres meterlas de una en una, también.",
  "landing.import.universal.title": "Lector universal",
  "landing.import.universal.body": "CSV y Excel genéricos: lee la tabla y te propone las columnas.",

  "landing.langs.eyebrow": "Idioma",
  "landing.langs.title": "Dos idiomas de verdad",
  "landing.langs.body": "Toda la interfaz está en español y en inglés, incluidos los mensajes de error y las validaciones de los formularios. No es traducción automática: si una cadena no está traducida, la aplicación no compila.",

  "landing.faq.eyebrow": "Preguntas",
  "landing.faq.title": "Lo que suelen preguntarnos",
  "landing.faq.q1": "¿Tengo que conectar mi broker?",
  "landing.faq.a1": "No. TradeMind no se conecta a tu broker ni pide tus credenciales. Subes un archivo y ya está.",
  "landing.faq.q2": "¿Sirve si no uso MetaTrader?",
  "landing.faq.a2": "Sí. El lector de MT5 es automático, pero con la plantilla de Excel o la carga manual entra cualquier broker.",
  "landing.faq.q3": "¿Quién ve mis datos?",
  "landing.faq.a3": "Solo tú. No compartimos operaciones con nadie ni las usamos para nada ajeno a tu cuenta.",
  "landing.faq.q4": "¿Puedo llevar varias cuentas?",
  "landing.faq.a4": "Sí. Cada cuenta tiene su saldo, su moneda y su historial, y las analizas por separado.",
  "landing.faq.q5": "¿Cuánto tarda en verse?",
  "landing.faq.a5": "En cuanto acaba la importación, que es inmediata. No hay que esperar a nada.",
  "landing.faq.q6": "¿Puedo corregir una operación?",
  "landing.faq.a6": "Sí. Editar y borrar operaciones está en el propio dashboard, sin pedirle permiso a nadie.",

  "landing.final.title": "Empieza por saber la verdad",
  "landing.final.body": "Crea una cuenta y sube tu reporte. Tardas menos en hacerlo que en decidir si esto te sirve.",

  "landing.legal.title": "Aviso",
  "landing.legal.body": "TradeMind es una herramienta de registro y análisis. No damos recomendaciones de inversión ni asesoramiento financiero, y no operamos por ti. Operar conapalancamiento implica un riesgo alto y puede terminar con la pérdida total de lo invertido. Ninguna estadística ni ningún resultado mostrado en esta web es una promesa de resultados futuros.",
  "landing.footer.rights": "Todos los derechos reservados.",

  // ------------------------------------------------------------------
  // Nombres de meses y días (para calendarios y fechas)
  // ------------------------------------------------------------------
  "months.full": [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ],
  "months.short": [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ],
  "dow.short": ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
} as const;

export type TranslationKey = keyof typeof es;
export type TranslationValue = (typeof es)[TranslationKey];

/** Un valor traducible es un texto simple o un par singular/plural. */
export type Localized = string | { one: string; other: string };

/**
 * Ensancha un tipo literal para poder darle otro valor en otro idioma.
 *
 * Sin esto, `Record<keyof typeof es, (typeof es)[K]>` exigiría que la
 * traducción inglesa fuera el MISMO texto literal que el español, que es
 * justo lo que se quiere cambiar. Este helper mantiene la seguridad de que
 * exista la clave, pero deja cambiar el contenido.
 */
export type BaseDe<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly BaseDe<U>[]
    : T extends { one: string; other: string }
      ? { one: string; other: string }
      : T;