/**
 * Configuración y lógica de traducción, SIN dependencias de React.
 *
 * Este módulo NO lleva "use client" a propósito. Si lo llevara, el servidor
 * no recibiría los valores reales sino un proxy de referencia del cliente, y
 * cosas como LOCALES.includes(...) fallarían con
 * "LOCALES.includes is not a function".
 *
 * Por eso layout.tsx (componente de servidor) importa de AQUÍ, y nunca del
 * LocaleProvider.
 */

import { es, type TranslationKey } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";

export const LOCALE_COOKIE = "trademind_locale";
export const LOCALE_STORAGE = "trademind_locale";

export const LOCALES: readonly Locale[] = ["es", "en"];

const DICCIONARIOS = { es, en } as const;

/** Devuelve el idioma si es válido, o "es" si no lo es o no hay ninguno. */
export function normalizarLocale(valor: string | undefined | null): Locale {
  return LOCALES.includes(valor as Locale) ? (valor as Locale) : "es";
}

/** Sustituye {nombre} y {n} por los valores recibidos. */
export function interpolar(
  plantilla: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return plantilla;
  return plantilla.replace(/\{(\w+)\}/g, (original, clave) =>
    clave in vars ? String(vars[clave]) : original,
  );
}

/**
 * Traduce una clave. Si el valor es { one, other }, elige la forma correcta
 * según vars.n (singular exactamente cuando vale 1).
 */
export function traducir(
  locale: Locale,
  clave: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const valor: unknown = (DICCIONARIOS[locale] as Record<string, unknown>)[clave];

  if (valor === undefined || valor === null) {
    // Que se note en desarrollo, pero sin romper la pantalla en producción.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] falta la clave "${clave}" en el diccionario ${locale}`);
    }
    return clave;
  }

  if (typeof valor === "object" && "one" in (valor as object)) {
    const par = valor as { one: string; other: string };
    const n = Number(vars?.n ?? 0);
    return interpolar(n === 1 ? par.one : par.other, vars);
  }

  return interpolar(String(valor), vars);
}

/** Devuelve una lista de textos (meses, días) ya traducida. */
export function listar(
  locale: Locale,
  clave: TranslationKey,
): string[] {
  const bruto = (DICCIONARIOS[locale] as Record<string, unknown>)[clave];
  return Array.isArray(bruto) ? (bruto as string[]) : [];
}

export type { TranslationKey };