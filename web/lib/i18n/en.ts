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