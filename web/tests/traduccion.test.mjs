/**
 * NINGUNA LLAVE SE QUEDA SIN SUSTITUIR EN PANTALLA.
 *
 * QUE FALLA Y POR QUE EXISTE
 *
 * Este test existe porque pasó. Al montar la pantalla del plan se escribió
 *
 *     "plan.subtitle": "cancelas antes del día {dias} y no pagas nada."
 *
 * y se llamó con `t("plan.subtitle")`, sin pasar `dias`. El typecheck no dice
 * nada: los huecos son cadenas de texto, no tipos. Los tests que había tampoco.
 * Y la aplicación arrancaba, compilaba y se veía bien.
 *
 * Lo que se veía en pantalla era, literalmente: "cancelas antes del día {dias}".
 *
 * ES ESTO LO QUE IMPIDE QUE VOLVA A PASAR
 *
 * Se recorre cada llamada `t("clave", {...})` del código, se mira qué huecos
 * tiene la clave en los dos idiomas, y se comprueba que la llamada los pasa
 * todos. Si mañana alguien añade un hueco al diccionario y olvida la variable,
 * esto se pone rojo antes de que llegue a un usuario.
 *
 * POR QUE UN TEST Y NO UN TIPO
 *
 * Porque `{dias}` es texto dentro de una cadena. TypeScript no mira dentro de
 * las cadenas, y aunque lo hiciera no sabría de dónde sale el valor.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { test } from "node:test";

import { es } from "../lib/i18n/es.ts";
import { en } from "../lib/i18n/en.ts";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Los mismos ficheros que revisa el guard de traduccion, mas los del flujo. */
const FICHEROS = [
  "app/page.tsx",
  "app/dashboard/page.tsx",
  "app/login/page.tsx",
  "app/components/Landing.tsx",
  "app/components/SummaryView.tsx",
  "app/components/AnalyticsView.tsx",
  "app/components/CfControls.tsx",
  "app/components/PanelAnimado.tsx",
  "app/components/AvisoImportacion.tsx",
  "app/components/CabeceraFlujo.tsx",
  "app/components/PasosFlujo.tsx",
  "app/components/PantallaPlan.tsx",
  "app/components/PantallaBienvenida.tsx",
  "app/plan/page.tsx",
  "app/bienvenida/page.tsx",
  "app/layout.tsx",
];

/** Los huecos de un valor: `{n}`, `{dias}`, `{fecha}`... */
function huecos(valor) {
  if (typeof valor === "string") {
    return new Set(Array.from(valor.matchAll(/\{(\w+)\}/g), (m) => m[1]));
  }
  // { one: "...", other: "..." }: se miran las dos formas.
  if (valor && typeof valor === "object") {
    const juntos = new Set();
    for (const v of Object.values(valor)) {
      for (const h of huecos(v)) juntos.add(h);
    }
    return juntos;
  }
  return new Set();
}

/**
 * Una llamada `t("clave")` o `t("clave", { a: 1, b: 2 })`.
 *
 * El segundo grupo es el texto del objeto de variables, o null si no se pasa
 * ninguna. Se para en la primera `}` por simplicidad: los valores que se pasan
 * aqui son todos escalares o llamadas, y ningún objeto de variables lleva un
 * objeto dentro.
 */
const LLAMADA = /\bt\(\s*"([a-zA-Z][\w.]*)"\s*(?:,\s*\{([^}]*)\})?\s*\)/g;

/**
 * Las claves que se pasan en el segundo argumento.
 *
 * Se aceptan las DOS formas que admite JavaScript:
 *   - explícita: `{ n: contador, fecha: fecha }`
 *   - abreviatura: `{ n }` y `{ total }`
 *
 * Buscar solo `nombre:` daba un falso rojo con la abreviatura, que es como se
 * escribe la mitad de las llamadas de este proyecto. Un test que da falsos
 * rojos se deja de mirar, y este es justo el que no se puede dejar de mirar.
 */
function variablesPasadas(cuerpo) {
  if (cuerpo === undefined) return new Set();
  const claves = new Set();
  for (const parte of cuerpo.split(",")) {
    const m = parte.match(/^\s*([A-Za-z_$][\w$]*)\s*:?/);
    if (m) claves.add(m[1]);
  }
  return claves;
}

test("ningun t() se deja un hueco del diccionario sin sustituir", () => {
  const fallos = [];
  let llamadas = 0;

  for (const rel of FICHEROS) {
    const fuente = readFileSync(join(RAIZ, rel), "utf8");

    for (const m of fuente.matchAll(LLAMADA)) {
      const [, clave, vars] = m;
      llamadas++;

      if (!(clave in es)) continue; // lo comprueba chk_traduccion.py

      /* Se miran los huecos de los DOS idiomas. Puede que en español uno se
         llame {fecha} y en ingles {date}: basta con que se pasen los dos. */
      const pedidos = new Set([...huecos(es[clave]), ...huecos(en[clave])]);
      const pasadas = variablesPasadas(vars);

      for (const h of pedidos) {
        if (!pasadas.has(h)) {
          const linea = fuente.slice(0, m.index).split("\n").length;
          fallos.push(
            `${rel}:${linea}  t("${clave}") no pasa {${h}}; en pantalla sale la llave`
          );
        }
      }
    }
  }

  assert.ok(llamadas > 0, "el recorrido no ha encontrado ninguna llamada t(): el regex esta roto");
  assert.equal(fallos.length, 0, "\n  " + fallos.join("\n  "));
});

test("las llaves que usan las pantallas del flujo se sustituyen de verdad", () => {
  // El caso de la clave dinamica, que el recorrido de arriba no puede ver
  // porque la clave no es un literal sino `plan.step.${momento}Body`.
  //
  // Se comprueba a mano lo que se pasa en esa llamada, para que el dia que se
  // anada un hueco a cualquiera de los tres cuerpos, alguien mire aqui.
  const cuerpo = readFileSync(join(RAIZ, "app/components/PantallaPlan.tsx"), "utf8");

  /* Se acepta las dos formas de pasar una variable: `{ precio: x }` y el
     atajo `{ precio }`. Buscar solo "precio:" daria un falso rojo con el
     atajo, que es justo como esta escrito. */
  const pasada = (nombre) => new RegExp(`\\b${nombre}\\s*[:,]`).test(cuerpo);

  for (const clave of ["plan.step.hoyBody", "plan.step.avisoBody", "plan.step.finBody"]) {
    const pedidos = huecos(es[clave]);
    for (const h of pedidos) {
      assert.ok(
        pasada(h),
        `PantallaPlan.tsx no pasa {${h}} a la clave dinamica ${clave}`
      );
    }
  }
});

test("las tres pantallas del flujo tienen sus claves en los dos idiomas", () => {
  const claves = [
    ...Object.keys(es).filter((k) => k.startsWith("plan.")),
    ...Object.keys(es).filter((k) => k.startsWith("welcome.")),
    ...Object.keys(es).filter((k) => k.startsWith("flujo.")),
  ];
  assert.ok(claves.length > 0, "no hay claves de flujo: se han borrado del diccionario");

  const faltan = claves.filter((k) => !(k in en));
  assert.equal(faltan.length, 0, `claves sin traducir: ${faltan.join(", ")}`);
});

test("el precio del plan no esta escrito a mano en el diccionario", () => {
  // El motivo de usar {precio}: si el precio aparece escrito dentro de una
  // cadena, cambiar PRECIO_MENSUAL en lib/plan/datos.ts deja de cambiar la
  // pantalla. Esto falla si alguien lo vuelve a escribir.
  //
  // Solo mira las claves del flujo. En la landing hay cantidades escritas a
  // proposito (los ejemplos del panel), y no es lo mismo: PRECIO_MENSUAL es una
  // cifra que se cobra, esas son de un grafico de ejemplo.
  const conPrecio = Object.entries(es).filter(
    ([k, v]) =>
      (k.startsWith("plan.") || k.startsWith("welcome.")) &&
      typeof v === "string" &&
      /\d+[.,]\d{2}/.test(v)
  );

  assert.deepEqual(
    conPrecio.map(([k]) => k),
    [],
    "hay cantidades escritas dentro del diccionario: usa {precio} y pasalo desde lib/plan/datos.ts"
  );
});

test("un trade sin stop se dice con palabras y en el idioma que toque", () => {
  /* ¿Por qué existe esto?
     Al montar la tabla, un trade sin stop se pintaba con el guion largo "—".
     El guion salia corrompido en pantalla (dos codificaciones UTF-8 encima una
     de otra) y salia "â€”", y encima no distinguia el trade que NO TIENE stop
     del cuyo stop NO SE PUDO LEER. Ambos casos eran el mismo guion.

     Ahora tradeToRow guarda null y la celda escribe "Sin SL"/"Sin TP" o
     "No SL"/"No TP" segun el idioma del momento. Aqui se cubre lo que no
     cubre ningun otro test: que las dos claves existan en los DOS idiomas y
     que page.tsx siga llamando a t() en vez de volver a escribir un guion
     a mano en sl/tp. */
  const pagina = readFileSync(join(RAIZ, "app/dashboard/page.tsx"), "utf8");

  for (const clave of ["col.noSl", "col.noTp"]) {
    assert.equal(typeof es[clave], "string", `la clave ${clave} no esta en es.ts`);
    assert.equal(typeof en[clave], "string", `la clave ${clave} no esta en en.ts`);
    assert.notEqual(es[clave], "", `la clave ${clave} esta vacia en es.ts`);
    assert.notEqual(en[clave], "", `la clave ${clave} esta vacia en en.ts`);
  }

  /* Se miran los dos idiomas, no solo que sean textos: si mañana se cambia
     el español y no el ingles, aqui se nota. */
  assert.equal(es["col.noSl"], "Sin SL");
  assert.equal(es["col.noTp"], "Sin TP");
  assert.equal(en["col.noSl"], "No SL");
  assert.equal(en["col.noTp"], "No TP");

  /* La traduccion tiene que pasar por t() en el momento de pintar la celda.
     Un literal aqui (aunque estuviera bien escrito) se quedaria en un idioma
     fijo para siempre, y seria exactamente la mitad del fallo original. */
  assert.match(
    pagina,
    /t\(c\.key === "sl" \? "col\.noSl" : "col\.noTp"\)/,
    "la celda de S/L y T/P no pasa por t(): se veria siempre en el mismo idioma"
  );
});

test("tradeToRow guarda null en sl/tp, no un guion largo escrito a mano", () => {
  // Complemento del anterior. Si sl/tp vuelve a rellenarse con "—" en
  // tradeToRow, la rama que pinta la celda deja de alcanzarse y vuelve a
  // salir el guion, corrompido o no, en vez de "Sin SL".
  //
  // Se busca el guion como dos cosas: el caracter en UTF-8 y su forma
  // corrompida "â€”", por si vuelve a haber doble codificacion. Asi el fallo
  // sale aqui y no en la captura del usuario.
  const pagina = readFileSync(join(RAIZ, "app/dashboard/page.tsx"), "utf8");
  const funcion = pagina.slice(
    pagina.indexOf("function tradeToRow"),
    pagina.indexOf("raw: t,", pagina.indexOf("function tradeToRow"))
  );

  assert.ok(funcion.length > 0, "no se ha encontrado tradeToRow: se ha renombrado el fichero");
  assert.match(funcion, /sl:\s*t\.sl\s*\?\?\s*null/, "tradeToRow no guarda null en sl");
  assert.match(funcion, /tp:\s*t\.tp\s*\?\?\s*null/, "tradeToRow no guarda null en tp");

  /* Solo se miran las líneas que ASIGNAN sl y tp, no toda la función: aquí
     dentro hay un comentario que menciona el guion para explicar por qué ya
     no se usa, y ese comentario no se pinta en pantalla. Buscar el guion en
     toda la función hacía fallar el test por su propia explicación. */
  const asignaciones = funcion
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^(sl|tp):/.test(l));
  const conGuion = asignaciones.filter((l) => /—|â€/.test(l));
  assert.deepEqual(
    conGuion,
    [],
    "tradeToRow escribe un guion en sl/tp en vez de null: la celda no llegara a traducirse"
  );
});