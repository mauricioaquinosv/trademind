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
  "errors.tradeSaveFailed": "No se pudo guardar el trade. Verifica los datos.",
  "errors.fileProcessing": "Error al procesar el archivo.",

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
    : T;