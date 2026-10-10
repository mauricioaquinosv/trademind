/**
 * LOS ESTADOS DE LA SUSCRIPCION, Y QUE PINTA CADA UNO.
 *
 * EL PORQUE DE QUE SEA UN FICHERO APARTE
 *
 * La pantalla de Facturacion es una sola, pero el diseno la dibuja en cinco
 * versiones: en prueba, a punto de acabar, activa, cancelada y con el pago
 * rechazado. Lo unico que cambia entre ellas es una insignia, un texto, el
 * color de una barra y que botones hay.
 *
 * Si cada version fuera una pantalla, el dia que se corrigiese un texto habria
 * que buscarlo en cinco ficheros y es facil que se quedara uno. Aqui la parte
 * comun —la lateral, la cabecera, los paneles, la tabla de facturas— se
 * escribe una vez, y lo que se diferenciaba es una entrada de este fichero.
 *
 * LO QUE NO HAY AQUI
 *
 * Ningun motor. Que estado toca se decide leyendo una suscripcion de la base
 * de datos; hoy, mientras no exista, lo decide el `?estado=` de la URL. Cuando
 * haya tabla, esta lista pasa a ser la que compara el estado guardado con los
 * estados posibles, y el `?estado=` desaparece.
 *
 * LA LISTA DE ESTADOS
 *
 * Si se anade uno nuevo y no se anade aqui, /facturacion lo dara por desconocido
 * y caera en el primero de la lista. Esta en el test.
 */

/** Los identificadores que acepta `?estado=` en /facturacion. */
export const ESTADOS_FACTURACION = [
  "en-prueba",
  "termina-pronto",
  "activa",
  "cancelada",
  "pago-fallido",
] as const;

export type EstadoFacturacion = (typeof ESTADOS_FACTURACION)[number];

/** El estado por defecto si llega uno desconocido o no llega ninguno. */
export const ESTADO_FACTURACION_POR_DEFECTO: EstadoFacturacion = "en-prueba";

/** Convierte lo que venga en la URL en un estado de la lista. */
export function normalizaEstado(valor: string | null | undefined): EstadoFacturacion {
  const v = (valor ?? "").trim().toLowerCase();
  return (ESTADOS_FACTURACION as readonly string[]).includes(v)
    ? (v as EstadoFacturacion)
    : ESTADO_FACTURACION_POR_DEFECTO;
}

/**
 * El dia de la prueba en el que se supone al usuario, por estado.
 *
 * Son dias DE EJEMPLO. No salen de ninguna suscripcion porque no hay ninguna:
 * existen para que se vea la pantalla con el contador a medio camino y con la
 * barra casi llena, que son los dos estados que de verdad cuentan una historia.
 *
 * El "termina pronto" no esta escrito como 5 sino como el dia del aviso, que ya
 * sale de los otros dos numeros. Si la prueba se acortara, ese estado se
 * moveria solo.
 */
export const DIA_POR_ESTADO: Readonly<Record<EstadoFacturacion, number>> = {
  "en-prueba": 3,
  "termina-pronto": 5,
  // Con la prueba ya pasada, el dia no se pinta en ningun sitio.
  activa: 0,
  cancelada: 0,
  "pago-fallido": 0,
};

/* Los dos motivos por los que se puede pausar el acceso. */
export const MOTIVOS_PAUSA = ["prueba-terminada", "pago-no-recibido"] as const;

export type MotivoPausa = (typeof MOTIVOS_PAUSA)[number];

export const MOTIVO_PAUSA_POR_DEFECTO: MotivoPausa = "prueba-terminada";

export function normalizaMotivo(valor: string | null | undefined): MotivoPausa {
  const v = (valor ?? "").trim().toLowerCase();
  return (MOTIVOS_PAUSA as readonly string[]).includes(v)
    ? (v as MotivoPausa)
    : MOTIVO_PAUSA_POR_DEFECTO;
}

/**
 * Si hay que enseñar la barra de progreso de la prueba.
 *
 * Solo en los dos estados en los que la prueba esta corriendo. En los demas no
 * tiene sentido: una barra al 100% sobre una suscripcion cobrada o una barra
 * al 0% sobre una cancelada serian mentira.
 */
export function muestraProgreso(estado: EstadoFacturacion): boolean {
  return estado === "en-prueba" || estado === "termina-pronto";
}

/**
 * Si hay que enseñar el boton de "Reactivar".
 *
 * Cancelada lo tiene porque es el camino de vuelta. Activa no, porque reactivar
 * lo que ya esta activo no significa nada.
 */
export function reactivable(estado: EstadoFacturacion): boolean {
  return estado === "cancelada";
}