/**
 * Diccionario en inglés.
 *
 * El tipo `Record<keyof typeof es, ...>` obliga a que TODA clave que exista
 * en el diccionario español tenga traducción. Si falta una, TypeScript falla
 * al compilar y te avisa antes de que se vea en pantalla.
 */

import type { BaseDe, es } from "./es";

export const en: { [K in keyof typeof es]: BaseDe<(typeof es)[K]> } = {
  // ------------------------------------------------------------------
  // Navegación
  // ------------------------------------------------------------------
  "nav.summary": "Summary",
  "nav.trades": "Trades",
  "nav.accounts": "Accounts",
  "nav.analytics": "Analytics",

  // ------------------------------------------------------------------
  // Comunes
  // ------------------------------------------------------------------
  "common.loading": "Loading...",
  "common.readingFile": "Reading file…",
  "common.select": "Select",
  "common.all": "All",
  "common.buy": "Buy",
  "common.sell": "Sell",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.close": "Close",
  "common.thisMonth": "This month",
  "common.today": "Today",
  "common.now": "Now",
  "common.hourShort": "Hr",
  "common.minuteShort": "Min",
  "common.settings": "Settings",
  "common.noAccount": "No account",
  "common.of": "of",
  "common.resetView": "Resets filters, rows shown and columns",

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  "login.welcome": "Welcome Back!",
  "login.subtitle": "Let's Get You Signed In",
  "login.email": "Email",
  "login.password": "Password",
  "login.forgot": "Forgot Password?",
  "login.submit": "Login",
  "login.quickLogin": "Quick login via",
  "login.newHere": "New around here?",
  "login.createAccount": "Set up your account",
  "login.wrongCredentials": "Wrong email or password",

  // ------------------------------------------------------------------
  // Errores
  // ------------------------------------------------------------------
  "errors.noActiveAccount": "No active account selected.",
  "errors.symbolRequired": "Symbol is required.",
  "errors.openDateRequired": "Open date is required.",
  "errors.invalidBalance": "Enter a valid initial balance (0 or more).",
  "errors.invalidBalanceBeforeUpload":
    "Enter a valid initial balance (0 or more) before uploading the file.",
  "errors.accountCreateFailed": "Could not create the account. Please try again.",
  "errors.accountCreateError": "An error occurred while creating the account. Please try again.",
  "errors.accountUpdateFailed": "Could not save the account. Please try again.",
  "errors.accountDeleteFailed": "Could not delete the account. Please try again.",
  "errors.nameRequired": "The account name cannot be empty.",
  "errors.tradeSaveFailed": "Could not save the trade. Please check the data.",
  "errors.fileProcessing": "Error processing the file.",

  /* Messages returned by the API. The backend sends a code and these are its
     translations, so the backend never needs to know anyone's language. */
  "apiErrors.emailTaken": "That email is already registered.",
  "apiErrors.badCredentials": "Wrong email or password.",
  "apiErrors.sessionInvalid": "Your session expired. Please sign in again.",
  "apiErrors.accountNotFound": "That account no longer exists.",
  "apiErrors.accountHasTrades": "This account has {n} trades. Delete them too to remove the account.",
  "apiErrors.tradeNotFound": "That trade no longer exists.",
  "apiErrors.fileBadExtension": "The file must be .xlsx, .xls or .csv: an MT5 report or the TradeMind template.",
  "apiErrors.fileEmpty": "The file is empty: no table was found inside.",
  "apiErrors.fileNoPositions": "No 'Positions' section found in the file. This looks like an incomplete MT5 report.",
  "apiErrors.fileHtmlNoTable": "The file looks like a saved web page, but it has no trades table.",
  "apiErrors.fileUnreadable": "The file could not be read. Check that it isn't damaged.",
  "apiErrors.fileBadTemplate": "The file doesn't match the TradeMind template. Download it from the import view.",
  "apiErrors.fileBadDate": "A date in the file could not be read. Use the YYYY-MM-DD format.",
  "apiErrors.emptyName": "The account name cannot be empty.",
  "apiErrors.negativeBalance": "The starting balance cannot be negative.",

  /* Pydantic validation errors. The only ones we can't avoid in the backend:
     Pydantic writes them in English and there's no way to change that without
     rewriting its messages. They're translated by `type`, which IS stable. */
  "apiErrors.fieldRequired": "{field} is required.",
  "apiErrors.fieldInvalid": "{field} is not valid.",
  "apiErrors.fieldTooShort": "{field} is too short.",
  "apiErrors.fieldTooLong": "{field} is too long.",
  "apiErrors.fieldMinValue": "{field} must be {n} or more.",
  "apiErrors.fieldMaxValue": "{field} must be {n} or less.",
  "apiErrors.fieldMustBeText": "{field} must be text.",
  "apiErrors.fieldMustBeNumber": "{field} must be a number.",
  "apiErrors.fieldMustBeWholeNumber": "{field} must be a whole number.",
  "apiErrors.fieldInvalidChoice": "The value for {field} is not a valid choice.",

  // ------------------------------------------------------------------
  // Tarjetas de indicadores (vista Resumen)
  // ------------------------------------------------------------------
  "kpi.balance": "Balance",
  "kpi.netPnl": "Net P&L",
  "kpi.winrate": "Win rate",
  "kpi.riskReward": "Risk/reward ratio",
  "kpi.profitFactor": "Profit Factor",
  "kpi.totalTrades": "Total Trades",
  "kpi.tradesWon": { one: "{n} won", other: "{n} won" },
  "kpi.tradesLost": { one: "{n} lost", other: "{n} lost" },
  "kpi.expectedValue": "Expected Value",
  "kpi.expectedValueHelp":
    "Average expected profit/loss per trade: (win rate × average win) + (loss rate × average loss). Equivalent to net P&L ÷ total trades.",
  "kpi.avgTradeTime": "Average Trade Time",
  "chart.monthBandHint": "Teal band: the month you're viewing in the calendar. The line covers all your history.",
  "kpi.allTimeTitle": "Whole-account performance",
  "kpi.allTimeNote": "These figures don't change as you browse the calendar. The month only moves the days and their summaries.",

  // ------------------------------------------------------------------
  // Gráfico de PnL acumulado
  // ------------------------------------------------------------------
  "chart.cumulativePnl": "Daily cumulative P&L",
  "chart.tradeCount": { one: "{n} trade", other: "{n} trades" },
  "chart.profit": "Profit: {pnl}",

  // ------------------------------------------------------------------
  // Radar "Puntaje del trader"
  // ------------------------------------------------------------------
  "score.title": "Trader score",
  "radar.winRate": "% Win rate",
  "radar.profitFactor": "Profit factor",
  "radar.wlRatio": "Win/loss ratio",
  "radar.recovery": "Recovery",
  "radar.maxDrawdown": "Max drawdown",
  "radar.consistency": "Consistency",

  // ------------------------------------------------------------------
  // Resumen semanal
  // ------------------------------------------------------------------
  "weekly.title": "Weekly summary",
  "weekly.empty": "No trades yet.",
  "weekly.week": "Week {n}",
  "weekly.dayCount": { one: "{n} day", other: "{n} days" },
  "weekly.noTrades": "no trades",

  // ------------------------------------------------------------------
  // Resumen del mes bajo el calendario
  // ------------------------------------------------------------------
  "cal.noTrades": "no trades this month",
  "cal.monthTotal": "Month total",
  "cal.title": "Trading calendar",
  "cal.weekColumn": "Weekly summary",
  "cal.prevMonth": "Previous month",
  "cal.nextMonth": "Next month",
  "cal.backToCurrent": "Back to current month",
  "cal.daysOperated": { one: "{n} day traded", other: "{n} days traded" },
  "cal.bestDay": "Best day",
  "cal.worstDay": "Worst day",

  // ------------------------------------------------------------------
  // Vista Analytics
  // ------------------------------------------------------------------
  "analytics.empty": "No trades to show in Analytics yet.",
  "analytics.metric.pnl": "P&L",
  "analytics.metric.winrate": "Win rate",
  "analytics.metric.count": "Number of Trades",
  "analytics.order.asc": "Increasing",
  "analytics.order.desc": "Decreasing",
  "analytics.bestSum": "Best Symbol Sum",
  "analytics.bestSumHelp":
    "Symbol with the highest total P&L across all its trades.",
  "analytics.worstSum": "Worst Symbol Sum",
  "analytics.worstSumHelp":
    "Symbol with the lowest total P&L across all its trades.",
  "analytics.bestAvg": "Best Symbol Avg",
  "analytics.bestAvgHelp":
    "Symbol with the highest average P&L per trade.",
  "analytics.worstAvg": "Worst Symbol Avg",
  "analytics.worstAvgHelp":
    "Symbol with the lowest average P&L per trade.",
  "analytics.numSymbols": "Number of Symbols",
  "analytics.symbolPerformance": "Symbol Performance",
  "analytics.numSymbolsHelp": "Number of distinct symbols traded.",

  // ------------------------------------------------------------------
  // Cuentas
  // ------------------------------------------------------------------
  "accounts.title": "Accounts",
  "accounts.count": { one: "{n} account", other: "{n} accounts" },
  "accounts.new": "New account",
  "accounts.myAccount": "My account",
  "accounts.myAccountMT5": "My MT5 account",
  "accounts.imported": "Imported account",
  "accounts.createManual": "Create account manually",
  "accounts.nameLabel": "Account name",
  "accounts.balanceLabel": "Initial balance",
  "accounts.create": "Create account",
  "accounts.currency": "Currency",
  "accounts.headerAccount": "Account",
  "accounts.hint":
    "You can keep several accounts (for example, manual and MT5 imported) and switch between them at any time. Each account's trades are stored separately.",
  "accounts.empty": "You have no accounts yet.",
  "accounts.current": "Current",
  "accounts.initialDeposit": "Initial deposit ${amount}",
  "accounts.tradesCount": { one: "{n} trade", other: "{n} trades" },
  "accounts.useThis": "Use this account",
  "accounts.importInstead": "Would you rather import it from MT5 instead of creating it manually?",
  "accounts.importInsteadLink": "Import CSV as a new account",
  "accounts.edit": "Edit account",
  "accounts.editTitle": "Edit account",
  "accounts.saveChanges": "Save changes",
  "accounts.delete": "Delete account",
  "accounts.deleteWarn": "This action cannot be undone.",
  "accounts.deleteConfirm": "Are you sure you want to delete the account",
  "accounts.deleteHasTrades":
    "This account has {n} trade(s). They will be deleted too.",
  "accounts.wasDeleted": "The account was deleted.",
  "accounts.wasUpdated": "The account was updated.",

  // ------------------------------------------------------------------
  // Trades
  // ------------------------------------------------------------------
  "trades.title": "Trade history",
  "trades.count": { one: "{n} trade", other: "{n} trades" },
  "trades.countOf": "{shown} of {total} trades",
  "trades.add": "Add trade",
  "trades.importManual": "Import manually",
  "trades.addEditTitle": "Add / Edit trade",
  "trades.addTitle": "Add trade",
  "trades.editTitle": "Edit trade",
  "trades.deleteTitle": "Delete trade",
  "trades.deleteConfirm":
    "Are you sure you want to delete this trade{details}? This action cannot be undone.",
  "trades.deleteAllConfirm":
    "Are you sure you want to delete ALL trades ({n}) from this account? This action cannot be undone.",
  "trades.deleteAll": "Delete all trades",
  "trades.deleteAllWarn": "Deletes all trades from this account",
  "trades.viewDetail": "View details",
  "trades.detailTitle": "Trade details",
  "trades.detailSummary": "Summary",
  "trades.detailOpen": "Open",
  "trades.detailClose": "Close",
  "trades.detailPnl": "P&L Summary",
  "trades.detailDetails": "Details",
  "trades.detailPositionId": "Position (Trade ID)",
  "trades.detailDuration": "Duration",
  "trades.close": "Close",
  "trades.resetView": "Resets filters, rows shown and columns",
  "trades.startWeek": "Start my week",
  "trades.dateFrom": "Date from",
  "trades.dateTo": "Date to",
  "trades.pageSize": "Show",
  "trades.pageSizeAll": "All",
  "trades.pageSizeN": "{n} Trades",
  "trades.columns": "Columns",
  "trades.apply": "Apply",
  "trades.clear": "Clear",
  "trades.clearFilters": "Clear filters",
  "trades.deleteTradesBtn": "Delete trades",
  "trades.empty": "No trades to show.",
  "trades.prev": "‹ Previous",
  "trades.next": "Next ›",
  "trades.pageOf": "Page {page} of {total}",
  "trades.results": "results",

  // Columnas de la tabla
  "col.openTime": "Open",
  "col.position": "Position",
  "col.symbol": "Symbol",
  "col.type": "Type",
  "col.volume": "Volume",
  "col.openPrice": "Open price",
  "col.sl": "S/L",
  "col.tp": "T/P",
  "col.closeTime": "Close",
  "col.closePrice": "Close price",
  "col.commission": "Commission",
  "col.swap": "Swap",
  "col.profit": "Profit",
  "col.pnl": "Net",

  // Campos del formulario de trade
  "field.position": "Position",
  "field.symbol": "Symbol",
  "field.volume": "Volume",
  "field.openPrice": "Open price",
  "field.closePrice": "Close price",
  "field.auto": "Auto",
  "field.commission": "Commission",
  "field.swap": "Swap",
  "field.profit": "Profit",
  "field.pnl": "Net",

  // ------------------------------------------------------------------
  // Importar
  // ------------------------------------------------------------------
  "import.mt5": "Import MT5 report",
  "import.manual": "Import trades manually",
  "import.fromFile": "Import from CSV/Excel",
  "import.title": "Import",
  "import.balanceLabel": "Initial balance",
  "import.startWeek": "Start my week",
  "import.success": { one: "{n} trade loaded successfully.", other: "{n} trades loaded successfully." },
  "import.hint":
    'Export your "Trade History Report" from MetaTrader 5 (right-click the history → Report → Save as CSV or Save as .xlsx) and upload it here.',
  "import.hintTemplateNote":
    "You can also upload it already filled in: I detect it automatically and add those trades to your account.",
  "import.downloadTemplate": "Download Excel template",
  "import.balanceForAccount": "Account initial balance",
  "import.dropHere": "Click to choose a file or drag it here",
  "import.formats": "Format .csv, .xlsx or .xls",

  // ------------------------------------------------------------------
  // Onboarding
  // ------------------------------------------------------------------
  "onboarding.configure": "Set up your account to get started",
  "onboarding.choose": "Choose how you want to start seeing your trading statistics.",
  "onboarding.loading": "Loading...",
  "onboarding.importTitle": "Import from CSV/Excel",
  "onboarding.importDesc":
    "Upload your MT5 report (.csv or .xlsx) and we will calculate your statistics automatically.",
  "onboarding.manualTitle": "Create account manually",
  "onboarding.manualDesc":
    "Set an initial balance and start from scratch. You can import your trades later.",
  "onboarding.back": "Back",

  // ------------------------------------------------------------------
  // Origen de los datos (pastilla del header)
  // ------------------------------------------------------------------
  "datasource.mt5": "MT5 imported",
  "datasource.manual": "Manual",
  "datasource.none": "No account",

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------
  "header.currency": "Currency",
  "header.filters": "Filters",
  "header.dateRange": "Date range",
  "header.askAI": "Ask the AI",
  "header.changeTheme": "Change theme",
  "header.dashboard": "Dashboard",

  // ------------------------------------------------------------------
  // Landing (página pública)
  // ------------------------------------------------------------------
  "landing.badge": "Trading journal",
  "landing.nav.login": "Sign in",
  "landing.nav.signup": "Create account",

  "landing.hero.title": "The trading journal that tells you",
  "landing.hero.titleAccent": "how you win.",
  "landing.hero.sub": "Upload your broker's real report and look at your numbers: win rate, profit factor, which days you make money and how much risk you take. Without trading a single position.",
  "landing.hero.cta": "Create account",
  "landing.hero.cta2": "See the dashboard",

  "landing.problem.eyebrow": "The problem",
  "landing.problem.title": "Your win rate isn't the one you think",
  "landing.problem.body": "Every trader knows how much they made last month. Almost none knows why. And without that answer, every decision is still a guess.",
  "landing.problem.p1.title": "You trade blind",
  "landing.problem.p1.body": "You know you were profitable. You don't know which weekday, what time, or on which symbol you actually make money.",
  "landing.problem.p2.title": "The total result says nothing",
  "landing.problem.p2.body": "Twelve months and +8% won't tell you whether that month was one good streak and eleven bad ones, or the other way round.",
  "landing.problem.p3.title": "Nobody points out the pattern",
  "landing.problem.p3.body": "Your best day and your worst day are in your data. Nobody shows them to you.",

  "landing.how.eyebrow": "How it works",
  "landing.how.title": "Three steps, without changing how you trade",
  "landing.how.s1.title": "Upload your report",
  "landing.how.s1.body": "The file your broker already gives you. As it is: no renaming columns and no mapping fields by hand.",
  "landing.how.s2.title": "TradeMind calculates",
  "landing.how.s2.body": "We reconcile your trades with FIFO and compute every metric from your data, not from estimates.",
  "landing.how.s3.title": "See the truth",
  "landing.how.s3.body": "Where you make money, where you lose it, and what you're really doing with your risk.",

  "landing.views.eyebrow": "What you'll see",
  "landing.views.title": "Four views, one place",
  "landing.views.lead": "Real crops from the dashboard, with 152 trades imported from an MT5 report. Not renderings.",
  "landing.stack.kpis": "Metrics",
  "landing.stack.calendario": "Calendar",
  "landing.stack.grafico": "Chart",
  "landing.stack.radar": "Score",
  "landing.blocks.kpis.title": "Eight metrics, all of them global",
  "landing.blocks.kpis.body": "Balance, net PnL, win rate, risk/reward ratio, profit factor, expected value and average trade duration. These are whole-account figures, not the month you're looking at: with few trades, one month's percentage is noise.",
  "landing.blocks.calendario.title": "A calendar you can actually decide with",
  "landing.blocks.calendario.body": "Every day with its result next to it, the month total, your best day and a summary for each week. That's what answers \"which days do I make money\", which no overall total can answer.",
  "landing.blocks.grafico.title": "The chart that doesn't lie to you",
  "landing.blocks.grafico.body": "Cumulative PnL with every trade marked. The turquoise band marks the month you're viewing, but the curve isn't cropped: you see the month inside your whole history, not the month on its own.",
  "landing.blocks.radar.title": "Your score, across six axes",
  "landing.blocks.radar.body": "Win rate, profit factor, win/loss ratio, maximum drawdown, recovery and consistency. It isn't one overall grade: it tells you which specific axis is weak.",
  "landing.views.summary.title": "Summary",
  "landing.views.summary.body": "Eight global metrics, the cumulative PnL chart, the six-axis radar with your score, a day-by-day calendar and a summary for every week.",
  "landing.views.trades.title": "Trades",
  "landing.views.trades.body": "A table with date filters, the columns you choose, sorting, pagination, and the ability to edit or delete every trade.",
  "landing.views.accounts.title": "Accounts",
  "landing.views.accounts.body": "Several accounts, each with its balance, its currency and its source. Switch between them without losing anything.",
  "landing.views.analytics.title": "Analytics",
  "landing.views.analytics.body": "Performance by symbol, with five cards and a selector for metric and sort order.",

  "landing.import.eyebrow": "What sets us apart",
  "landing.import.title": "Importing is the hard part, and that's not a competition for us",
  "landing.import.body": "Almost every journal falls apart right here: columns that don't match, dates that won't parse, trades that get lost. TradeMind reads the MT5 report directly. And if your broker isn't MT5, you have the Excel template and manual entry.",
  "landing.import.mt5.title": "MetaTrader 5",
  "landing.import.mt5.body": "The closed-trades report is imported exactly as the broker generates it.",
  "landing.import.excel.title": "Excel template",
  "landing.import.excel.body": "A template with the columns you need. You fill it in and upload it.",
  "landing.import.manual.title": "Manual entry",
  "landing.import.manual.body": "If you'd rather add them one by one, you can.",
  "landing.import.universal.title": "Universal reader",
  "landing.import.universal.body": "Generic CSV and Excel files: it reads the table and proposes the columns for you.",

  "landing.langs.eyebrow": "Language",
  "landing.langs.title": "Two languages, properly done",
  "landing.langs.body": "The entire interface is available in Spanish and English, including error messages and form validation. This isn't machine translation: if a string isn't translated, the application doesn't compile.",

  "landing.faq.eyebrow": "Questions",
  "landing.faq.title": "What people usually ask us",
  "landing.faq.q1": "Do I have to connect my broker?",
  "landing.faq.a1": "No. TradeMind never connects to your broker and never asks for your credentials. You upload a file and you're done.",
  "landing.faq.q2": "Does it work if I don't use MetaTrader?",
  "landing.faq.a2": "Yes. The MT5 reader is automatic, but with the Excel template or manual entry you can bring in any broker.",
  "landing.faq.q3": "Who can see my data?",
  "landing.faq.a3": "Only you. We don't share trades with anyone and don't use them for anything outside your own account.",
  "landing.faq.q4": "Can I track several accounts?",
  "landing.faq.a4": "Yes. Each account keeps its balance, its currency and its history, and you can analyse them separately.",
  "landing.faq.q5": "How long until I see anything?",
  "landing.faq.a5": "As soon as the import finishes, which is immediate. There's nothing to wait for.",
  "landing.faq.q6": "Can I correct a trade?",
  "landing.faq.a6": "Yes. Editing and deleting trades is right there in the dashboard.",

  "landing.final.title": "Start by knowing the truth",
  "landing.final.body": "Create an account and upload your report. It takes you less time than deciding whether this is useful to you.",

  "landing.legal.title": "Notice",
  "landing.legal.body": "TradeMind is a record-keeping and analysis tool. We do not provide investment recommendations or financial advice, and we do not trade on your behalf. Leveraged trading carries a high level of risk and can result in the total loss of your invested capital. No statistic or result shown on this website is a promise of future performance.",
  "landing.footer.rights": "All rights reserved.",

  // ------------------------------------------------------------------
  // Meses y días
  // ------------------------------------------------------------------
  "months.full": [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  "months.short": [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  "dow.short": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};