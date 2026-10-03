import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
// El CSS del dashboard se carga DESPUÉS de Tailwind para que sus reglas
// (tarjetas de cristal, degradados, sombras y animaciones) prevaillezcan
// sobre el preflight de Tailwind.
import "./dashboard.css";
import { LocaleProvider, LOCALE_COOKIE, LOCALES, type Locale } from "../lib/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "TradeMind",
  description: "Dashboard de estadísticas de trading",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El idioma se lee AQUÍ, en el servidor, y no en el navegador. Por eso la
  // primera pintura ya sale en el idioma correcto: sin destello a español
  // cuando el usuario está en inglés.
  const guardado = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = LOCALES.includes(guardado as Locale)
    ? (guardado as Locale)
    : "es";

  return (
    <html lang={locale} className="h-full">
      <head>
        {/* Mismas fuentes que usa el HTML original */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}