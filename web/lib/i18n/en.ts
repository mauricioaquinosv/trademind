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
  // Login and sign-up (one screen, two modes)
  // ------------------------------------------------------------------
  "login.titleSignup": "Create your account",
  "login.subtitleSignup": "Upload your report and see your real numbers in minutes.",
  "login.titleLogin": "Good to see you again",
  "login.subtitleLogin": "Sign in to pick up your journal.",
  "login.google": "Continue with Google",
  "login.googleLogin": "Sign in with Google",
  "login.googleSoon": "Google sign-in is coming soon. For now, use your email.",
  "login.or": "or with your email",
  "login.email": "Email",
  "login.emailPh": "you@email.com",
  "login.password": "Password",
  "login.passwordPh": "Your password",
  "login.passwordHint": "At least 8 characters.",
  "login.passwordTooShort": "The password must be at least 8 characters long.",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "login.forgot": "Forgot your password?",
  "login.submit": "Sign in",
  "login.submitSignup": "Create account",
  "login.terms": "By creating your account you accept the Terms and the Privacy Policy.",
  "login.haveAccount": "Already have an account?",
  "login.signInLink": "Sign in",
  "login.newHere": "New here?",
  "login.createAccount": "Create your account",
  "login.wrongCredentials": "Wrong email or password",
  "login.genericError": "Something went wrong. Please try again.",
  "login.networkError": "Couldn't reach the server. Check your connection and try again.",

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

  // --- Trades that could not be imported ----------------------------
  // The file is always accepted: the good ones go in and these are explained one
  // by one. The text comes from a code sent by the backend, not from text
  // written here, so that it exists in both languages and can be checked.
  "import.partial":
    { one: "You imported {n} of {total} trades.", other: "You imported {n} of {total} trades." },
  "import.rejectedTitle":
    { one: "This trade was not imported:", other: "These trades were not imported:" },
  "import.row": "Row {n}",
  "import.rowUnknown": "Row not given",
  "import.emptyValue": "(empty)",
  "import.showDetail": "See why",
  "import.hideDetail": "Hide the details",
  "import.why":
    { one: "{n} trade was not imported. The rest is fine.", other: "{n} trades were not imported. The rest is fine." },
  "import.reason.symbol_empty": "We could not read the pair symbol.",
  "import.reason.symbol_too_long": "The symbol is too long.",
  "import.reason.direction_invalid": "The type does not say whether the trade was a buy or a sell.",
  "import.reason.quantity_unreadable": "We could not read how many units were traded.",
  "import.reason.quantity_not_positive": "A trade cannot have 0 units or a negative number.",
  "import.reason.entry_price_unreadable": "We could not read the opening price.",
  "import.reason.entry_price_not_positive": "A price cannot be 0 or negative.",
  "import.reason.exit_price_unreadable": "We could not read the closing price.",
  "import.reason.exit_price_not_positive": "A price cannot be 0 or negative.",
  "import.fix.symbol_empty": "Fix the symbol in the file and upload it again.",
  "import.fix.symbol_too_long": "Symbols are pairs like EURUSD. Check that cell.",
  "import.fix.direction_invalid": "In the file, the type must say buy or sell.",
  "import.fix.quantity_unreadable": "Check that the volume cell has a number.",
  "import.fix.quantity_not_positive": "Check the volume of that trade in the file.",
  "import.fix.entry_price_unreadable": "Check the opening price cell.",
  "import.fix.entry_price_not_positive": "Check the opening price cell.",
  "import.fix.exit_price_unreadable": "Check the closing price cell.",
  "import.fix.exit_price_not_positive": "Check the closing price cell.",

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
  // Landing (public page)
  // ------------------------------------------------------------------

  // Navigation and hero
  "landing.nav.product": "Product",
  "landing.nav.import": "Import",
  "landing.nav.faq": "Questions",
  "landing.nav.login": "Login",
  "landing.nav.signup": "Create account",
  "landing.badge": "Trading journal",
  "landing.hero.title": "The trading journal that tells you",
  "landing.hero.accent": "how you win.",
  "landing.hero.sub": "Upload your broker's real report and look at your numbers: win rate, profit factor, which days you make money and how much risk you take. Without trading a single position.",
  "landing.hero.cta": "Create account",
  "landing.hero.cta2": "See how it works",
  "landing.hero.trust1": "No broker connection",
  "landing.hero.trust2": "The report, as MT5 exports it",
  "landing.hero.trust3": "Spanish and English",

  // The hero's sample dashboard
  "landing.tab.dashboard": "Dashboard",
  "landing.chip.best": "Best day",
  "landing.allTime.title": "Whole-account performance",
  "landing.allTime.note": "These figures don't change as you browse the calendar. The month only moves the days and their summaries.",
  "landing.chart.title": "Daily cumulative P&L",
  "landing.chart.aria": "Daily cumulative P&L curve of a sample account",

  // Import strip
  "landing.strip.label": "Import from",
  "landing.strip.1": "MetaTrader 5",
  "landing.strip.2": "Excel template",
  "landing.strip.3": "Generic CSV and Excel",
  "landing.strip.4": "Manual entry",

  // The problem
  "landing.problem.eyebrow": "The problem",
  "landing.problem.title": "You know what you made last month. You don't know why.",
  "landing.problem.lead": "Every trader knows how much they made. Almost none knows why. And without that answer, every decision is still a guess.",
  "landing.problem.p1.title": "You trade blind",
  "landing.problem.p1.body": "You know you were profitable. You don't know which weekday, what time, or on which symbol you actually make money.",
  "landing.problem.p2.title": "The total result says nothing",
  "landing.problem.p2.body": "Twelve months and +8% won't tell you whether that was one good streak and eleven bad ones, or the other way round.",
  "landing.problem.p3.title": "Nobody points out the pattern",
  "landing.problem.p3.body": "Your best day and your worst day are in your data. Nobody shows them to you.",

  // How it works
  "landing.how.eyebrow": "How it works",
  "landing.how.title": "Three steps, without changing how you trade",
  "landing.how.s1.title": "Upload your report",
  "landing.how.s1.body": "The file your broker already gives you. As it is: no renaming columns and no mapping fields by hand.",
  "landing.how.s1.count": "152 closed positions",
  "landing.how.s2.title": "TradeMind calculates",
  "landing.how.s2.body": "We reconcile your trades with FIFO and compute every metric from your data, not from estimates.",
  "landing.how.s2.buy": "Buy 0.50",
  "landing.how.s2.sell": "Sell 0.30 + 0.20",
  "landing.how.s3.title": "See the truth",
  "landing.how.s3.body": "Where you make money, where you lose it, and what you're really doing with your risk.",

  // What you'll see: calendar, metrics and score
  "landing.views.eyebrow": "What you'll see",
  "landing.views.title": "Your whole history, on one screen",
  "landing.views.lead": "This is what you see after importing an MT5 report with 152 trades. The interface is the dashboard's own; the figures are sample data.",
  "landing.cal.capTitle": "A calendar to decide with",
  "landing.cal.capBody": "Every day with its result, the month total and your best day. It answers which days you win.",
  "landing.cal.title": "Trading calendar",
  "landing.cal.weekCol": "Weekly summary",
  "landing.cal.week": "Week {n}",
  "landing.cal.range": "{mes} {a}–{b}",
  "landing.cal.days": { one: "{n} day", other: "{n} days" },
  "landing.cal.noTrades": "no trades",
  "landing.cal.monthTotal": "Month total",
  "landing.cal.daysTraded": "days traded",
  "landing.cal.best": "Best day",
  "landing.cal.worst": "Worst day",
  "landing.metrics.title": "Eight metrics, all global",
  "landing.metrics.sub": "Whole-account figures, not the month. With few trades, one month's percentage is noise.",
  "landing.metric.balance": "Balance",
  "landing.metric.pnl": "Net P&L",
  "landing.metric.winrate": "Win rate",
  "landing.metric.rr": "Risk/reward ratio",
  "landing.metric.pf": "Profit Factor",
  "landing.metric.trades": "Total Trades",
  "landing.metric.ev": "Expected Value",
  "landing.metric.time": "Average Trade Time",
  "landing.metric.won": "{n} won",
  "landing.metric.lost": "{n} lost",
  "landing.radar.title": "Your score, across six axes",
  "landing.radar.sub": "Not one overall grade: it tells you which specific axis is weak.",
  "landing.radar.panel": "Trader score",
  "landing.radar.aria": "Six-axis radar with a sample score",
  "landing.radar.ax1": "% Win rate",
  "landing.radar.ax2": "Profit factor",
  "landing.radar.ax3": "Win/loss ratio",
  "landing.radar.ax4": "Recovery",
  "landing.radar.ax5": "Max drawdown",
  "landing.radar.ax6": "Consistency",

  // Other views and call to action
  "landing.more.trades.title": "Trades",
  "landing.more.trades.body": "A table with date filters, the columns you choose, sorting, pagination, and the ability to edit or delete every trade.",
  "landing.more.accounts.title": "Accounts",
  "landing.more.accounts.body": "Several accounts, each with its balance, its currency and its source. Switch between them without losing anything.",
  "landing.more.analytics.title": "Analytics",
  "landing.more.analytics.body": "Performance by symbol, with five cards and a selector for metric and sort order.",
  "landing.sampleNote": "The interface is the dashboard's own; the figures are sample data.",

  // Import
  "landing.import.eyebrow": "What sets us apart",
  "landing.import.title": "Importing is the hard part. Here it's the easy one.",
  "landing.import.lead": "Almost every journal falls apart right here: columns that don't match, dates that won't parse, trades that get lost. TradeMind reads the MT5 report directly. And if your broker isn't MT5, you have the Excel template and manual entry.",
  "landing.import.m1.name": "MetaTrader 5",
  "landing.import.m1.body": "The closed-trades report is imported exactly as the broker generates it.",
  "landing.import.m2.name": "Excel template",
  "landing.import.m2.body": "A template with the columns you need. You fill it in and upload it.",
  "landing.import.m3.name": "Manual entry",
  "landing.import.m3.body": "If you'd rather add them one by one, you can.",
  "landing.import.m4.name": "Universal reader",
  "landing.import.m4.body": "Generic CSV and Excel files: it reads the table and proposes the columns for you.",
  "landing.import.drop": "Drop your report here",
  "landing.import.k1": "File",
  "landing.import.k2": "Format",
  "landing.import.k3": "Closed positions",
  "landing.import.k4": "Result",
  "landing.import.v2": "MetaTrader 5 · Positions section",
  "landing.import.v4": "152 trades saved",

  // Frequently asked questions
  "landing.faq.eyebrow": "Questions",
  "landing.faq.title": "What people usually ask us",
  "landing.faq.note": "Anything left to settle? Create your account and try it with your own report.",
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

  // Closing and footer
  "landing.final.title": "Start by knowing the truth.",
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