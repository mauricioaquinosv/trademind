import type { Metadata } from "next";
import PantallaBienvenida from "../components/PantallaBienvenida";
import { finDePrueba } from "../../lib/plan/datos";

/**
 * LA BIENVENIDA (/bienvenida). El paso 3 del alta.
 *
 * LA FECHA SE CALCULA AQUI Y NO EN LA PANTALLA
 *
 * `finDePrueba` necesita saber que dia es hoy. Si lo calculara el componente de
 * cliente, el servidor lo pintaria con una fecha y el navegador, al hidratar,
 * con la suya: si la peticion cae cerca de medianoche, son dos dias distintos y
 * React avisa de que el HTML no cuadra con el cliente. Calculandolo aqui, que
 * es el servidor, las dos pintadas usan la misma.
 *
 * El nombre del mes NO se pone aqui: eso lo hace el componente, con el
 * diccionario, para que al cambiar a ingles salga "oct" en ingles y no en
 * español. Por eso lo que baja por aqui son tres numeros y no un texto.
 *
 * LO QUE HAY DEBAJO
 *
 * Ningun cobro, ninguna suscripción guardada, ninguna llamada a Stripe. Es el
 * diseño del paso. El dia 7 y el importe salen de lib/plan/datos.ts.
 */
export const metadata: Metadata = {
  title: "TradeMind · Bienvenida",
  description: "Tu prueba de TradeMind ya ha empezado.",
};

export default function BienvenidaPage() {
  return <PantallaBienvenida fin={finDePrueba(new Date())} />;
}