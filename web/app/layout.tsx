import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
// El CSS del dashboard se carga DESPUÉS de Tailwind para que sus reglas
// (tarjetas de cristal, degradados, sombras y animaciones) prevaillezcan
// sobre el preflight de Tailwind.
import "./dashboard.css";
// El CSS de la landing va DESPUÉS del del dashboard y está todo bajo el
// selector .landing, así que no pisa nada del dashboard. Se carga aquí porque
// Next solo permite importar CSS desde el layout.
import "./landing.css";
// El CSS del login va DESPUES del de la landing: comparte el fondo y la
// rejilla con ella, y asi el login gana si algun dia chocaran.
import "./login.css";
// El del flujo de suscripcion (/plan, /bienvenida) va el ULTIMO: sus clases
// llevan prefijo .fl y no pisan nada, pero si mañana se añade algo compartido
// con el login, el orden es el que manda.
import "./flujo.css";
// Las constantes y la normalizacion se importan de ./config y NO de
// LocaleProvider: LocaleProvider es un modulo de cliente, y desde el
// servidor Next solo devuelve un proxy de referencia (y LOCALES.includes
// fallaria con "is not a function").
import { LOCALE_COOKIE, normalizarLocale } from "../lib/i18n/config";
import { LocaleProvider } from "../lib/i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "TradeMind",
  description:
    "Diario de trading: sube el reporte real de tu broker y mira tu winrate, tu profit factor, tus dias y tu riesgo. En español e inglés.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // El idioma se lee AQUÍ, en el servidor, y no en el navegador. Por eso la
  // primera pintura ya sale en el idioma correcto: sin destello a español
  // cuando el usuario está en inglés.
  const locale = normalizarLocale((await cookies()).get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} className="h-full">
      <head>
        {/* LAS FUENTES, Y POR QUE SON LAS CUATRO
            Aqui se pedian dos familias y faltaban otras dos. Las pantallas
            (landing, login, legales y el flujo de suscripcion) declaran en su
            CSS 'Bricolage Grotesque' para los titulos e 'Instrument Sans' para
            el texto, y ninguna de las dos estaba en esta lista. Sin ellas el
            navegador caia a system-ui, que en Windows es Segoe UI: mas ancha y
            mas alta, y sin las formas de titular que pedia el diseno. Por eso
            las pantallas se veian mas grandes de lo que estaban disenadas.

            Space Grotesk NO sobra: es la que usa dashboard.css, y por eso se
            queda. quitarla cambiaria el dashboard entero.

            El orden de las cuatro no importa al navegador; van en orden
            alfabetico, que es como las devuelve Google. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400..700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">
        <LocaleProvider initial={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}