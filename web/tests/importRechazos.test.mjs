/**
 * Tests del aviso de operaciones que no se han importado.
 *
 * El backend manda un CODIGO por cada rechazo, no una frase. Estos tests
 * comprueban tres cosas:
 *
 *   1. Que cada codigo tiene su traduccion en los dos idiomas
 *   2. Que un codigo desconocido degrada en vez de romperse
 *   3. Que el motivo y la solucion NO vienen del backend, para que el usuario
 *      que esta en ingles no lea un mensaje en espanol
 *
 * La 3 es la importante. Si alguien anade un campo `motivo` al `Rechazo` del
 * backend y lo pinta, estos tests no lo detectan solos: lo que detectan es que
 * la frase solo existe en un idioma. El resto lo comprueba el guard de
 * traduccion.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  traduceRechazos,
  mapaDeMotivos,
  mapaDeSoluciones,
  codigosDeCampo,
} from "../lib/i18n/importRechazos.ts";
import { es } from "../lib/i18n/es.ts";
import { en } from "../lib/i18n/en.ts";

// Un `t` de mentira contra el diccionario español real, como en apiErrors.
function traducir(clave, vars = {}) {
  const valor = es[clave];
  if (valor === undefined) return `SIN_TRADUCIR:${clave}`;
  if (typeof valor === "object") {
    return String(valor[vars.n === 1 ? "one" : "other"]);
  }
  return String(valor).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

function Rechazo(cambios = {}) {
  return {
    fila: 23,
    simbolo: "EURUSD",
    fecha: "2026-09-25T07:58:00",
    campo: "quantity",
    valor: "0",
    codigo: "quantity_not_positive",
    ...cambios,
  };
}

// --- forma del contrato ---------------------------------------------------

test("un rechazo se traduce entero, sin llaves sueltas", () => {
  const r = traduceRechazos([Rechazo()], traducir)[0];

  assert.ok(r.motivo.length > 0);
  assert.ok(r.solucion.length > 0);
  assert.ok(!r.motivo.includes("{"), `quedan llaves en el motivo: ${r.motivo}`);
  assert.ok(!r.solucion.includes("{"), `quedan llaves en la solucion: ${r.solucion}`);
});

test("el campo sale con la etiqueta del dashboard, no con su nombre interno", () => {
  // El usuario ya sabe lo que es "Volumen" porque lo ve en su tabla. Si saliera
  // "quantity" no sabria donde mirar en su Excel.
  const r = traduceRechazos([Rechazo()], traducir)[0];

  assert.equal(r.campo, es["col.volume"]);
  assert.ok(!r.campo.includes("quantity"), `sale el nombre interno: ${r.campo}`);
});

test("un valor ausente se escribe como vacio, no como undefined", () => {
  const r = traduceRechazos([Rechazo({ valor: null })], traducir)[0];

  assert.equal(r.valor, es["import.emptyValue"]);
  assert.ok(!r.valor.includes("undefined"));
  assert.ok(!r.valor.includes("null"));
});

test("una fecha ausente no rompe la fila", () => {
  const r = traduceRechazos([Rechazo({ fecha: null, simbolo: null })], traducir)[0];

  assert.equal(r.fecha, null);
  assert.equal(r.simbolo, null);
});

// --- lo que el usuario lee -----------------------------------------------

test("el motivo explica el porque, no solo repite el error", () => {
  // "campo invalido" no dice nada. La prueba es que el motivo tenga una frase
  // propia, distinta de la etiqueta del campo.
  const r = traduceRechazos([Rechazo()], traducir)[0];

  assert.notEqual(r.motivo, r.campo);
  assert.ok(r.motivo.split(" ").length >= 5, `el motivo es demasiado corto: "${r.motivo}"`);
});

test("la solucion dice que hacer, no solo que esta mal", () => {
  const r = traduceRechazos([Rechazo()], traducir)[0];

  assert.notEqual(r.solucion, r.motivo);
  assert.ok(r.solucion.length > 0);
});

test("el motivo de un volumen cero habla de unidades, no de 'quantity'", () => {
  const r = traducir("import.reason.quantity_not_positive");

  assert.ok(!/quantity|entry_price|exit_price/.test(r), `sale jerga del codigo: ${r}`);
});

test("la solucion del simbolo da un ejemplo que el usuario puede usar", () => {
  const r = traducir("import.fix.symbol_too_long");

  assert.match(r, /EURUSD/, `deberia dar un ejemplo de simbolo: ${r}`);
});

// --- cobertura -----------------------------------------------------------

test("todo codigo del backend tiene su motivo y su solucion", () => {
  const motivos = new Set(mapaDeMotivos().map((p) => p.codigo));
  const soluciones = new Set(mapaDeSoluciones().map((p) => p.codigo));

  const sinMotivo = [...soluciones].filter((c) => !motivos.has(c));
  const sinSolucion = [...motivos].filter((c) => !soluciones.has(c));

  assert.deepEqual(sinMotivo, [], "codigos con solucion pero sin motivo");
  assert.deepEqual(sinSolucion, [], "codigos con motivo pero sin solucion");
  assert.ok(motivos.size >= 9, `se esperaban 9 codigos, hay ${motivos.size}`);
});

test("las claves de motivo y solucion existen en los dos idiomas", () => {
  for (const clave of [
    ...mapaDeMotivos().map((p) => p.clave),
    ...mapaDeSoluciones().map((p) => p.clave),
  ]) {
    assert.ok(clave in es, `falta en espanol: ${clave}`);
    assert.ok(clave in en, `falta en ingles: ${clave}`);
  }
});

test("el motivo y la solucion son distintos en los dos idiomas", () => {
  // Si coincidieran, seria porque se ha copiado el español: el usuario en
  // ingles leeria lo mismo que el de espanol, y no habria traduccion.
  for (const { clave } of mapaDeMotivos()) {
    assert.notEqual(es[clave], en[clave], `la clave ${clave} es igual en los dos idiomas`);
  }
});

test("el espanol y el ingles tienen las mismas claves de rechazo", () => {
  const esR = Object.keys(es).filter((k) => k.startsWith("import.reason.") || k.startsWith("import.fix."));
  const enR = Object.keys(en).filter((k) => k.startsWith("import.reason.") || k.startsWith("import.fix."));

  assert.deepEqual(esR.sort(), enR.sort());
  assert.ok(esR.length >= 18, `se esperaban 18 claves, hay ${esR.length}`);
});

test("cada codigo de campo tiene su etiqueta", () => {
  for (const campo of codigosDeCampo()) {
    const r = traduceRechazos([Rechazo({ campo })], traducir)[0];
    assert.notEqual(r.campo, campo, `el campo ${campo} sale sin traducir`);
  }
});

// --- degradacion: esto es lo que evita que se rompa ----------------------

test("un codigo desconocido no rompe la pantalla", () => {
  // Pasa si el backend anade un motivo nuevo y aqui no llega el tiempo. El
  // usuario ve un motivo generico, que es mejor que ver "undefined".
  const r = traduceRechazos([Rechazo({ codigo: "un_motivo_del_futuro" })], traducir);

  assert.equal(r.length, 1);
  assert.ok(r[0].motivo.length > 0);
  assert.ok(!r[0].motivo.includes("undefined"), `sale un undefined: ${r[0].motivo}`);
});

test("un campo desconocido sale tal cual, no desaparece", () => {
  const r = traduceRechazos([Rechazo({ campo: "campo_inventado" })], traducir)[0];

  assert.equal(r.campo, "campo_inventado");
});

test("una lista que no es lista no rompe nada", () => {
  for (const basura of [null, undefined, 0, "", "texto", 42, {}]) {
    assert.deepEqual(traduceRechazos(basura, traducir), [], `entrada: ${JSON.stringify(basura)}`);
  }
});

test("los elementos que no son rechazos se descartan", () => {
  const lista = [Rechazo(), null, "texto", 42, { sinCodigo: true }];

  assert.equal(traduceRechazos(lista, traducir).length, 1);
});

/* Cada codigo del backend tiene su test. Si uno pierde la traduccion, falla el
   suyo, que es justo lo que se quiere: no un fallo generico que no dice cual. */
const DEL_BACKEND = [
  "symbol_empty",
  "symbol_too_long",
  "direction_invalid",
  "quantity_unreadable",
  "quantity_not_positive",
  "entry_price_unreadable",
  "entry_price_not_positive",
  "exit_price_unreadable",
  "exit_price_not_positive",
];

for (const codigo of DEL_BACKEND) {
  test(`el codigo "${codigo}" tiene motivo y solucion en los dos idiomas`, () => {
    const r = traduceRechazos([Rechazo({ codigo })], traducir)[0];

    assert.ok(r.motivo.length > 0, `el codigo ${codigo} no produjo motivo`);
    assert.ok(r.solucion.length > 0, `el codigo ${codigo} no produjo solucion`);
    assert.ok(!r.motivo.includes("SIN_TRADUCIR"), `falta la clave de ${codigo}`);
    assert.ok(!r.solucion.includes("SIN_TRADUCIR"), `falta la clave de ${codigo}`);
  });
}

// --- el backend no manda texto escrito ------------------------------------

/* Esta es la comprobacion que protege la regla de "todo traducido". Si alguien
   anade un campo `motivo` con una frase en espanol al modelo Rechazo, esto
   falla. Es un test que lee el fichero de Python desde el lado de JS: suena
   raro, pero es la unica forma de que los dos lados se vigilen entre si, ya
   que estan en repos distintos y en lenguajes distintos. */
const PYTHON_RECHAZO = new URL("../../app/import_validacion.py", import.meta.url);

test("el modelo Rechazo del backend no lleva ninguna frase en espanol", () => {
  const fuente = readFileSync(PYTHON_RECHAZO, "utf8");
  const modelo = fuente.slice(
    fuente.indexOf("class Rechazo"),
    fuente.indexOf("def _texto(")
  );

  // Solo se miran los campos del modelo, no los comentarios de arriba, que si
  // estan en espanol y tienen que estarlo: es el codigo del proyecto.
  const campos = [...modelo.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);

  assert.deepEqual(
    campos.sort(),
    ["campo", "codigo", "fecha", "fila", "simbolo", "valor"],
    "cambia la forma del Rechazo: revisa tambien el frontend"
  );
  assert.ok(
    !/motivo|solucion|texto|message|mensaje/i.test(campos.join(",")),
    "el backend no debe mandar texto redactado: manda el codigo"
  );
});

test("el backend no escribe ninguna frase de motivo en espanol", () => {
  const fuente = readFileSync(PYTHON_RECHAZO, "utf8");

  /* Se quitan primero los docstrings y los comentarios, porque el proyecto
     documenta en español y con razón: eso es código para quien lo lee, no texto
     que ve el usuario. Lo que se busca son las CADENAS que se podrían mandar,
     y esas no están en la documentación. */
  const codigo = fuente
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/'''[\s\S]*?'''/g, "''")
    .replace(/#[^\n]*/g, "");

  // Una frase de motivo tiene mayúscula inicial y espacio: "No hemos podido
  // leer el símbolo". Las claves de código van en minúsculas con guion bajo, así
  // que no se confunden.
  const frases = codigo.match(/["'][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [a-záéíóúñ]+/g) ?? [];

  assert.deepEqual(frases, [], "hay texto en espanol en el codigo de import_validacion.py");
});

test("el backend no manda ninguna frase traducida al cliente", () => {
  // Lo que llega al navegador sale de `model_dump()` de los Rechazos y de un
  // numero. Si el endpoint metiera un texto, el usuario en ingles lo leeria en
  // espanol sin poder evitarlo.
  const trades = readFileSync(new URL("../../app/trades.py", import.meta.url), "utf8");
  const bloque = trades.slice(trades.indexOf("rechazos"), trades.indexOf('@router.get("/"'));

  const frases = bloque.match(/["'][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [a-záéíóúñ]+/g) ?? [];

  assert.deepEqual(frases, [], "la respuesta del endpoint lleva texto escrito a mano");
});