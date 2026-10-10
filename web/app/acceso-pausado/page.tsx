import type { Metadata } from "next";
import PausaInterna from "./PausaInterna";

/**
 * ACCESO PAUSADO (/acceso-pausado). LA PARTE DE SERVIDOR.
 *
 * UNA RUTA, DOS MOTIVOS
 *
 * Misma idea que Facturacion: la pantalla es una sola y el `?motivo=` dice si
 * se debe a que la prueba se acabo o a que el cobro fue rechazado. Las dos
 * versiones solo cambian en el icono, el titulo, el parrafo y el boton.
 *
 * Esta ruta esta partida en dos ficheros por el mismo motivo que Facturacion:
 * `metadata` es de servidor y `useSearchParams` es de cliente.
 */
export const metadata: Metadata = {
  title: "TradeMind · Acceso pausado",
  description: "Tu cuenta sigue ahi. Aqui tienes que hacer para volver a entrar.",
};

export default function AccesoPausadoPage() {
  return <PausaInterna />;
}