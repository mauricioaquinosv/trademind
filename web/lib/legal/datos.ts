/**
 * LOS DATOS DEL AVISO LEGAL, LA PRIVACIDAD Y LOS TERMINOS.
 *
 * POR QUE ESTE FICHERO
 *
 * El texto de las tres paginas ya esta escrito y traducido en `es.ts` y `en.ts`,
 * con cinco huecos en lugar del dato real: {nombre}, {nif}, {email}, {lugar} y
 * {fecha}. Son datos que NO se pueden inventar, y un aviso legal con un nombre
 * inventado es peor que no tener ninguno.
 *
 * ESTE ES EL UNICO SITIO DONDE HAY QUE CAMBIARLOS.
 *
 * Se rellenan aqui, una vez, y las tres paginas los usan a la vez. Esta version
 * los deja con el texto "[PENDIENTE: ...]" a proposito, para que se vea de un
 * vistazo que falta lo siguiente. Hay un test (`tests/legal.test.mjs`) que FALLA
 * mientras quede alguno, para que no se pueda publicar esto por descuido.
 *
 * QUE HAY QUE PONER
 *
 *   nombre  El tuyo, o el de la empresa si la hay. Es lo unico que debe
 *           aparecer en la web, asi que no hace falta el comercial entero.
 *   nif     Tu NIF o el CIF de la empresa. Si eres persona fisica y decides no
 *           darlo, la ley no lo obliga: basta con nombre y un modo de contacto.
 *   email   Uno de contacto, que puede ser el mismo que usas en el producto.
 *   lugar   Ciudad y pais. De esto depende que ley se aplica.
 *   fecha   La fecha de entrada en vigor de estos textos.
 *
 * LO QUE ESTO NO ES
 *
 * Esto no es un asesoramiento legal. Es una plantilla con los huecos puestos.
 * Si vas a cobrar a alguien, haz que un abogado mire los tres textos antes de
 * publicarlos: hay requisitos que dependen de si cobras suscripcion, de si
 * tienes mas de un pais de clientes, y de si eres persona fisica o empresa.
 */

/** Los cinco datos. Cambia SOLO los valores de la derecha. */
export const DATOS_LEGAL = {
  /** Nombre del titular o de la empresa. */
  nombre: "[PENDIENTE: nombre]",
  /** NIF o CIF. Si no vas a darlo, deja una explicacion corta en su lugar. */
  nif: "[PENDIENTE: NIF]",
  /** Email de contacto. */
  email: "[PENDIENTE: email]",
  /** Ciudad y pais. */
  lugar: "[PENDIENTE: ciudad y pais]",
  /** Fecha de entrada en vigor de estos textos. */
  fecha: "[PENDIENTE: fecha]",
} as const;

/** Las claves que van dentro de los textos del diccionario. */
export type ClaveLegal = keyof typeof DATOS_LEGAL;

/** Si queda alguno sin rellenar. Lo usa el aviso de la pagina y un test. */
export function hayPendientes(): boolean {
  return Object.values(DATOS_LEGAL).some((v) => String(v).includes("PENDIENTE"));
}

/**
 * Sustituye los huecos del texto por los datos de arriba.
 *
 * Los textos del diccionario traen `{nombre}`, `{email}`... Se cambian por los
 * valores. El `t()` del i18n ya sustituye `{fecha}`, asi que esta funcion solo
 * tiene que cubrir los que anaden estos.
 */
export function conDatos(texto: string): string {
  let salida = texto;
  for (const [clave, valor] of Object.entries(DATOS_LEGAL)) {
    salida = salida.replaceAll(`{${clave}}`, valor);
  }
  return salida;
}