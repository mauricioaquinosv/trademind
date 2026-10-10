/**
 * Traduce los errores de la API.
 *
 * El backend no sabe en que idioma esta el usuario, y no deberia saberlo: si
 * mandara el texto ya traducido, cada mensaje existiria en dos ficheros de
 * Python y no habria forma de comprobar que estan los dos.
 *
 * Lo que hace es devolver un codigo estable:
 *
 *     { "detail": { "code": "account_not_found", "text": "Cuenta no encontrada" } }
 *
 * Aqui se busca el codigo en el diccionario y se devuelve el mensaje en el
 * idioma activo. El `text` que viene del backend se usa de reserva para dos
 * casos: que el codigo sea nuevo y todavia no este traducido, o que la
 * respuesta no tenga la forma esperada. Un codigo desconocido degrada al texto
 * en espanol en vez de romperse, que es como tiene que ser un contrato de API.
 */

import type { TranslationKey } from "./config";

/** La forma que devuelve el backend en `detail` cuando hay error. */
export type ApiErrorBody = {
  code: string;
  text: string;
  /** Parametros para componer el mensaje, como el numero de operaciones. */
  n?: number;
  [k: string]: unknown;
};

/** Los codigos que el backend puede devolver, con su clave en el diccionario. */
const CLAVES: Record<string, TranslationKey> = {
  auth_email_taken: "apiErrors.emailTaken",
  auth_bad_credentials: "apiErrors.badCredentials",
  auth_too_many_attempts: "apiErrors.tooManyAttempts",
  session_invalid: "apiErrors.sessionInvalid",

  account_not_found: "apiErrors.accountNotFound",
  account_has_trades: "apiErrors.accountHasTrades",

  trade_not_found: "apiErrors.tradeNotFound",

  file_bad_extension: "apiErrors.fileBadExtension",
  file_empty: "apiErrors.fileEmpty",
  file_no_positions: "apiErrors.fileNoPositions",
  file_html_no_table: "apiErrors.fileHtmlNoTable",
  file_unreadable: "apiErrors.fileUnreadable",
  file_bad_template: "apiErrors.fileBadTemplate",
  file_bad_date: "apiErrors.fileBadDate",
  file_too_large: "apiErrors.fileTooLarge",

  validation_empty_name: "apiErrors.emptyName",
  validation_negative_balance: "apiErrors.negativeBalance",
};

type T = (clave: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Devuelve el mensaje de un error de la API, ya en el idioma activo.
 *
 * @param cuerpo  lo que devolvio `res.json()`. Puede ser `null` si la respuesta
 *                no era JSON, que pasa cuando el backend devuelve HTML por un
 *                error suyo.
 * @param porDefecto  que mostrar si no hay nada aprovechable. Es lo que se ve si
 *                    la conexion se cae: no hay codigo ni texto del backend.
 */
export function errorDeApi(cuerpo: unknown, t: T, porDefecto: string): string {
  // Sin cuerpo: no hay nada que traducir.
  if (!cuerpo || typeof cuerpo !== "object") return porDefecto;

  const d = (cuerpo as { detail?: unknown }).detail;

  // El backend puede devolver `detail` como texto suelto si algo se ha colado
  // sin pasar por errors.py. Se respeta en vez de inventarse un mensaje.
  if (typeof d === "string" && d.trim()) return d;
  if (!d || typeof d !== "object") return porDefecto;

  // Errores de validación de Pydantic: `detail` es una LISTA, y sus mensajes
  // vienen en inglés hardcodeado desde la librería ("Input should be
  // greater than or equal to 0"). Traducirlos aquí es lo único que funciona:
  // el backend no los genera, los copia tal cual de Pydantic.
  if (Array.isArray(d)) return erroresDePydantic(d as PydanticError[], t, porDefecto);

  const e = d as ApiErrorBody;
  const clave = CLAVES[e.code];

  if (clave) {
    return e.n !== undefined ? t(clave, { n: e.n }) : t(clave);
  }

  // Código sin traducir: el texto del backend, que al menos es útil.
  if (typeof e.text === "string" && e.text.trim()) return e.text;

  return porDefecto;
}

/** La forma de un error de validación de Pydantic v2. */
type PydanticError = {
  type: string;
  loc?: (string | number)[];
  msg?: string;
  ctx?: Record<string, unknown>;
};

/**
 * Los `type` de Pydantic que sabemos traducir.
 *
 * Pydantic genera un código estable por cada regla (`missing`,
 * `greater_than_equal`, `string_too_short`...) y un mensaje en inglés. El
 * código es la parte traducible; el mensaje cambia entre versiones de la
 * librería y no se debe tocar.
 */
const VALIDACION_PYDANTIC: Record<string, TranslationKey> = {
  missing: "apiErrors.fieldRequired",
  value_error: "apiErrors.fieldInvalid",
  string_too_short: "apiErrors.fieldTooShort",
  string_too_long: "apiErrors.fieldTooLong",
  greater_than_equal: "apiErrors.fieldMinValue",
  less_than_equal: "apiErrors.fieldMaxValue",
  string_type: "apiErrors.fieldMustBeText",
  float_type: "apiErrors.fieldMustBeNumber",
  int_type: "apiErrors.fieldMustBeWholeNumber",
  literal_error: "apiErrors.fieldInvalidChoice",
};

/**
 * El nombre del campo, en el idioma activo.
 *
 * Los campos van por su clave interna (`initial_balance`), que ya existe
 * traducida en el diccionario para las etiquetas de los formularios.
 */
const CAMPOS: Record<string, TranslationKey> = {
  name: "accounts.nameLabel",
  initial_balance: "accounts.balanceLabel",
  currency: "accounts.currency",
  email: "login.email",
  password: "login.password",
  symbol: "col.symbol",
  volume: "col.volume",
  entry_price: "col.openPrice",
  exit_price: "col.closePrice",
  entry_time: "col.openTime",
  exit_time: "col.closeTime",
  position: "col.position",
  sl: "col.sl",
  tp: "col.tp",
};

/** Traduce la lista de errores de validación de Pydantic. */
function erroresDePydantic(lista: PydanticError[], t: T, porDefecto: string): string {
  const partes = lista.map((err) => {
    const claveError = VALIDACION_PYDANTIC[err.type];
    if (!claveError) return null;

    const campo = err.loc?.[err.loc.length - 1];
    const claveCampo = typeof campo === "string" ? CAMPOS[campo] : undefined;

    if (!claveCampo) return t(claveError);

    // El límite viene en ctx (ge, le, min_length). Pydantic lo manda como
    // número, pero tiparlo obliga a comprobar que lo sea: un null o un string
    // colarían un "[object Object]" dentro del mensaje.
    const bruto = err.ctx?.ge ?? err.ctx?.le ?? err.ctx?.min_length;
    const valor = typeof bruto === "number" ? bruto : typeof bruto === "string" ? bruto : undefined;

    return valor !== undefined
      ? t(claveError, { field: t(claveCampo), n: valor })
      : t(claveError, { field: t(claveCampo) });
  });

  const buenos = partes.filter((x): x is string => x !== null);
  // Ningún error reconocible: mejor el mensaje de Pydantic en inglés, que al
  // menos dice algo, que un mensaje genérico que no explica nada.
  return buenos.length ? buenos.join(" · ") : porDefecto;
}

/**
 * Los pares codigo <-> clave, para poder comprobar la cobertura desde los tests.
 *
 * Devuelve el codigo del backend y la clave del diccionario. Hacerlo publico
 * sirve para que un test pueda recorrer los dos lados y detectar una clave
 * huerfana (un codigo que ya no devuelve el backend) o una que falta.
 */
export function mapaDeErrores(): { codigo: string; clave: TranslationKey }[] {
  return Object.entries(CLAVES).map(([codigo, clave]) => ({ codigo, clave }));
}

/** Solo los codigos que el backend puede devolver. */
export function codigosTraducidos(): string[] {
  return Object.keys(CLAVES);
}

/**
 * Las claves del diccionario que resuelve el camino de Pydantic.
 *
 * Devuelve las CLAVES, no los `type`: lo que interesa comprobar es que ninguna
 * clave se queda sin camino, y para eso hay que mirar el mismo lado del
 * diccionario. Los `type` son la entrada; esto es la salida.
 */
export function tiposPydanticTraducidos(): string[] {
  return Object.values(VALIDACION_PYDANTIC);
}
