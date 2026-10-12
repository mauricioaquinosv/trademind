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
  // Login y registro (una sola pantalla con dos modos)
  // ------------------------------------------------------------------
  "login.titleSignup": "Crea tu cuenta",
  "login.subtitleSignup": "Sube tu reporte y mira tus números reales en minutos.",
  "login.titleLogin": "Qué bueno verte de nuevo",
  "login.subtitleLogin": "Entra para seguir con tu diario.",
  "login.google": "Continuar con Google",
  "login.googleLogin": "Entrar con Google",
  "login.googleSoon": "El acceso con Google llegará pronto. Por ahora usa tu email.",
  "login.or": "o con tu email",
  "login.email": "Email",
  "login.emailPh": "tu@email.com",
  "login.password": "Contraseña",
  "login.passwordPh": "Tu contraseña",
  "login.passwordHint": "Mínimo 8 caracteres.",
  "login.passwordTooShort": "La contraseña debe tener al menos 8 caracteres.",
  "login.showPassword": "Mostrar la contraseña",
  "login.hidePassword": "Ocultar la contraseña",
  "login.forgot": "¿Olvidaste tu contraseña?",
  "login.submit": "Entrar",
  "login.submitSignup": "Crear cuenta",
  "login.terms": "Al crear tu cuenta aceptas los Términos y la Política de privacidad.",
  "login.haveAccount": "¿Ya tienes cuenta?",
  "login.signInLink": "Entrar",
  "login.newHere": "¿Eres nuevo?",
  "login.createAccount": "Crea tu cuenta",
  "login.wrongCredentials": "Email o contraseña incorrectos",
  "login.genericError": "No se pudo completar. Inténtalo de nuevo.",
  "login.networkError": "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",

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
  "apiErrors.tooManyAttempts": "Demasiados intentos fallidos. Espera unos minutos y vuelve a intentarlo.",
  "apiErrors.sessionInvalid": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "apiErrors.accountNotFound": "Esa cuenta ya no existe.",
  "apiErrors.accountHasTrades": "La cuenta tiene {n} operaciones. Bórralas también para eliminarla.",
  "apiErrors.tradeNotFound": "Esa operación ya no existe.",
  "apiErrors.fileBadExtension": "El archivo debe ser .xlsx, .xls, .csv, .htm o .html: un reporte de MT4 o MT5, o la plantilla de TradeMind.",
  "apiErrors.fileEmpty": "El archivo está vacío: no se encontró ninguna tabla dentro.",
  "apiErrors.fileNoPositions": "No se encontró la sección de operaciones cerradas: 'Closed Transactions' en MT4 o 'Positions' en MT5. Puede que el reporte esté incompleto.",
  "apiErrors.fileHtmlNoTable": "El archivo parece una página web guardada, pero no tiene ninguna tabla de operaciones.",
  "apiErrors.fileUnreadable": "No se pudo leer el archivo. Comprueba que no esté dañado.",
  "apiErrors.fileBadTemplate": "El archivo no coincide con la plantilla de TradeMind. Descárgala desde la vista de importar.",
  "apiErrors.fileBadDate": "No se pudo interpretar una fecha del archivo. Usa el formato AAAA-MM-DD.",
  "apiErrors.fileTooLarge": "El archivo es demasiado grande. El máximo son 25 MB.",
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
  "accounts.myAccountMT5": "Mi cuenta",
  "accounts.imported": "Cuenta importada",
  "accounts.createManual": "Crear cuenta manual",
  "accounts.nameLabel": "Nombre de la cuenta",
  "accounts.balanceLabel": "Balance inicial",
  "accounts.create": "Crear cuenta",
  "accounts.currency": "Moneda",
  "accounts.headerAccount": "Account",
  "accounts.hint":
    "Puedes llevar varias cuentas (por ejemplo, manual o importada de MT4/MT5) y cambiar entre ellas en cualquier momento. Los trades de cada cuenta se guardan por separado.",
  "accounts.empty": "Aún no tienes cuentas creadas.",
  "accounts.current": "Actual",
  "accounts.initialDeposit": "Depósito inicial ${amount}",
  "accounts.tradesCount": { one: "{n} operación", other: "{n} operaciones" },
  "accounts.useThis": "Usar esta cuenta",
  "accounts.importInstead": "¿Quieres importarla desde MT4 o MT5 en vez de crearla manual?",
  "accounts.importInsteadLink": "Importar un reporte como cuenta nueva",
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
  "import.mt5": "Importar reporte de MT4/MT5",
  "import.manual": "Importar trades manualmente",
  "import.fromFile": "Importar desde CSV/Excel",
  "import.title": "Importar",
  "import.balanceLabel": "Balance inicial",
  "import.startWeek": "Iniciar mi semana",
  "import.success": { one: "{n} operación cargada correctamente.", other: "{n} operaciones cargadas correctamente." },
  "import.hint":
    'Exporta el historial desde tu terminal: en MetaTrader 5, botón derecho → Report → Save as CSV o Guardar como .xlsx; en MetaTrader 4, botón derecho → Save as Report, que guarda un .htm. Y súbelo aquí.',
  "import.hintTemplateNote":
    "También puedes subirla ya llena: la detecto automáticamente y agrego esos trades a tu cuenta.",
  "import.downloadTemplate": "Descargar plantilla Excel",
  "import.balanceForAccount": "Balance inicial de la cuenta",
  "import.dropHere": "Haz clic para elegir un archivo o arrástralo aquí",
  "import.formats": "Formato .csv, .xlsx, .xls o .htm",

  // --- Operaciones que no se han podido importar -------------------
  // El archivo se acepta siempre: se importan las buenas y estas se explican
  // una a una. El texto sale de un codigo del backend, no de un texto escrito
  // aqui, para que exista en los dos idiomas y se pueda comprobar.
  "import.partial":
    { one: "Has importado {n} de {total} operaciones.", other: "Has importado {n} de {total} operaciones." },
  "import.rejectedTitle":
    { one: "Esta operación no se ha importado:", other: "Estas operaciones no se han importado:" },
  "import.row": "Fila {n}",
  "import.rowUnknown": "Fila no indicada",
  "import.emptyValue": "(vacío)",
  "import.showDetail": "Ver por qué",
  "import.hideDetail": "Ocultar el detalle",
  "import.why":
    { one: "{n} operación no se ha importado. El resto está bien.", other: "{n} operaciones no se han importado. El resto está bien." },
  "import.reason.symbol_empty": "No hemos podido leer el símbolo del par.",
  "import.reason.symbol_too_long": "El símbolo es demasiado largo.",
  "import.reason.direction_invalid": "El tipo no indica si la operación fue de compra o de venta.",
  "import.reason.quantity_unreadable": "No hemos podido leer cuántas unidades se operaron.",
  "import.reason.quantity_not_positive": "Una operación no puede tener 0 unidades ni un número negativo.",
  "import.reason.entry_price_unreadable": "No hemos podido leer el precio de apertura.",
  "import.reason.entry_price_not_positive": "Un precio no puede ser 0 ni negativo.",
  "import.reason.exit_price_unreadable": "No hemos podido leer el precio de cierre.",
  "import.reason.exit_price_not_positive": "Un precio no puede ser 0 ni negativo.",
  "import.fix.symbol_empty": "Corrige el símbolo en el archivo y vuelve a subirlo.",
  "import.fix.symbol_too_long": "Los símbolos son pares como EURUSD. Revisa esa celda.",
  "import.fix.direction_invalid": "En el archivo, el tipo debe decir buy o sell.",
  "import.fix.quantity_unreadable": "Revisa que la celda de volumen tenga un número.",
  "import.fix.quantity_not_positive": "Revisa el volumen de esa operación en el archivo.",
  "import.fix.entry_price_unreadable": "Revisa la celda del precio de apertura.",
  "import.fix.entry_price_not_positive": "Revisa la celda del precio de apertura.",
  "import.fix.exit_price_unreadable": "Revisa la celda del precio de cierre.",
  "import.fix.exit_price_not_positive": "Revisa la celda del precio de cierre.",

  // --- Operaciones que el usuario ya tenia ------------------------------
  // No son rechazos: no hay nada que corregir. El backend las separa porque si
  // no, subir el mismo reporte dos veces duplicaba todo y las estadisticas
  // quedaban al doble sin que se notara.
  "import.alreadyTitle":
    { one: "Esta operación ya la tenías:", other: "Estas operaciones ya las tenías:" },
  "import.already.motivo": "Ya está en tu cuenta",
  "import.already.solucion": "No la hemos vuelto a importar, así que no hay duplicados.",
  "import.allThere":
    { one: "Ya tienes esta operación. No hemos importado nada.", other: "Ya tienes estas {n} operaciones. No hemos importado nada." },
  "import.replaceAll": "Borrar todo y volver a importar",
  "import.replaceAllConfirm":
    "Se borrarán todas las operaciones de esta cuenta y se volverán a importar del archivo. Tus correcciones manuales de resultados se perderán.",

  // ------------------------------------------------------------------
  // Onboarding
  // ------------------------------------------------------------------
  "onboarding.configure": "Configura tu cuenta para comenzar",
  "onboarding.choose": "Elige cómo quieres empezar a ver tus estadísticas de trading.",
  "onboarding.loading": "Cargando...",
  "onboarding.importTitle": "Importar reporte de MT4/MT5",
  "onboarding.importDesc":
    "Sube tu reporte de MT4 o MT5 (.htm, .csv, .xlsx o .xls) y calculamos tus estadísticas automáticamente.",
  "onboarding.manualTitle": "Crear cuenta manual",
  "onboarding.manualDesc":
    "Define un balance inicial y empieza desde cero. Podrás importar tus operaciones después.",
  "onboarding.back": "Atrás",

  // ------------------------------------------------------------------
  // Origen de los datos (pastilla del header)
  // ------------------------------------------------------------------
  "datasource.mt5": "Importado desde archivo",
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
  "header.logout": "Cerrar sesión",
  "header.dashboard": "Dashboard",

  // ------------------------------------------------------------------
  // Landing (página pública)
  // ------------------------------------------------------------------

  // Navegación y portada
  "landing.nav.product": "Producto",
  "landing.nav.import": "Importar",
  "landing.nav.faq": "Preguntas",
  "landing.nav.login": "Iniciar sesión",
  "landing.nav.signup": "Crear cuenta",
  "landing.badge": "Diario de trading",
  "landing.hero.title": "El diario de trading que te dice",
  "landing.hero.accent": "cómo ganas.",
  "landing.hero.sub": "Sube el reporte real de tu broker y mira tus números: winrate, profit factor, qué días ganas y cuánto riesgo tomas. Sin operar un solo trade.",
  "landing.hero.cta": "Crear cuenta",
  "landing.hero.cta2": "Ver cómo funciona",
  "landing.hero.trust1": "Sin conectar tu broker",
  "landing.hero.trust2": "El reporte, tal como lo exporta MT5",
  "landing.hero.trust3": "Español e inglés",

  // El dashboard de ejemplo del hero
  "landing.tab.dashboard": "Dashboard",
  "landing.chip.best": "Mejor día",
  "landing.allTime.title": "Rendimiento de toda la cuenta",
  "landing.allTime.note": "Estas cifras no cambian al navegar el calendario. El mes solo mueve los días y sus resúmenes.",
  "landing.chart.title": "P&L acumulado diario",
  "landing.chart.aria": "Curva de P&L acumulado diario de una cuenta de ejemplo",

  // Franja de importación
  "landing.strip.label": "Importa desde",
  "landing.strip.1": "MetaTrader 5",
  "landing.strip.2": "Plantilla de Excel",
  "landing.strip.3": "CSV y Excel genéricos",
  "landing.strip.4": "Entrada manual",

  // El problema
  "landing.problem.eyebrow": "El problema",
  "landing.problem.title": "Sabes cuánto ganaste el mes pasado. No sabes por qué.",
  "landing.problem.lead": "Casi todo trader sabe cuánto hizo. Casi ninguno sabe por qué. Y sin esa respuesta, cada decisión sigue siendo una suposición.",
  "landing.problem.p1.title": "Operas a ciegas",
  "landing.problem.p1.body": "Sabes que fuiste rentable. No sabes en qué día de la semana, a qué hora ni con qué símbolo ganas de verdad.",
  "landing.problem.p2.title": "El resultado total no dice nada",
  "landing.problem.p2.body": "Doce meses y +8% no te dicen si fue una buena racha y once malas, o al revés.",
  "landing.problem.p3.title": "Nadie te señala el patrón",
  "landing.problem.p3.body": "Tu mejor día y tu peor día están en tus datos. Nadie te los muestra.",

  // Cómo funciona
  "landing.how.eyebrow": "Cómo funciona",
  "landing.how.title": "Tres pasos, sin cambiar cómo operas",
  "landing.how.s1.title": "Sube tu reporte",
  "landing.how.s1.body": "El archivo que tu broker ya te da. Tal cual: sin renombrar columnas ni mapear campos a mano.",
  "landing.how.s1.count": "152 posiciones cerradas",
  "landing.how.s2.title": "TradeMind calcula",
  "landing.how.s2.body": "Reconciliamos tus operaciones con FIFO y calculamos cada métrica con tus datos, no con estimaciones.",
  "landing.how.s2.buy": "Compra 0.50",
  "landing.how.s2.sell": "Venta 0.30 + 0.20",
  "landing.how.s3.title": "Ve la verdad",
  "landing.how.s3.body": "Dónde ganas, dónde pierdes y qué haces realmente con tu riesgo.",

  // Lo que verás: calendario, métricas y puntaje
  "landing.views.eyebrow": "Lo que verás",
  "landing.views.title": "Todo tu historial, en una sola pantalla",
  "landing.views.lead": "Esto es lo que ves al importar un reporte de MT5 con 152 operaciones. La interfaz es la del dashboard; las cifras son de ejemplo.",
  "landing.cal.capTitle": "Un calendario para decidir",
  "landing.cal.capBody": "Cada día con su resultado, el total del mes y tu mejor día. Responde qué días ganas.",
  "landing.cal.title": "Calendario de trading",
  "landing.cal.weekCol": "Resumen Semanal",
  "landing.cal.week": "Semana {n}",
  "landing.cal.range": "{a}–{b} {mes}",
  "landing.cal.days": { one: "{n} día", other: "{n} días" },
  "landing.cal.noTrades": "sin operaciones",
  "landing.cal.monthTotal": "Total del mes",
  "landing.cal.daysTraded": "días operados",
  "landing.cal.best": "Mejor día",
  "landing.cal.worst": "Peor día",
  "landing.metrics.title": "Ocho métricas, todas globales",
  "landing.metrics.sub": "Cifras de toda la cuenta, no del mes. Con pocas operaciones, el porcentaje de un solo mes es ruido.",
  "landing.metric.balance": "Balance",
  "landing.metric.pnl": "P&L neto",
  "landing.metric.winrate": "Winrate",
  "landing.metric.rr": "Ratio riesgo/beneficio",
  "landing.metric.pf": "Profit Factor",
  "landing.metric.trades": "Total Trades",
  "landing.metric.ev": "Expected Value",
  "landing.metric.time": "Average Trade Time",
  "landing.metric.won": "{n} ganadas",
  "landing.metric.lost": "{n} perdidas",
  "landing.radar.title": "Tu puntaje, en seis ejes",
  "landing.radar.sub": "No es una nota única: te dice qué eje está débil.",
  "landing.radar.panel": "Puntaje del trader",
  "landing.radar.aria": "Radar de seis ejes con un puntaje de ejemplo",
  "landing.radar.ax1": "% Acierto",
  "landing.radar.ax2": "Factor beneficio",
  "landing.radar.ax3": "Ganancia/pérdida",
  "landing.radar.ax4": "Recuperación",
  "landing.radar.ax5": "Drawdown máx.",
  "landing.radar.ax6": "Consistencia",

  // Otras vistas y llamada a la acción
  "landing.more.trades.title": "Trades",
  "landing.more.trades.body": "Una tabla con filtros por fecha, las columnas que tú eliges, orden, paginación y la posibilidad de editar o borrar cada operación.",
  "landing.more.accounts.title": "Cuentas",
  "landing.more.accounts.body": "Varias cuentas, cada una con su saldo, su moneda y su origen. Cambias entre ellas sin perder nada.",
  "landing.more.analytics.title": "Analytics",
  "landing.more.analytics.body": "Rendimiento por símbolo, con cinco tarjetas y selectores de métrica y de orden.",
  "landing.sampleNote": "La interfaz es la del dashboard; las cifras son de ejemplo.",

  // Importación
  "landing.import.eyebrow": "Lo que nos diferencia",
  "landing.import.title": "Importar es lo difícil. Aquí es lo fácil.",
  "landing.import.lead": "Casi todos los diarios se rompen justo aquí: columnas que no coinciden, fechas que no se leen, operaciones que se pierden. TradeMind lee el reporte de MT5 directamente. Y si tu broker no es MT5, tienes la plantilla de Excel y la entrada manual.",
  "landing.import.m1.name": "MetaTrader 5",
  "landing.import.m1.body": "El reporte de operaciones cerradas se importa tal como lo genera el broker.",
  "landing.import.m2.name": "Plantilla de Excel",
  "landing.import.m2.body": "Una plantilla con las columnas que necesitas. La llenas y la subes.",
  "landing.import.m3.name": "Entrada manual",
  "landing.import.m3.body": "Si prefieres añadirlas una por una, puedes.",
  "landing.import.m4.name": "Lector universal",
  "landing.import.m4.body": "CSV y Excel genéricos: lee la tabla y te propone las columnas.",
  "landing.import.drop": "Suelta aquí tu reporte",
  "landing.import.k1": "Archivo",
  "landing.import.k2": "Formato",
  "landing.import.k3": "Posiciones cerradas",
  "landing.import.k4": "Resultado",
  "landing.import.v2": "MetaTrader 5 · sección Positions",
  "landing.import.v4": "152 operaciones guardadas",

  // Preguntas frecuentes
  "landing.faq.eyebrow": "Preguntas",
  "landing.faq.title": "Lo que suelen preguntarnos",
  "landing.faq.note": "¿Te queda algo por resolver? Crea tu cuenta y pruébalo con tu propio reporte.",
  "landing.faq.q1": "¿Tengo que conectar mi broker?",
  "landing.faq.a1": "No. TradeMind nunca se conecta a tu broker ni te pide tus credenciales. Subes un archivo y listo.",
  "landing.faq.q2": "¿Funciona si no uso MetaTrader?",
  "landing.faq.a2": "Sí. La lectura de MT5 es automática, pero con la plantilla de Excel o la entrada manual puedes traer cualquier broker.",
  "landing.faq.q3": "¿Quién puede ver mis datos?",
  "landing.faq.a3": "Solo tú. No compartimos tus operaciones con nadie ni las usamos para nada fuera de tu propia cuenta.",
  "landing.faq.q4": "¿Puedo llevar varias cuentas?",
  "landing.faq.a4": "Sí. Cada cuenta conserva su saldo, su moneda y su historial, y puedes analizarlas por separado.",
  "landing.faq.q5": "¿Cuánto tardo en ver algo?",
  "landing.faq.a5": "En cuanto termina la importación, que es inmediata. No hay nada que esperar.",
  "landing.faq.q6": "¿Puedo corregir una operación?",
  "landing.faq.a6": "Sí. Editar y borrar operaciones está en el propio dashboard.",

  // Cierre y pie
  "landing.final.title": "Empieza por conocer la verdad.",
  "landing.final.body": "Crea una cuenta y sube tu reporte. Te lleva menos tiempo que decidir si esto te sirve.",
  "landing.legal.title": "Aviso",
  "landing.legal.body": "TradeMind es una herramienta de registro y análisis. No ofrecemos recomendaciones de inversión ni asesoría financiera, y no operamos en tu nombre. El trading con apalancamiento conlleva un alto nivel de riesgo y puede resultar en la pérdida total del capital invertido. Ninguna estadística o resultado mostrado en este sitio es una promesa de rendimiento futuro.",
  "landing.footer.rights": "Todos los derechos reservados.",

  // ------------------------------------------------------------------
  // Aviso legal, privacidad y terminos  (/legal, /privacidad, /terminos)
  // ------------------------------------------------------------------
  // LOS CINCO HUECOS: son datos que no se pueden inventar. Se substituyen en
  // es.ts y en en.ts a la vez, y se buscan por la cadena "[PENDIENTE".
  // Hay un test (tests/legal.test.mjs) que falla si queda alguno.
  //
  //   [PENDIENTE: nombre]  nombre del titular o de la empresa
  //   [PENDIENTE: nif]     NIF o CIF. Si es persona fisica, el nombre basta
  //   [PENDIENTE: email]   email de contacto
  //   [PENDIENTE: lugar]   ciudad y pais
  //   [PENDIENTE: fecha]   fecha de entrada en vigor
  "legal.backHome": "Volver al inicio",
  "login.termsRead": "Los términos",
  "login.termsAnd": "y",
  "login.privacyRead": "la política de privacidad",
  "legal.lastUpdate": "Última actualización: {fecha}",
  "legal.sections": "En esta página",
  "legal.toCta": "Empezar a usarlo",

  "legal.legal.title": "Aviso legal",
  "legal.legal.h1": "Aviso legal",
  "legal.legal.who": "Quiénes somos",
  "legal.legal.whoBody":
    "Este sitio web es operado por {nombre}, identificado con el número {nif} y con domicilio en {lugar}. Puedes escribirnos a {email}.",
  "legal.legal.use": "Condiciones de uso",
  "legal.legal.useBody":
    "El acceso y el uso de este sitio web implican la aceptación de estas condiciones. Si no estás de acuerdo con alguna de ellas, debes dejar de usar el sitio.",
  "legal.legal.ip": "Propiedad intelectual",
  "legal.legal.ipBody":
    "El nombre, el diseño, los textos y el código de este sitio pertenecen a {nombre}. Queda prohibida su reproducción sin autorización previa.",
  "legal.legal.liability": "Limitación de responsabilidad",
  "legal.legal.liabilityBody":
    "TradeMind se ofrece tal cual. No garantizamos que el servicio esté disponible sin interrupciones ni que los resultados mostrados sean exactos. No nos hacemos responsables de los daños derivados del uso del sitio.",

  "legal.privacy.title": "Política de privacidad",
  "legal.privacy.h1": "Política de privacidad",
  "legal.privacy.who": "Responsable del tratamiento",
  "legal.privacy.whoBody":
    "{nombre}, con domicilio en {lugar} y correo {email}, es responsable de los datos que se tratan en este sitio.",
  "legal.privacy.data": "Qué datos recogemos",
  "legal.privacy.dataBody":
    "Solo recogemos dos cosas: el email con el que creas una cuenta y una contraseña que guardamos cifrada, nunca en texto legible. Y las operaciones que tú subes desde el archivo de tu broker, que se quedan en tu cuenta.",
  "legal.privacy.why": "Para qué los usamos",
  "legal.privacy.whyBody":
    "Para crear tu cuenta, que se pueda iniciar sesión y para mostrarte tus propias estadísticas. No usamos tus datos para nada más.",
  "legal.privacy.keep": "Cuánto tiempo los guardamos",
  "legal.privacy.keepBody":
    "Mientras tu cuenta exista. Si nos pides que la borremos, la eliminamos de nuestra base de datos en un plazo máximo de treinta días.",
  "legal.privacy.third": "Con quién los compartimos",
  "legal.privacy.thirdBody":
    "Con nadie. No vendemos, alquilamos ni cedemos tus datos a terceros, y no los usamos para publicidad.",
  "legal.privacy.rights": "Tus derechos",
  "legal.privacy.rightsBody":
    "Puedes pedirnos en cualquier momento que te enseñemos qué datos tuyos tenemos, que los corrijamos o que los eliminemos. Para ejercer esos derechos, escribe a {email}.",
  "legal.privacy.cookies": "Cookies",
  "legal.privacy.cookiesBody":
    "No usamos cookies publicitarias ni de seguimiento. Solo guardamos en tu navegador la sesión iniciada, el idioma y tus preferencias de visualización. Nada de eso sale de tu dispositivo.",

  "legal.terms.title": "Términos y condiciones",
  "legal.terms.h1": "Términos y condiciones",
  "legal.terms.service": "Qué es el servicio",
  "legal.terms.serviceBody":
    "TradeMind es una herramienta de registro y análisis de operaciones de trading. Subes el archivo que exporta tu broker y la aplicación calcula estadísticas a partir de tus datos: resultados, días, horas y riesgo.",
  "legal.terms.advice": "No damos asesoramiento financiero",
  "legal.terms.adviceBody":
    "TradeMind no ofrece recomendaciones de inversión, asesoría financiera ni estrategias de trading, y nunca opera en tu nombre. Todo lo que ves son números calculados sobre tus operaciones, no predicciones.",
  "legal.terms.risk": "Riesgo",
  "legal.terms.riskBody":
    "El trading con apalancamiento conlleva un alto nivel de riesgo y puede provocar la pérdida total del capital invertido. Ninguna estadística ni ningún resultado mostrado en este sitio es una promesa de rendimiento futuro.",
  "legal.terms.account": "Tu cuenta",
  "legal.terms.accountBody":
    "Eres responsable de mantener tu contraseña a salvo y de lo que se haga con tu cuenta. Debes ser mayor de edad o tener autorización para contratar en tu nombre.",
  "legal.terms.data": "Tus datos",
  "legal.terms.dataBody":
    "El archivo que subes es tuyo, y puedes borrar cuando quieras todas tus operaciones. Si borras tu cuenta, se borran también.",
  "legal.terms.law": "Ley aplicable",
  "legal.terms.lawBody":
    "Estas condiciones se rigen por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales que correspondan a {lugar}.",
  "legal.terms.accept": "Al usar TradeMind aceptas estas condiciones y la política de privacidad.",

  // ------------------------------------------------------------------
  // Flujo de suscripción (/plan y /bienvenida)
  //
  // Los números del plan (precio, días de prueba) NO están escritos aquí: se
  // interpolan desde lib/plan/datos.ts. Si el precio cambia, se cambia en un
  // sitio y no en seis claves de dos idiomas.
  //
  // Lo que hay que mirar: "día 5" y "día 7" se construyen con {n} y no como
  // "Día 5" y "Día 7" fijos. Si la prueba pasara a 14 días, el aviso tiene que
  // saltar al día 12 solo, sin tocar el diccionario.
  // ------------------------------------------------------------------
  "flujo.steps": "Pasos del alta",
  "flujo.step.account": "Cuenta",
  "flujo.step.plan": "Plan",
  "flujo.step.ready": "Listo",

  "plan.kicker": "Un solo plan, todo incluido",
  "plan.title": {
    one: "Prueba TradeMind {n} día gratis",
    other: "Prueba TradeMind {n} días gratis",
  },
  "plan.subtitle":
    "Entras con todo desbloqueado desde hoy. Si no te convence, cancelas antes del día {dias} y no pagas nada.",
  "plan.howTitle": "Así funciona la prueba",
  "plan.step.today": "Hoy",
  "plan.step.dayN": { one: "Día {n}", other: "Día {n}" },
  "plan.step.hoyBody":
    "Acceso completo, sin cobro. Subes tu reporte y ves tus números.",
  "plan.step.avisoBody":
    "Te avisamos por email de que la prueba termina en dos días.",
  "plan.step.finBody":
    "Se cobran {precio} y sigues sin interrupción. Si cancelaste antes, tu acceso se pausa y tus datos se conservan.",
  "plan.badge": {
    one: "{n} día gratis",
    other: "{n} días gratis",
  },
  "plan.name": "TradeMind",
  "plan.perMonth": "al mes",
  "plan.noChargeToday": "Hoy pagas {precio}. El primer cobro es dentro de {dias} días.",
  "plan.feature.import": "Importa tu reporte de MT5 o la plantilla de Excel",
  "plan.feature.accounts": "Varias cuentas, cada una con su saldo y su moneda",
  "plan.feature.calendar": "Calendario de trading con resumen semanal",
  "plan.feature.metrics": "Ocho métricas y puntaje del trader en seis ejes",
  "plan.feature.analytics": "Analytics por símbolo",
  "plan.feature.languages": "Español e inglés",
  "plan.feature.cancel": "Sin permanencia: cancelas cuando quieras",
  "plan.cta": { one: "Empezar mi día gratis", other: "Empezar mis {n} días gratis" },
  "plan.ctaNote": "Te pedimos la tarjeta en el siguiente paso. No se cobra nada hasta el día {dias}.",

  "welcome.title": "Tu prueba ya empezó",
  "welcome.body":
    "Tienes acceso completo hasta el {fecha}. Te avisamos por email dos días antes de que termine.",
  "welcome.row.plan": "Plan",
  "welcome.row.planValue": "TradeMind · todo incluido",
  "welcome.row.ends": "La prueba termina",
  "welcome.row.charge": "Primer cobro",
  "welcome.row.chargeValue": "{precio} el {fecha}",
  "welcome.startTitle": "Para empezar",
  "welcome.step1.title": "Sube tu reporte",
  "welcome.step1.body":
    "El de MT5 o la plantilla de Excel. Si algo no entra, te decimos qué fila y por qué.",
  "welcome.step2.title": "Mira tus ocho métricas",
  "welcome.step2.body":
    "Balance, winrate, profit factor, expected value y el resto, con tus datos reales.",
  "welcome.step3.title": "Abre el calendario",
  "welcome.step3.body":
    "Cada día con su resultado, el total del mes y tu mejor y peor día.",
  "welcome.cta": "Ir a mi dashboard",
  "welcome.changeMind": "¿Cambias de idea?",
  "welcome.manageSub": "Gestiona tu suscripción",

  // ------------------------------------------------------------------
  // Pago (/pago)
  //
  // El formulario no cobra nada todavia. Las frases que prometen seguridad
  // ("pago.secure") solo son verdad cuando el pago lo hace un tercero.
  // ------------------------------------------------------------------
  "pago.back": "Cambiar de plan",
  "pago.title": {
    one: "Empieza tu prueba de {n} día gratis",
    other: "Empieza tu prueba de {n} días gratis",
  },
  "pago.lead":
    "Añade una tarjeta para activar tus {dias} días. No se cobra nada hoy.",
  "pago.summary": "Resumen",
  "pago.planNote": "Plan único, todo incluido · al mes",
  "pago.trialLine": {
    one: "Prueba gratuita de {n} día",
    other: "Prueba gratuita de {n} días",
  },
  "pago.zero": "$0,00",
  "pago.totalToday": "Total a pagar hoy",
  "pago.chargeOn":
    "El {fecha} se cobran {precio} y después cada mes. Cancelas cuando quieras, y si lo haces antes de esa fecha no pagas nada.",
  "pago.taxes":
    "Si en tu país aplican impuestos, se muestran antes de confirmar y se suman al precio.",
  "pago.method": "Método de pago",
  "pago.email": "Email",
  "pago.emailEjemplo": "tu@email.com",
  "pago.cardName": "Nombre en la tarjeta",
  "pago.cardNamePh": "Como aparece en la tarjeta",
  "pago.cardNumber": "Número de tarjeta",
  "pago.expiry": "Caducidad",
  "pago.cvc": "CVC",
  "pago.postalCode": "Código postal",
  "pago.postalCodePh": "Tu código postal",
  "pago.cta": {
    one: "Empezar prueba de {n} día gratis",
    other: "Empezar prueba de {n} días gratis",
  },
  "pago.secure":
    "Pago seguro. TradeMind no guarda los datos de tu tarjeta: los procesa el servicio de cobro.",

  // ------------------------------------------------------------------
  // Facturación (/facturacion)
  //
  // Una pantalla con cinco estados. Las claves de cada estado van con el
  // prefijo del estado, asi que añadir uno nuevo es añadir un bloque y no
  // tocar los otros cuatro.
  // ------------------------------------------------------------------
  "nav.billing": "Facturación",
  "billing.sections": "Secciones",
  "billing.title": "Facturación",
  "billing.planName": "TradeMind · todo incluido",
  "billing.badge.en-prueba": "En prueba",
  "billing.badge.termina-pronto": "Termina pronto",
  "billing.badge.activa": "Activa",
  "billing.badge.cancelada": "Cancelada",
  "billing.badge.pago-fallido": "Pago fallido",
  "billing.desc.en-prueba":
    "Primer cobro de {precio} el {fecha}. Hoy no pagas nada y puedes cancelar antes sin coste.",
  "billing.desc.termina-pronto":
    "Tu prueba termina en {quedan} días. El {fecha} se cobran {precio} y sigues sin interrupción.",
  "billing.desc.activa":
    "Próximo cobro: {precio} el {fecha}. Cancelas cuando quieras.",
  "billing.desc.cancelada":
    "Tienes acceso hasta el {fecha}. No se cobrará más y tus datos se conservan.",
  "billing.desc.pago-fallido":
    "No pudimos cobrar los {precio} del {fecha}. Volveremos a intentarlo en 3 días; si tampoco funciona, tu acceso se pausa.",
  "billing.banner.en-prueba.lead": "Prueba gratuita",
  "billing.banner.en-prueba.body":
    "Día {n} de {dias}. Termina el {fecha}.",
  "billing.banner.en-prueba.cta": "Ver mi plan",
  "billing.banner.termina-pronto.lead": "Tu prueba termina en {quedan} días",
  "billing.banner.termina-pronto.body":
    "El {fecha} se cobran {precio}.",
  "billing.banner.termina-pronto.cta": "Ver mi plan",
  "billing.banner.cancelada.lead": "Suscripción cancelada",
  "billing.banner.cancelada.body": "Tienes acceso hasta el {fecha}.",
  "billing.banner.cancelada.cta": "Reactivar",
  "billing.banner.pago-fallido.lead": "No pudimos cobrar tu tarjeta",
  "billing.banner.pago-fallido.body":
    "Actualízala para no perder el acceso.",
  "billing.banner.pago-fallido.cta": "Actualizar tarjeta",
  "billing.progress": "Progreso de la prueba",
  "billing.dayOf": "Día {n} de {dias}",
  "billing.endsOn": "Termina el {fecha}",
  "billing.paymentMethod": "Método de pago",
  "billing.cardSample": "Visa ···· 4242",
  "billing.cardExpires": "Caduca {fecha}",
  "billing.cardDeclined": "Tu banco rechazó el cobro",
  "billing.changeCard": "Cambiar tarjeta",
  "billing.invoices": "Facturas",
  "billing.paid": "Pagada",
  "billing.failed": "Fallida",
  "billing.noInvoices":
    "Aún no hay facturas. La primera llega con el primer cobro, el {fecha}.",
  "billing.noInvoicesCancel": "No hay facturas pendientes.",
  "billing.reactivate": "Reactivar suscripción",
  "billing.cancel": "Cancelar suscripción",
  "billing.confirm.title": "¿Cancelar tu suscripción?",
  "billing.confirm.body":
    "Si cancelas ahora, tu prueba sigue hasta el {fecha} y no se cobra nada.",
  "billing.confirm.keep1": "Conservas todos tus datos.",
  "billing.confirm.keep2": "Puedes volver cuando quieras.",
  "billing.confirm.yes": "Sí, cancelar",
  "billing.confirm.keep": "Mantener mi plan",

  // ------------------------------------------------------------------
  // Acceso pausado (/acceso-pausado)
  //
  // Dos motivos, una sola pantalla. Solo cambian el icono, el titulo, el
  // parrafo y el boton.
  // ------------------------------------------------------------------
  "pausa.prueba-terminada.title": "Tu prueba gratuita terminó",
  "pausa.prueba-terminada.lead":
    "Fueron {dias} días con todo desbloqueado. Para seguir viendo tus métricas y subiendo reportes, activa el plan.",
  "pausa.prueba-terminada.cta": "Activar TradeMind",
  "pausa.pago-no-recibido.title": "Tu acceso está en pausa",
  "pausa.pago-no-recibido.lead":
    "No pudimos cobrar la suscripción y se acabaron los reintentos. Actualiza tu tarjeta y vuelves a entrar al momento.",
  "pausa.pago-no-recibido.cta": "Actualizar tarjeta y reactivar",
  "pausa.safeTitle": "Tus datos están a salvo",
  "pausa.safeCount": "{n} operaciones · {cuentas} cuenta",
  "pausa.safeBody":
    "No borramos nada. En cuanto reactives el plan, lo encuentras todo como lo dejaste.",
  "logout": "Cerrar sesión",

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