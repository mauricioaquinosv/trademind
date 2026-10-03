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
  "errors.tradeSaveFailed": "Could not save the trade. Please check the data.",
  "errors.fileProcessing": "Error processing the file.",

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