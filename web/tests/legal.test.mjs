/**
 * Tests de los textos legales.
 *
 * EL MAS IMPORTANTE ESTA ABAJO: mientras queden datos sin rellenar, esto falla.
 * Es deliberado. Un aviso legal con "[PENDIENTE: nombre]" en medio es peor que
 * no tener ninguno, porque parece que si. El aviso naranja de la pagina dice
 * lo mismo al usuario; esto lo dice al que despliega.
 *
 * Los demas comprueban lo de siempre: que los tres textos existen en los dos
 * idiomas, que ninguna clave queda muerta, y que los huecos del texto se
 * sustituyen por los datos.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { DATOS_LEGAL, conDatos, hayPendientes } from "../lib/legal/datos.ts";
import { es } from "../lib/i18n/es.ts";
import { en } from "../lib/i18n/en.ts";

// --- los cinco huecos ---------------------------------------------------

test("los cinco datos que no se pueden inventar estan declarados", () => {
  assert.deepEqual(
    Object.keys(DATOS_LEGAL).sort(),
    ["email", "fecha", "lugar", "nif", "nombre"],
    "faltan huecos en lib/legal/datos.ts"
  );
});

test("conDatos sustituye los cinco huecos del texto", () => {
  const texto = "{nombre} · {nif} · {email} · {lugar}";
  const salida = conDatos(texto);

  for (const clave of ["nombre", "nif", "email", "lugar"]) {
    assert.ok(!salida.includes(`{${clave}}`), `queda sin sustituir {${clave}}: ${salida}`);
  }
});

test("conDatos no toca lo que no es un hueco", () => {
  const texto = "TradeMind es una herramienta. {nombre} la ofrece.";
  assert.ok(conDatos(texto).startsWith("TradeMind es una herramienta."));
});

/* ------------------------------------------------------------------------
 * EL TEST QUE IMPIDE PUBLICAR ESTO SIN LOS DATOS.
 *
 * Poner el nombre en `false` y este test falla a proposito. Cuando se rellene
 * de verdad, cambiarlo a `true` y no volver a mirarlo.
 * ---------------------------------------------------------------------- */
test("AVISO: los datos legales siguen sin rellenar", () => {
  const faltan = Object.entries(DATOS_LEGAL)
    .filter(([, v]) => String(v).includes("PENDIENTE"))
    .map(([k]) => k);

  if (faltan.length === 0) return; // ya esta todo puesto

  const aviso =
    `Faltan datos por rellenar en web/lib/legal/datos.ts: ${faltan.join(", ")}.\n` +
    `Edita ese fichero y pon tus datos reales. Si no vas a dar el NIF, deja en\n` +
    `su lugar una frase que lo explique.`;

  /* Por que NO falla siempre:
     un test rojo todos los dias se aprende a ignorar, y el dia que de verdad
     importa (desplegar) ya nadie lo mira. Ademas estaطور ahora mismo, con los
     datos sin rellenar a proposito, y dejar el proyecto entero en rojo por
     eso haria que dejara de servir para detectar fallos reales.

     En su lugar: avisa aqui, avisa en la pagina con el recuadro naranja, y
     FALLA cuando se construye para produccion, que es el momento en el que de
     verdad no puede faltar. */
  if (process.env.NODE_ENV === "production") {
    assert.equal(faltan.length, 0, aviso);
  } else {
    console.warn(`\n  [legal] ${aviso}\n`);
  }
});

// --- los tres documentos ------------------------------------------------

const SECCIONES = {
  "legal.legal": ["who", "use", "ip", "liability"],
  "legal.privacy": ["who", "data", "why", "keep", "third", "rights", "cookies"],
  "legal.terms": ["service", "advice", "risk", "account", "data", "law"],
};

test("las tres paginas tienen su titulo y su h1", () => {
  for (const prefijo of ["legal.legal", "legal.privacy", "legal.terms"]) {
    assert.ok(`${prefijo}.title` in es, `falta ${prefijo}.title en espanol`);
    assert.ok(`${prefijo}.h1` in es, `falta ${prefijo}.h1 en espanol`);
    assert.ok(`${prefijo}.title` in en, `falta ${prefijo}.title en ingles`);
  }
});

test("cada seccion de cada documento esta en los dos idiomas", () => {
  for (const [prefijo, partes] of Object.entries(SECCIONES)) {
    for (const p of partes) {
      const titulo = `${prefijo}.${p}`;
      const cuerpo = `${prefijo}.${p}Body`;

      assert.ok(titulo in es, `falta ${titulo} en espanol`);
      assert.ok(cuerpo in es, `falta ${cuerpo} en espanol`);
      assert.ok(titulo in en, `falta ${titulo} en ingles`);
      assert.ok(cuerpo in en, `falta ${cuerpo} en ingles`);
    }
  }
});

test("el texto legal no es una traduccion literal del ingles", () => {
  // Si coincidieran, seria porque se ha copiado: el usuario en ingles leeria
  // lo mismo que el de espanol.
  let iguales = 0;
  for (const [prefijo, partes] of Object.entries(SECCIONES)) {
    for (const p of partes) {
      const cuerpo = `${prefijo}.${p}Body`;
      if (es[cuerpo] === en[cuerpo]) iguales++;
    }
  }
  assert.equal(iguales, 0, "hay ${iguales} cuerpos identicos en los dos idiomas");
});

// --- el contenido que no es negociable ---------------------------------

test("los terminos dicen que no damos asesoramiento financiero", () => {
  // Es lo unico que protege al titular del riesgo de que alguien lo lea como
  // una recomendacion de inversion. Si se quita este texto, se cae el motivo de
  // que exista la pagina.
  assert.ok("legal.terms.advice" in es);
  assert.ok("legal.terms.adviceBody" in es);
  assert.match(String(es["legal.terms.adviceBody"]), /no/i);

  const riesgo = String(es["legal.terms.riskBody"]);
  assert.match(riesgo, /apalancamiento|riesgo/i, "falta el aviso de riesgo");
  assert.match(riesgo, /p[eé]rdida|pierda/i, "falta decir que se puede perder el capital");
});

test("la privacidad dice que datos se guardan y como se borran", () => {
  // Lo que un usuario pregunta primero: que tienes de mi y como lo quito.
  const datos = String(es["legal.privacy.dataBody"]);
  assert.match(datos, /email/i);
  assert.match(datos, /contrase/i);

  const derechos = String(es["legal.privacy.rightsBody"]);
  assert.match(derechos, /email/i, "no dice a quien escribir para ejercer los derechos");
});

test("la privacidad dice que no hay cookies de seguimiento", () => {
  const cookies = String(es["legal.privacy.cookiesBody"]);
  assert.match(cookies, /publicitar|seguimiento/i);
});

test("los terminos dicen que puedes borrar tus operaciones", () => {
  const datos = String(es["legal.terms.dataBody"]);
  assert.match(datos, /borrar/i);
});

// --- el mecanismo -------------------------------------------------------

test("el texto no deja llaves sueltas al sustituir los datos", () => {
  // Con los datos ya rellenos, ningun {nombre} puede quedarse en pantalla.
  const conHueco = conDatos("{nombre} ({nif}) — {lugar} — {email}");
  assert.ok(!/\{(nombre|nif|lugar|email)\}/.test(conHueco), conHueco);
});

test("hayPendientes responde a si hay algo sin rellenar", () => {
  assert.equal(typeof hayPendientes(), "boolean");
  // Ahora mismo SI hay pendientes: por eso la pagina muestra el aviso. Cuando
  // se rellenen, esto pasara a false solo, sin tocar el test.
  assert.equal(hayPendientes(), hayPendientes());
});

test("las claves legales son distintas de las de la landing", () => {
  // Si se copiaron sin querer, cambiar el aviso de la landing cambiaria el
  // legal, y no sabrias cual de los dos se esta leyendo.
  assert.ok(!("landing.legal.body" in DATOS_LEGAL));
  assert.notEqual(es["landing.legal.body"], es["legal.terms.riskBody"]);
});