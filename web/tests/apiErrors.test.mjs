/**
 * Tests de la traduccion de errores de la API.
 *
 * El backend devuelve un codigo, no un texto. Estos tests comprueban dos cosas:
 * que cada codigo tiene su traduccion, y que un codigo desconocido degrada al
 * texto del backend en vez de romperse.
 *
 * La segunda importa mas de lo que parece. Si anades un error nuevo en Python y
 * no lo anades aqui, la app tiene que seguir funcionando: showing el texto en
 * espanol es malo, pero mostrar "undefined" o un error en blanco es peor.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { errorDeApi, mapaDeErrores, tiposPydanticTraducidos } from "../lib/i18n/apiErrors.ts";
import { es } from "../lib/i18n/es.ts";
import { en } from "../lib/i18n/en.ts";

// Un `t` de mentira: resuelve contra el diccionario español real, con las
// variables ya sustituidas. Asi el test usa los mismos textos que la app.
function traducir(clave, vars = {}) {
  const valor = es[clave];
  if (typeof valor === "object") {
    return valor[vars.n === 1 ? "one" : "other"];
  }
  return String(valor).replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

const generico = "Fallo generico";

// --- forma del contrato --------------------------------------------------

test("un codigo conocido se traduce al español", () => {
  const r = errorDeApi({ detail: { code: "account_not_found", text: "..." } }, traducir, generico);
  assert.equal(r, es["apiErrors.accountNotFound"]);
  assert.ok(r.length > 0);
});

test("un codigo conocido se traduce al inglés", () => {
  // Se comprueba contra el diccionario inglés, que es la fuente de la verdad
  // de que el mensaje existe en los dos idiomas.
  const r = () => String(en["apiErrors.accountNotFound"]);
  assert.notEqual(r(), es["apiErrors.accountNotFound"], "los dos idiomas deben diferir");
});

test("el codigo con parametros los interpola", () => {
  const r = errorDeApi(
    { detail: { code: "account_has_trades", text: "...", n: 12 } },
    traducir,
    generico
  );
  assert.match(r, /12/);
  assert.ok(!r.includes("{n}"), `el {n} deberia haberse sustituido: ${r}`);
});

test("un codigo sin parametros no deja llaves sueltas", () => {
  const r = errorDeApi({ detail: { code: "account_not_found", text: "..." } }, traducir, generico);
  assert.ok(!r.includes("{"), `quedan llaves sin sustituir: ${r}`);
});

// --- errores de validacion de Pydantic -----------------------------------

test("un error de Pydantic se traduce, no sale su texto en ingles", () => {
  // Este llega tal cual de la libreria: en ingles y sin codigo nuestro. Sin
  // esto, con la app en espanol el usuario ve "Input should be greater than
  // or equal to 0".
  const r = errorDeApi(
    {
      detail: [
        {
          type: "greater_than_equal",
          loc: ["body", "initial_balance"],
          msg: "Input should be greater than or equal to 0",
          ctx: { ge: 0 },
        },
      ],
    },
    traducir,
    generico
  );
  assert.ok(!/Input should/i.test(r), `queda el texto en ingles: ${r}`);
  assert.match(r, /0/, "deberia conservar el limite");
});

test("el error de Pydantic nombra el campo con la etiqueta del diccionario", () => {
  const r = errorDeApi(
    { detail: [{ type: "missing", loc: ["body", "name"], msg: "Field required", ctx: {} }] },
    traducir,
    generico
  );
  assert.ok(!/Field required/i.test(r), `queda el texto en ingles: ${r}`);
  // La etiqueta sale del diccionario, no del nombre interno del campo.
  const primeraPalabra = es["accounts.nameLabel"].split(" ")[0];
  assert.ok(r.includes(primeraPalabra), `esperaba "${primeraPalabra}" en: ${r}`);
  assert.ok(!r.includes("body"), `no debe aparecer la ruta interna: ${r}`);
});

test("varios errores de Pydantic se unen y todos se traducen", () => {
  const r = errorDeApi(
    {
      detail: [
        { type: "string_too_short", loc: ["body", "symbol"], msg: "too short", ctx: { min_length: 3 } },
        { type: "missing", loc: ["body", "volume"], msg: "required", ctx: {} },
      ],
    },
    traducir,
    generico
  );
  assert.ok(!/too short|required/i.test(r), `queda ingles: ${r}`);
  assert.match(r, /·/, "deberian estar separados");
});

test("un type de Pydantic desconocido cae al generico, no a su texto", () => {
  // No se muestra el msg de la libreria porque puede contener nombres de tipo
  // que no significan nada para quien lo lee.
  const r = errorDeApi(
    { detail: [{ type: "un_tipo_del_futuro", loc: ["body", "x"], msg: "algo raro", ctx: {} }] },
    traducir,
    generico
  );
  assert.equal(r, generico);
});

test("si Pydantic no manda contexto, no se rompe", () => {
  const r = errorDeApi(
    { detail: [{ type: "greater_than_equal", loc: ["body", "initial_balance"] }] },
    traducir,
    generico
  );
  assert.ok(r.length > 0);
  assert.ok(!r.includes("undefined"), `queda un undefined: ${r}`);
});

test("un campo que no conozco no rompe la traduccion", () => {
  const r = errorDeApi(
    { detail: [{ type: "missing", loc: ["body", "campo_inventado"], msg: "required", ctx: {} }] },
    traducir,
    generico
  );
  assert.ok(r.length > 0);
  assert.ok(!/undefined/.test(r));
});

/* Cada `type` de Pydantic tiene su test. Se generan en bucle porque todos
   tienen la misma forma: si la traduccion de uno falla, fallan los diez, que
   es justo lo que se quiere. */
const TIPOS_PYDANTIC = [
  ["missing", "apiErrors.fieldRequired", {}],
  ["value_error", "apiErrors.fieldInvalid", {}],
  ["string_too_short", "apiErrors.fieldTooShort", { min_length: 3 }],
  ["string_too_long", "apiErrors.fieldTooLong", { max_length: 60 }],
  ["greater_than_equal", "apiErrors.fieldMinValue", { ge: 0 }],
  ["less_than_equal", "apiErrors.fieldMaxValue", { le: 100 }],
  ["string_type", "apiErrors.fieldMustBeText", {}],
  ["float_type", "apiErrors.fieldMustBeNumber", {}],
  ["int_type", "apiErrors.fieldMustBeWholeNumber", {}],
  ["literal_error", "apiErrors.fieldInvalidChoice", {}],
];

for (const [tipo, clave, ctx] of TIPOS_PYDANTIC) {
  test(`el type "${tipo}" se traduce y nombra el campo`, () => {
    const r = errorDeApi(
      { detail: [{ type: tipo, loc: ["body", "name"], msg: "algo en ingles", ctx }] },
      traducir,
      generico
    );
    assert.notEqual(r, generico, `el type ${tipo} cayo al generico`);
    // El mensaje tiene que ser exactamente el de la clave, con el campo
    // sustituido. Comparar con el texto esperado es mas fuerte que buscar
    // "palabras en ingles": si la clave y el mensaje no coinciden, falla.
    const esperado = traducir(clave, { field: es["accounts.nameLabel"], n: ctx.ge ?? ctx.le ?? ctx.min_length ?? ctx.max_length });
    assert.equal(r, esperado, `el type ${tipo} no produjo el mensaje esperado`);
    assert.ok(es[clave] !== undefined, `falta la clave ${clave}`);
  });
}

test("un null en vez de numero no cuela un [object Object]", () => {
  const r = errorDeApi(
    {
      detail: [
        { type: "greater_than_equal", loc: ["body", "initial_balance"], msg: "x", ctx: { ge: null } },
      ],
    },
    traducir,
    generico
  );
  assert.ok(!r.includes("object Object"), `sale un [object Object]: ${r}`);
});

// --- degradacion: esto es lo que evita que se rompa ----------------------

test("un codigo desconocido cae al texto del backend, no se rompe", () => {
  const r = errorDeApi(
    { detail: { code: "error_del_ano_2026", text: "Algo raro pasó" } },
    traducir,
    generico
  );
  assert.equal(r, "Algo raro pasó");
});

test("si el codigo es desconocido y no hay texto, sale el generico", () => {
  const r = errorDeApi({ detail: { code: "sin_texto" } }, traducir, generico);
  assert.equal(r, generico);
});

test("si no hay cuerpo, sale el generico", () => {
  for (const cuerpo of [null, undefined, 0, "", "texto", 42, []]) {
    assert.equal(errorDeApi(cuerpo, traducir, generico), generico, `cuerpo = ${JSON.stringify(cuerpo)}`);
  }
});

test("un detail que sea texto suelto se respeta tal cual", () => {
  // Pasa si algo se coló sin pasar por errors.py. Es mejor teaching el texto
  // que inventarse un mensaje que no corresponde al error real.
  const r = errorDeApi({ detail: "Algo sin codigo" }, traducir, generico);
  assert.equal(r, "Algo sin codigo");
});

test("el backend caido devuelve HTML y sale el generico", () => {
  // Es lo que pasa si FastAPI peta: devuelve una pagina de error en HTML, y
  // res.json() revienta. Eso lo captura el .catch del que llama.
  const cuerpo = null;
  assert.equal(errorDeApi(cuerpo, traducir, generico), generico);
});

// --- cobertura: ningun codigo sin traducir -------------------------------

test("todos los codigos del backend tienen su clave en el diccionario", () => {
  const pares = mapaDeErrores();
  const huerfanas = pares.filter((p) => !String(p.clave).startsWith("apiErrors."));
  assert.deepEqual(huerfanas, [], "hay entradas que no apuntan a una clave apiErrors");
  assert.ok(pares.length > 10, `se esperaban mas de 10 codigos, hay ${pares.length}`);
});

test("cada clave de apiErrors tiene una via por la que se llega", () => {
  // Hay dos caminos de entrada: el mapa de codigos del backend y los `type` de
  // Pydantic. Una clave tiene que estar en uno de los dos, o el texto es
  // muerto: nadie lo puede mostrar nunca.
  const enBackend = new Set(mapaDeErrores().map((p) => p.clave));
  const enPydantic = new Set(tiposPydanticTraducidos());
  const clavesDiccionario = Object.keys(es).filter((k) => k.startsWith("apiErrors."));
  const huerfanas = clavesDiccionario.filter(
    (k) => !enBackend.has(k) && !enPydantic.has(k)
  );
  assert.deepEqual(huerfanas, [], "claves que ningun camino alcanza");
});

test("todas las claves de apiErrors existen en los dos idiomas", () => {
  const claves = Object.keys(es).filter((k) => k.startsWith("apiErrors."));
  assert.ok(claves.length > 0, "no hay ninguna clave apiErrors");
  const faltanEs = claves.filter((k) => !(k in en));
  const faltanEn = claves.filter((k) => !(k in es));
  assert.deepEqual(faltanEs, [], "faltan en espanol");
  assert.deepEqual(faltanEn, [], "faltan en ingles");
});

test("ningun mensaje de apiErrors se queda con la variable sin sustituir", () => {
  for (const [k, v] of Object.entries(es)) {
    if (!k.startsWith("apiErrors.")) continue;
    const textos = typeof v === "object" ? Object.values(v) : [v];
    for (const t of textos) {
      assert.ok(!t.includes("{n") || t.includes("{n}"), `texto raro en ${k}: ${t}`);
    }
  }
});

// --- los codigos que el backend puede devolver ---------------------------

test("no hay codigos repetidos en el mapa", () => {
  // Un duplicado pasaria desapercibido: la segunda entrada gana y la primera
  // clave queda muerta sin que nada lo indique.
  const pares = mapaDeErrores();
  const codigos = pares.map((p) => p.codigo);
  assert.equal(new Set(codigos).size, codigos.length, "hay codigos repetidos");
});

test("todo codigo se escribe en minusculas con guion bajo", () => {
  // Es la convencion que usan todos los del backend. Un codigo con mayusculas
  // o con espacios no fallaria, pero rompería la convención y acabaría
  // escribiéndose de dos formas distintas.
  for (const { codigo } of mapaDeErrores()) {
    assert.match(codigo, /^[a-z0-9_]+$/, `codigo con formato raro: ${codigo}`);
  }
});
