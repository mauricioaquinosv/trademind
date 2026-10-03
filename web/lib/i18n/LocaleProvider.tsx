"use client";

/**
 * Sistema de idioma ES/EN.
 *
 * Decisiones de diseño:
 *
 * 1. SIN dependencias externas. La librería estándar (next-intl) obliga a
 *    cambiar las rutas a /es/dashboard y /en/dashboard. Eso rompe URLs, mapas
 *    y el despliegue, para un beneficio que aquí no aporta.
 *
 * 2. SIN parpadeo al cargar. Next.js renderiza en el servidor antes de que
 *    corra ningún JavaScript. Si el idioma se leyera de localStorage, la
 *    primera pintura siempre sería en español y luego saltaría al inglés.
 *    Por eso layout.tsx lee una COOKIE en el servidor y se la pasa como
 *    `initial`. La cookie se escribe junto con localStorage al cambiar.
 *
 * 3. Las traducciones faltantes se detectan al compilar, no en pantalla.
 *    `en.ts` está tipado contra las claves de `es.ts`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { es, type TranslationKey } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";

export const LOCALE_COOKIE = "trademind_locale";
export const LOCALE_STORAGE = "trademind_locale";

export const LOCALES: Locale[] = ["es", "en"];

const DICCIONARIOS = { es, en } as const;

/** Sustituye {nombre} y {n} por los valores recibidos. */
function interpolar(plantilla: string, vars?: Record<string, string | number>) {
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

type I18nValue = {
  locale: Locale;
  setLocale: (nuevo: Locale) => void;
  t: (clave: TranslationKey, vars?: Record<string, string | number>) => string;
  /** Para claves que son listas (meses, días). */
  list: (clave: TranslationKey) => string[];
};

const I18nContexto = createContext<I18nValue | null>(null);

export function LocaleProvider({
  initial = "es",
  children,
}: {
  initial?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleEstado] = useState<Locale>(initial);

  // Si el servidor manda otro idioma (por ejemplo tras recargar), se adopta.
  useEffect(() => {
    setLocaleEstado(initial);
  }, [initial]);

  const setLocale = useCallback((nuevo: Locale) => {
    setLocaleEstado(nuevo);
    // La cookie es la que lee el servidor en la siguiente carga: sin esto
    // aparecería un instante en español antes de quedarse en inglés.
    document.cookie = `${LOCALE_COOKIE}=${nuevo}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LOCALE_STORAGE, nuevo);
    } catch {
      /* modo privado sin almacenamiento: la cookie ya cubre el caso */
    }
    document.documentElement.lang = nuevo;
  }, []);

  // Red de seguridad: si el navegador tiene un idioma guardado pero la cookie
  // se perdió (por ejemplo,EDD), se recupera.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(LOCALE_STORAGE) as Locale | null;
      if (guardado && guardado !== initial && LOCALES.includes(guardado)) {
        setLocaleEstado(guardado);
        document.documentElement.lang = guardado;
      }
    } catch {
      /* sin localStorage: nos quedamos con initial */
    }
  }, [initial]);

  const valor = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (clave, vars) => traducir(locale, clave, vars),
      list: (clave) => {
        const bruto = (DICCIONARIOS[locale] as Record<string, unknown>)[clave];
        return Array.isArray(bruto) ? (bruto as string[]) : [];
      },
    }),
    [locale, setLocale],
  );

  return <I18nContexto.Provider value={valor}>{children}</I18nContexto.Provider>;
}

/** Hook para usar el idioma. Lanza error si se usa fuera del proveedor. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContexto);
  if (!ctx) {
    throw new Error("useI18n() debe usarse dentro de <LocaleProvider>");
  }
  return ctx;
}