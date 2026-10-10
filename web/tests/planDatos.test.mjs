/**
 * Tests de los datos del plan.
 *
 * LO QUE SE COMPRUEBA Y POR QUE
 *
 * Las fechas son la unica parte con aritmetica de esta pantalla, y son justo
 * la que se ve en la Bienvenida: "la prueba termina el 17 oct". Si esa cuenta
 * sale mal, lo que falla es la promesa que se le hace al usuario el primer dia
 * que entra.
 *
 * El caso que mas se ha mirado es el del cambio de hora de verano: sumar 7 dias
 * con `+ 7 * 24 * 60 * 60 * 1000` son SIETE DIAS DE 24 HORAS, y en el cambio de
 * hora eso no son siete dias. Con `setDate` si lo son.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  PRECIO_MENSUAL,
  DIAS_PRUEBA,
  DIAS_DE_AVISO,
  DIA_DEL_AVISO,
  finDePrueba,
  finDePruebaEnDia,
  normalizaDia,
  masDias,
  masMeses,
  progresoPrueba,
  formateaFecha,
  importe,
  TARJETA_MUESTRA,
} from "../lib/plan/datos.ts";
import { dinero } from "../lib/landing/datos.ts";

// --- las cifras del plan -------------------------------------------------

test("el plan es el del diseno", () => {
  // Si estos tres cambian, el aviso del dia 5 y el cobro del dia 7 tienen que
  // cambiar con ellos. estan juntos para que se vean los tres de una vez.
  assert.equal(PRECIO_MENSUAL, 9.99);
  assert.equal(DIAS_PRUEBA, 7);
  assert.equal(DIAS_DE_AVISO, 2);
});

test("el dia del aviso sale de los otros dos, no esta escrito a mano", () => {
  // 7 - 2 = 5. Si alguien sube la prueba a 14 dias, este daria 12 solo.
  assert.equal(DIA_DEL_AVISO, DIAS_PRUEBA - DIAS_DE_AVISO);
  assert.equal(DIA_DEL_AVISO, 5);
});

test("el aviso sale antes de que la prueba se acabe", () => {
  assert.ok(DIA_DEL_AVISO < DIAS_PRUEBA, "el aviso tiene que ser ANTES del dia del cobro");
  assert.equal(DIA_DEL_AVISO + DIAS_DE_AVISO, DIAS_PRUEBA, "el aviso y el margen tienen que cerrar en el dia del cobro");
});

// --- finDePrueba ---------------------------------------------------------

test("la prueba termina en 7 dias", () => {
  const hoy = new Date(2026, 9, 10); // 10 de octubre de 2026
  assert.deepEqual(finDePrueba(hoy), { dia: 17, mes: 9, anio: 2026 });
});

test("la fecha salta de mes sola", () => {
  // 25 + 7 = 32, que es el dia 1 del mes siguiente. Si se hiciera aritmetica
  // a pelo, saldria dia 32 y en pantalla verias "32 oct".
  assert.deepEqual(finDePrueba(new Date(2026, 9, 25)), { dia: 1, mes: 10, anio: 2026 });
});

test("la fecha salta de año sola", () => {
  // 28 de diciembre + 7 dias = 4 de enero del año siguiente.
  assert.deepEqual(finDePrueba(new Date(2026, 11, 28)), { dia: 4, mes: 0, anio: 2027 });
});

test("anios bisiestos", () => {
  // 2028 es bisiesto: 24 + 7 = 31 de febrero... no, 3 de marzo.
  assert.deepEqual(finDePrueba(new Date(2028, 1, 24)), { dia: 2, mes: 2, anio: 2028 });
});

test("la cuenta da 7 dias aunque cambie la hora oficial", () => {
  // Este es el fallo que justifico usar setDate.
  //
  // En España el cambio de hora de primavera es el ultimo domingo de marzo. Con
  // `hoy.getDate() + 7` sale bien. Con `hoy + 7*24*60*60*1000` en una zona que
  // adelante la hora, el resultado cae un dia antes: se suman 168 horas, pero
  // entre el día 29 y el dia 30 solo hay 23.
  //
  // Aqui se comprueba la propiedad que importa: la fecha que sale tiene SIETE
  // dias de calendario de diferencia, no 167 horas.
  const hoy = new Date(2026, 2, 24, 12, 0, 0); // 24 de marzo de 2026, mediodía
  const fin = finDePrueba(hoy);

  const esperado = new Date(2026, 2, 31, 12, 0, 0);
  assert.equal(fin.dia, esperado.getDate());
  assert.equal(fin.mes, esperado.getMonth());
  assert.equal(fin.anio, esperado.getFullYear());
});

test("finDePrueba no toca la fecha que recibe", () => {
  // Si se calculara con new Date(hoy) pero se escribiera sobre `hoy`, cada
  // llamante veria su fecha movida sin darse cuenta. Aqui se comprueba que la
  // entrada sigue igual.
  const hoy = new Date(2026, 9, 10, 9, 30, 0);
  finDePrueba(hoy);
  assert.equal(hoy.getDate(), 10);
  assert.equal(hoy.getHours(), 9);
  assert.equal(hoy.getMinutes(), 30);
});

// --- formateaFecha -------------------------------------------------------

const MESES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

test("la fecha sale como en el diseno", () => {
  assert.equal(formateaFecha({ dia: 17, mes: 9, anio: 2026 }, MESES_ES), "17 oct 2026");
});

test("el mes sale en el idioma del que llama", () => {
  const fecha = { dia: 17, mes: 9, anio: 2026 };
  assert.equal(formateaFecha(fecha, MESES_ES), "17 oct 2026");
  assert.equal(formateaFecha(fecha, MESES_EN), "17 Oct 2026");
  assert.notEqual(formateaFecha(fecha, MESES_ES), formateaFecha(fecha, MESES_EN));
});

test("los doce meses se escriben sin 'undefined'", () => {
  for (let mes = 0; mes < 12; mes++) {
    const salida = formateaFecha({ dia: 1, mes, anio: 2026 }, MESES_ES);
    assert.ok(!salida.includes("undefined"), `mes ${mes}: ${salida}`);
    assert.match(salida, /^1 [a-z]{3} 2026$/);
  }
});

test("un mes fuera de rango no revienta la pantalla", () => {
  // No puede pasar con una fecha real, pero si el dia del servidor fuera raro
  // que saliera "undefined" en medio del texto es peor que un "17 2026" feo.
  const salida = formateaFecha({ dia: 17, mes: 99, anio: 2026 }, MESES_ES);
  assert.ok(!salida.includes("undefined"), salida);
  assert.equal(salida, "17 2026");
});

// --- el precio -----------------------------------------------------------

test("el precio sale con el formato de la aplicacion", () => {
  // La landing y el dashboard ponen los dolares con punto decimal y la coma
  // para los miles. El HTML de referencia traia "$9,99", que es el formato
  // europeo aplicado a un simbolo dolar. Aqui manda el de la aplicacion: si no,
  // el usuario veria un precio distinto en cada pantalla del mismo flujo.
  assert.equal(importe(PRECIO_MENSUAL), "$9.99");
});

/* ------------------------------------------------------------------------
 * ESTE TEST ES EL QUE SUSTITUYE A COMPARTIR EL FORMATO.
 *
 * `importe` esta copiado de `landing/datos.ts` porque el cargador de los tests
 * no resuelve imports sin extension y trayendolo `npm test` no arrancaba. Copiar
 * sin atar seria justo el fallo que se queria evitar: un dia alguien cambia el
 * formato en la landing, el plan sigue con el viejo, y el mismo precio sale
 * "$1,234.56" en el dashboard y "$1.234,56" en la pantalla de alta.
 *
 * Si alguna vez se decide mover `dinero` a un modulo comun, este test se puede
 * borrar y el import volver: entonces la garantia la da el codigo, que es mas
 * fuerte que un test.
 * ---------------------------------------------------------------------- */
test("importe y el de la landing dan el MISMO resultado", () => {
  const cantidades = [
    0, 0.99, 1, 9.99, 10, 100, 999.99, 1000, 1234.56, 99999.99, 1234567.89,
    -9.99, -1234.56,
  ];
  for (const v of cantidades) {
    assert.equal(importe(v), dinero(v), `importe(${v}) y dinero(${v}) no coinciden`);
  }
});

/* ------------------------------------------------------------------------
 * finDePruebaEnDia: la cuenta de la pantalla de Facturacion
 *
 * Es la que ensena el contador ("Dia 5 de 7, termina en 2 dias"), asi que lo
 * que se comprueba es que el contador y la fecha cuadren entre si: si se ve
 * "Dia 5 de 7" y al lado "quedan 2 dias", el usuario puede comprobarlo.
 * ---------------------------------------------------------------------- */
test("el dia 5 de 7 queda a 2 dias, como dice el diseno", () => {
  const hoy = new Date(2026, 9, 10);
  const fin = finDePruebaEnDia(hoy, 5);
  assert.deepEqual(fin, { dia: 12, mes: 9, anio: 2026 });
});

test("el dia 3 de 7 queda a 4 dias", () => {
  const hoy = new Date(2026, 9, 10);
  assert.deepEqual(finDePruebaEnDia(hoy, 3), { dia: 14, mes: 9, anio: 2026 });
});

test("el dia 7 es el ultimo: no queda nada", () => {
  const hoy = new Date(2026, 9, 10);
  assert.deepEqual(finDePruebaEnDia(hoy, 7), { dia: 10, mes: 9, anio: 2026 });
});

test("el dia 1 queda a 6 dias", () => {
  const hoy = new Date(2026, 9, 10);
  assert.deepEqual(finDePruebaEnDia(hoy, 1), { dia: 16, mes: 9, anio: 2026 });
});

test("normalizaDia no se sale de 1 a 7", () => {
  assert.equal(normalizaDia(0), 1);
  assert.equal(normalizaDia(-3), 1);
  assert.equal(normalizaDia(8), 7);
  assert.equal(normalizaDia(99), 7);
  assert.equal(normalizaDia(3.7), 3);
  assert.equal(normalizaDia(NaN), 1);
});

/* ------------------------------------------------------------------------
 * masDias y masMeses
 * ---------------------------------------------------------------------- */
test("masDias suma y resta dias de calendario", () => {
  const hoy = new Date(2026, 9, 10);
  assert.deepEqual(masDias(hoy, 3), { dia: 13, mes: 9, anio: 2026 });
  assert.deepEqual(masDias(hoy, -3), { dia: 7, mes: 9, anio: 2026 });
  assert.deepEqual(masDias(hoy, 0), { dia: 10, mes: 9, anio: 2026 });
});

test("masDias cruza de mes y de año", () => {
  assert.deepEqual(masDias(new Date(2026, 9, 28), 5), { dia: 2, mes: 10, anio: 2026 });
  assert.deepEqual(masDias(new Date(2026, 11, 28), 5), { dia: 2, mes: 0, anio: 2027 });
});

test("masMeses deja el dia clavado", () => {
  assert.deepEqual(masMeses(new Date(2026, 9, 17), 2), { dia: 17, mes: 11, anio: 2026 });
  assert.deepEqual(masMeses(new Date(2026, 9, 17), -1), { dia: 17, mes: 8, anio: 2026 });
});

test("masMeses recorta el dia si el mes de destino es mas corto", () => {
  // El 31 de octubre mas un mes no existe: noviembre tiene 30.
  assert.deepEqual(masMeses(new Date(2026, 9, 31), 1), { dia: 30, mes: 10, anio: 2026 });
  // Y el 31 de marzo mas un mes es el 30 de abril, no el 1 de mayo.
  assert.deepEqual(masMeses(new Date(2026, 2, 31), 1), { dia: 30, mes: 3, anio: 2026 });
});

test("masMeses con el 29 de febrero de un bisiesto", () => {
  // 2028 es bisiesto. El 29 de febrero mas un mes es el 29 de marzo.
  assert.deepEqual(masMeses(new Date(2028, 1, 29), 1), { dia: 29, mes: 2, anio: 2028 });
});

/* ------------------------------------------------------------------------
 * progresoPrueba
 * ---------------------------------------------------------------------- */
test("la barra sale con las cifras del diseno", () => {
  // Son las dos que pintaba el diseno: 43% en el dia 3 y 71% en el dia 5.
  assert.equal(progresoPrueba(3), 43);
  assert.equal(progresoPrueba(5), 71);
});

test("la barra va de 0 a 100", () => {
  assert.equal(progresoPrueba(1), 14);
  assert.equal(progresoPrueba(7), 100);
  assert.equal(progresoPrueba(0), 14, "el dia 0 se recorta al 1");
  assert.equal(progresoPrueba(99), 100, "un dia fuera de rango se recorta al 7");
});

/* ------------------------------------------------------------------------
 * La tarjeta de ejemplo
 * ---------------------------------------------------------------------- */
test("la tarjeta de ejemplo son los numeros de prueba de Stripe", () => {
  // "4242 4242 4242 4242" es la tarjeta que Stripe da para probar. Si se
  // cambiara por otra, las capturas dejarian de parecerse al diseno.
  assert.equal(TARJETA_MUESTRA.final, "4242");
  assert.match(TARJETA_MUESTRA.caducidad, /^\d{2}\/\d{2}$/);
});