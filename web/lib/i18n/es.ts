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