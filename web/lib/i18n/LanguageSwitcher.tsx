"use client";

import { useI18n, type Locale } from "./LocaleProvider";

/**
 * Selector de idioma ES/EN.
 *
 * Se coloca en la barra superior. Es un control compacto con los dos
 * códigos; el activo queda resaltado. No necesita más texto porque los
 * códigos son estándar.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const opciones: Locale[] = ["es", "en"];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 2,
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "var(--panel-2, rgba(255,255,255,0.03))",
      }}
      role="group"
      aria-label="Idioma / Language"
    >
      {opciones.map((code) => {
        const activo = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={activo}
            title={code === "es" ? "Español" : "English"}
            style={{
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              lineHeight: 1.4,
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "inherit",
              color: activo ? "#05060B" : "var(--muted)",
              background: activo ? "var(--teal)" : "transparent",
              border: "none",
              transition: "background .15s ease, color .15s ease",
            }}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}