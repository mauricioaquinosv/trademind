import type { Metadata } from "next";
import FacturacionInterna from "./FacturacionInterna";

/**
 * FACTURACION (/facturacion). LA PARTE DE SERVIDOR.
 *
 * UNA RUTA, CINCO ESTADOS
 *
 * La pantalla se dibuja en cinco versiones (en prueba, a punto de acabar, activa,
 * cancelada y con el pago rechazado) y todas viven en la misma ruta. Lo que
 * cambia es el `?estado=` de la direccion.
 *
 * POR QUE ESTA RUTA ESTA PARTIDA EN DOS FICHEROS
 *
 * Porque necesita las dos cosas que no se pueden tener en el mismo:
 *
 *   - `metadata`, que solo puede salir de un componente de servidor.
 *   - `useSearchParams`, que solo funciona en un componente de cliente.
 *
 * Si se deja todo en este fichero, Next dice "you're importing a module that
 * depends on useSearchParams into a React Server Component" y el build falla.
 * Por eso aqui solo se exporta el metadato y se monta `FacturacionInterna`, que
 * es el cliente.
 *
 * POR QUE EL ESTADO SE LEE DE LA URL Y NO DE LA BASE DE DATOS
 *
 * Porque todavia no hay suscripciones guardadas. Cuando exista la tabla, el
 * servidor leera el estado del usuario y pintara el suyo, y el `?estado=`
 * desaparecera: esta pantalla no tendra que cambiar.
 *
 * La fecha de hoy se calcula en `FacturacionInterna`, en el servidor, por el
 * mismo motivo que en la Bienvenida: si se calculase en el navegador, el
 * servidor y el cliente podrian sacar fechas distintas si la peticion cae cerca
 * de medianoche.
 */
export const metadata: Metadata = {
  title: "TradeMind · Facturación",
  description: "Tu plan, tu tarjeta y tus facturas.",
};

export default function FacturacionPage() {
  return <FacturacionInterna />;
}