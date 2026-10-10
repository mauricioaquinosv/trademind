/**
 * Traduce el aviso de operaciones que NO se han importado.
 *
 * El archivo se acepta siempre (decision de producto: bloquear la subida entera
 * porque cuatro operaciones de quinientas vienen raras deja al usuario sin
 * herramienta hasta que las arregla, y en un reporte de MT5 las celdas vacias
 * son lo normal). Se importan las validables y el resto se le explica una a una.
 *
 * El backend no manda el motivo redactado, sino un CODIGO. Manda Spanish y el
 * usuario que esta en ingles leeria un mensaje que no entiende; ademas el texto
 * existiria en dos sitios a la vez y no habria forma de comprobar que los dos
 * idiomas estan. Aqui se busca el codigo en el diccionario ES/EN.
 *
 * Un codigo desconocido NO rompe nada: se cae al `motivo` generico de rechazo.
 * Un contrato de API degrada, no se cae.
 */

import type { TranslationKey } from "./config";

/** Un rechazo tal y como lo devuelve el backend. */
export type Rechazo = {
  fila: number | null;
  simbolo: string | null;
  fecha: string | null;
  campo: string;
  valor: string | null;
  codigo: string;
};

/** Los codigos que el backend puede devolver, con sus claves. */
const MOTIVOS: Record<string, TranslationKey> = {
  symbol_empty: "import.reason.symbol_empty",
  symbol_too_long: "import.reason.symbol_too_long",
  direction_invalid: "import.reason.direction_invalid",
  quantity_unreadable: "import.reason.quantity_unreadable",
  quantity_not_positive: "import.reason.quantity_not_positive",
  entry_price_unreadable: "import.reason.entry_price_unreadable",
  entry_price_not_positive: "import.reason.entry_price_not_positive",
  exit_price_unreadable: "import.reason.exit_price_unreadable",
  exit_price_not_positive: "import.reason.exit_price_not_positive",
};

const SOLUCIONES: Record<string, TranslationKey> = {
  symbol_empty: "import.fix.symbol_empty",
  symbol_too_long: "import.fix.symbol_too_long",
  direction_invalid: "import.fix.direction_invalid",
  quantity_unreadable: "import.fix.quantity_unreadable",
  quantity_not_positive: "import.fix.quantity_not_positive",
  entry_price_unreadable: "import.fix.entry_price_unreadable",
  entry_price_not_positive: "import.fix.entry_price_not_positive",
  exit_price_unreadable: "import.fix.exit_price_unreadable",
  exit_price_not_positive: "import.fix.exit_price_not_positive",
};

/**
 * Que campo fallo, con la etiqueta que ya existe para las columnas.
 *
 * Se reutilizan las del dashboard en vez de crear otras: el usuario ya sabe lo
 * que es "Volumen" porque lo ve en su tabla.
 */
const CAMPOS: Record<string, TranslationKey> = {
  symbol: "col.symbol",
  direction: "col.type",
  quantity: "col.volume",
  entry_price: "col.openPrice",
  exit_price: "col.closePrice",
};

type T = (clave: TranslationKey, vars?: Record<string, string | number>) => string;

export type RechazoTraducido = {
  fila: number | null;
  simbolo: string | null;
  fecha: string | null;
  campo: string;
  valor: string;
  motivo: string;
  solucion: string;
};

/** Traduce un rechazo a texto en el idioma activo. */
export function traduceRechazo(r: Rechazo, t: T): RechazoTraducido {
  return {
    fila: typeof r.fila === "number" ? r.fila : null,
    simbolo: r.simbolo ?? null,
    fecha: r.fecha ?? null,
    campo: CAMPOS[r.campo] ? t(CAMPOS[r.campo]) : r.campo,
    valor: r.valor ?? t("import.emptyValue"),
    motivo: t(MOTIVOS[r.codigo] ?? "import.reason.symbol_empty"),
    solucion: t(SOLUCIONES[r.codigo] ?? "import.fix.symbol_empty"),
  };
}

/**
 * Traduce la lista de rechazos.
 *
 * Filtra lo que no tiene forma de rechazo, para que un cambio en el backend no
 * pinte un `undefined` en pantalla.
 */
export function traduceRechazos(lista: unknown, t: T): RechazoTraducido[] {
  if (!Array.isArray(lista)) return [];
  return (lista as Rechazo[])
    .filter((r) => r && typeof r === "object" && typeof r.codigo === "string")
    .map((r) => traduceRechazo(r, t));
}

/**
 * Traduce las operaciones que el usuario YA tenia en la cuenta.
 *
 * No van por `traduceRechazos` porque son otra cosa. Un rechazo es "este dato
 * esta mal, corregelo"; una repetida es "esto ya lo tienes". Si compartieran
 * camino, el usuario leeria que su archivo tiene errores cuando lo que tiene es
 * datos que ya importo antes.
 *
 * Vienen con el mismo esquema para poder pintar las dos listas con el mismo
 * componente, pero con su propio codigo y su propio texto.
 */
export function traduceRepetidas(lista: unknown, t: T): RechazoTraducido[] {
  if (!Array.isArray(lista)) return [];
  return (lista as Rechazo[])
    .filter((r) => r && typeof r === "object" && typeof r.codigo === "string")
    .map((r) => ({
      fila: typeof r.fila === "number" ? r.fila : null,
      simbolo: r.simbolo ?? null,
      fecha: r.fecha ?? null,
      campo: t("import.already.motivo"),
      valor: r.valor ?? t("import.emptyValue"),
      motivo: t("import.already.motivo"),
      solucion: t("import.already.solucion"),
    }));
}

/** Los pares codigo <-> clave del motivo, para que un test pueda comprobar la cobertura. */
export function mapaDeMotivos(): { codigo: string; clave: TranslationKey }[] {
  return Object.entries(MOTIVOS).map(([codigo, clave]) => ({ codigo, clave }));
}

/** Lo mismo, para las soluciones. */
export function mapaDeSoluciones(): { codigo: string; clave: TranslationKey }[] {
  return Object.entries(SOLUCIONES).map(([codigo, clave]) => ({ codigo, clave }));
}

/** Los codigos de campo que el backend puede mandar. */
export function codigosDeCampo(): string[] {
  return Object.keys(CAMPOS);
}