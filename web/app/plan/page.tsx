import type { Metadata } from "next";
import PantallaPlan from "../components/PantallaPlan";

/**
 * EL PLAN (/plan). El paso 2 del alta.
 *
 * Esta ruta solo monta la pantalla, como hace la landing. El idioma lo lee
 * layout.tsx de la cookie y lo pasa a LocaleProvider, asi que la primera
 * pintura sale ya en el idioma correcto.
 *
 * Lo que hay debajo no existe todavía: no hay suscripciones, ni cobro, ni
 * Stripe. Es el diseño para poder recorrer el flujo y decidir. La pantalla
 * esta en components/PantallaPlan.tsx.
 */
export const metadata: Metadata = {
  title: "TradeMind · Plan",
  description:
    "Un solo plan, todo incluido. Prueba 7 días gratis y después $9,99 al mes, sin permanencia.",
};

export default function PlanPage() {
  return <PantallaPlan />;
}