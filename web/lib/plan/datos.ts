/**
 * DATOS DEL PLAN Y CALCULO DE LAS FECHAS. SOLO LOGICA PURA, sin React.
 *
 * SEPARADO DE LAS PANTALLAS PORQUE ESTO SE CAMBIA Y EL DIBUJO NO
 *
 * Aqui viven las tres cifras que definen el producto: cuanto cuesta, cuantos
 * dias dura la prueba y cuando se avisa. Estan en un fichero aparte y no
 * escritas en el JSX para que, cuando cambien, se cambien en UN sitio. Si el
 * precio estuviera metido dentro de un <h1> habria que buscarlo por cinco
 * ficheros, y es exactamente el clase de sitio donde se queda la mitad.
 *
 * LO QUE ESTO NO ES
 *
 * Esto NO es el motor de suscripciones. No hay tabla de suscripciones, ni hay
 * cobro, ni hay Stripe. Lo unico que hay es el esqueleto de las pantallas tal y
 * como lo diseno el HTML de referencia, con las fechas calculadas para que se
 * vea como se vera. En cuanto exista el motor, estas pantallas pasan a leer de
 * la suscripcion real y este fichero deja de ser la fuente.
 *
 * EL FORMATEADOR DE DINERO, POR QUE ESTA COPIADO Y NO IMPORTADO
 *
 * El formato de dinero ya existe en `landing/datos.ts` y podria importarse, pero
 * los tests de Node cargan estos ficheros con su propio cargador ESM, que no
 * resuelve los imports sin extension (los webpack de Next si). Traerlo aqui
 * haria que `npm test` no arrancara.
 *
 * Copiarlo es peor que compartirlo, asi que en vez de confiar en que nadie los
 * toque, hay un test que dice que las dos copias tienen que dar el MISMO
 * resultado para cualquier cantidad. Si alguien cambia uno y no el otro, ese
 * test se pone rojo.
 */

/** Precio mensual, en dolares. El diseno dice 9,99. */
export const PRECIO_MENSUAL = 9.99;

/** Dias de prueba antes del primer cobro. El diseno dice 7. */
export const DIAS_PRUEBA = 7;

/**
 * Dias de margen del aviso por email antes de que acabe la prueba.
 *
 * El aviso sale en el dia 5 ("terminan dos dias"), y 5 + 2 = 7. Se guarda
 * como DIAS_DE_AVISO y no como "dia 5" porque es el dato que significa algo:
 * si el dia del aviso fuera 5 y alguien cambiara la prueba a 14 dias, el aviso
 * se quedaria en el dia 5 y avisaria con nueve dias de margen.
 */
export const DIAS_DE_AVISO = 2;

/** El dia en que sale el aviso. Sale de los otros dos, no se escribe a mano. */
export const DIA_DEL_AVISO = DIAS_PRUEBA - DIAS_DE_AVISO;

/**
 * Una fecha partida en sus tres piezas, sin nombre de mes.
 *
 * Por que no un `Date`: el nombre del mes sale del diccionario segun el idioma
 * en el que se este leyendo, y un `Date` no lleva el mes escrito. Pajar el
 * dia, el mes y el anio deja que cada idioma ponga el suyo sin tener que
 * recalcular nada.
 */
export type FechaTrial = {
  dia: number;
  /** Cero-based, como `Date.getMonth()`. De 0 (enero) a 11 (diciembre). */
  mes: number;
  anio: number;
};

/**
 * Cuando termina la prueba que empieza HOY.
 *
 * Se hace con `setDate` y no con `+ DIAS_PRUEBA * 24 * 3600 * 1000` porque esa
 * suma son 24 horas exactas: si hoy cruza un cambio de hora de verano, el
 * resultado se va un dia. `setDate` suma dias de calendario y salta de mes
 * solo, que es lo que quiere un "dentro de 7 dias".
 */
export function finDePrueba(hoy: Date): FechaTrial {
  const f = new Date(hoy.getTime());
  f.setDate(f.getDate() + DIAS_PRUEBA);
  return { dia: f.getDate(), mes: f.getMonth(), anio: f.getFullYear() };
}

/**
 * "17 oct 2026", con el mes que le pase el llamante.
 *
 * Se pasa el array de meses short porque sale del diccionario ES/EN y aqui no
 * se puede importar `LocaleProvider`: es un modulo de cliente y esta logica la
 * usan tests de Node.
 */
export function formateaFecha(fecha: FechaTrial, meses: readonly string[]): string {
  const nombre = meses[fecha.mes];
  if (!nombre) {
    // Un indice fuera de 0..11 no puede venir de una fecha real. Se devuelve el
    // dia y el anio para que se vea igual de roto que los datos, en vez de
    // imprimir "undefined" en la pantalla.
    return `${fecha.dia} ${fecha.anio}`;
  }
  return `${fecha.dia} ${nombre} ${fecha.anio}`;
}

/**
 * El precio con el formato de la aplicacion: $9.99, $1,234.56 y -$1,234.56.
 *
 * Copia de `landing/datos.ts`, con la razon explicada arriba.
 */
export function importe(v: number): string {
  const a = Math.abs(v)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (v < 0) return `−$${a}`;
  return `$${a}`;
}

/* ===================================================================
   LO QUE NECESITAN LAS PANTALLAS DE FACTURACION
   =================================================================== */

/**
 * Cuando termina una prueba que YA ha empezado, hoy es el dia `dia`.
 *
 * OJO, AQUI HAY UNA CONVENCION Y NO ES LA MISMA QUE EN `finDePrueba`
 *
 * Las dos pantallas del alta cuentan los dias de forma distinta, y es lo que
 * hizo el diseno original:
 *
 *   - `/plan` y `/bienvenida` dicen "la prueba empieza HOY y dura 7 dias", y
 *     enseñan la fecha de dentro de 7. Ahi hoy es el dia 0.
 *   - `/facturacion` dice "Dia 5 de 7, termina en 2 dias". Ahi hoy es el dia 5,
 *     y quedan 2: los dias 6 y 7.
 *
 * Con la misma cuenta las dos darian resultado, asi que cada una usa la suya.
 * Aqui se usa la segunda, que es la de la pantalla que ENSENA el contador: si
 * se ve "Dia 5 de 7" y al lado "quedan 2 dias", tienen que cuadrar entre si,
 * porque es lo unico que el usuario puede comprobar.
 *
 * El dia 1 da 6 dias (hoy mas 6). El dia 7 da 0: hoy es el ultimo dia.
 */
export function finDePruebaEnDia(hoy: Date, dia: number): FechaTrial {
  return masDias(hoy, DIAS_PRUEBA - dia);
}

/** QueDia se queda dentro de la prueba. */
export function normalizaDia(dia: number): number {
  if (!Number.isFinite(dia)) return 1;
  return Math.min(Math.max(Math.trunc(dia), 1), DIAS_PRUEBA);
}

/**
 * Una fecha `dias` despues.
 *
 * Por el mismo motivo que `finDePrueba`: `setDate` y no sumar milisegundos, que
 * con el cambio de hora se va un dia.
 */
export function masDias(hoy: Date, dias: number): FechaTrial {
  const f = new Date(hoy.getTime());
  f.setDate(f.getDate() + dias);
  return { dia: f.getDate(), mes: f.getMonth(), anio: f.getFullYear() };
}

/**
 * Una fecha `meses` despues, con el dia clavado.
 *
 * El dia se queda el mismo: el 17 de octubre mas dos meses es el 17 de
 * diciembre, no el 17 de diciembre menos dias por el numero que tiene
 * diciembre. Por eso se toca `setMonth` y no se construye la fecha con
 * `new Date(anio, mes + n, dia)`: esa forma se pasa al dia 1 en cuanto el mes de
 * destino es mas corto, y el 31 de octubre mas un mes daria el 1 de diciembre.
 *
 * Y si ese dia no existe en el mes de destino (el 31 de marzo mas un mes), se
 * recorta al ultimo dia del mes, que es lo que haria un calendario.
 */
export function masMeses(hoy: Date, meses: number): FechaTrial {
  const f = new Date(hoy.getTime());
  const diaOriginal = f.getDate();

  // Primero al dia 1: asi setMonth no puede desbordar antes de tener el mes
  // bueno.
  f.setDate(1);
  f.setMonth(f.getMonth() + meses);
  const ultimoDelMes = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
  f.setDate(Math.min(diaOriginal, ultimoDelMes));

  return { dia: f.getDate(), mes: f.getMonth(), anio: f.getFullYear() };
}

/**
 * Cuanto va gastada la prueba, en tanto por ciento.
 *
 * Es `dia / DIAS_PRUEBA`. Con DIAS_PRUEBA = 7 sale 43% para el dia 3 y 71%
 * para el dia 5, que son las dos cifras que pintaba el diseno.
 *
 * Sale de DIAS_PRUEBA y no de un 7 escrito para que, si la prueba pasara a 14
 * dias, la barra no siga fingiendo que dura siete.
 */
export function progresoPrueba(dia: number): number {
  const d = normalizaDia(dia);
  return Math.round((d / DIAS_PRUEBA) * 100);
}

/**
 * Los datos de la tarjeta de ejemplo que pinta Facturacion.
 *
 * "Visa· ····4242" y "08/28" son de mentira: son los numeros de prueba de
 * Stripe, que existen justamente para que se puedan hacer capturas sin meter una
 * tarjeta de verdad. Cuando haya pago de verdad estos dos campos saldran del
 * servicio de cobro, no de aqui.
 */
export const TARJETA_MUESTRA = { final: "4242", caducidad: "08/28" } as const;