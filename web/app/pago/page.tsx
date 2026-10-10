import type { Metadata } from "next";
import PantallaPago from "../components/PantallaPago";
import { finDePrueba } from "../../lib/plan/datos";

/**
 * EL PAGO (/pago). El paso 2 del alta, entre el plan y la bienvenida.
 *
 * LA FECHA VIENE EN PIEZAS, NO COMO TEXTO
 *
 * Igual que en la Bienvenida: aqui solo se calculan el dia, el mes y el anio, y
 * el nombre del mes lo pone el componente con el diccionario. Si se escribiera
 * aqui la fecha entera, al cambiar a ingles pondria "17 de octubre" y quedaria
 * en español dentro de una pagina inglesa.
 *
 * EL EMAIL
 *
 * Va relleno y solo se puede leer, porque es el de la cuenta que se acaba de
 * crear. En la aplicacion real saldria de la sesion; hoy sale de un texto de
 * ejemplo, y por eso se pasa como texto traducido y no como dato: un
 * "tu@email.com" escrito en el codigo parece la direccion de alguien.
 */
export const metadata: Metadata = {
  title: "TradeMind · Pago",
  description:
    "Añade una tarjeta para activar tus 7 días gratis. No se cobra nada hoy.",
};

export default function PagoPage() {
  return <PantallaPago fin={finDePrueba(new Date())} />;
}