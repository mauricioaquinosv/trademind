import type { Metadata } from "next";
import "./globals.css";
// El CSS del dashboard se carga DESPUÉS de Tailwind para que sus reglas
// (tarjetas de cristal, degradados, sombras y animaciones) prevaillezcan
// sobre el preflight de Tailwind.
import "./dashboard.css";

export const metadata: Metadata = {
  title: "TradeMind",
  description: "Dashboard de estadísticas de trading",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <head>
        {/* Mismas fuentes que usa el HTML original */}
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}