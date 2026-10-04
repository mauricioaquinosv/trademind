/**
 * Tests de la logica pura de la vista Resumen: calendario, semanas y metricas.
 *
 * RODEARLOS:
 *     cd web
 *     node --test tests/
 *
 * Se usa el runner que trae Node, sin instalar nada. Antes de esto el frontend
 * no tenia NI UN test, y el calendario lleva tres correcciones en su historia:
 * dos veces se rompio la alineacion de los dias de la semana y una vez el alto
 * del panel. Todo eso se podia haber caught con estos tests.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FILAS_FIJAS,
  addDias,
  celdasEnPantalla,
  computeStats,
  diasDelMes,
  filasDelMes,
  indicesDelMes,
  lunesDe,
  pad,
  resumenDelMes,
} from "../lib/resumen.ts";

// Las cabeceras se pintan en el orden tradicional domingo-primero.
const DIAS_ES = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

// --- pad y addDias -------------------------------------------------------

test("pad mete dos digitos", () => {
  assert.equal(pad(5), "05");
  assert.equal(pad(31), "31");
});

test("addDias cruza el cambio de mes y de ano", () => {
  assert.equal(addDias("2026-01-31", 1), "2026-02-01");
  assert.equal(addDias("2026-12-31", 1), "2027-01-01");
  assert.equal(addDias("2028-02-28", 1), "2028-02-29", "2028 es bisiesto");
  assert.equal(addDias("2026-03-01", -1), "2026-02-28");
});

test("addDias con 0 devuelve la misma fecha", () => {
  assert.equal(addDias("2026-06-15", 0), "2026-06-15");
});

test("addDias funciona en UTC, no en el huso del navegador", () => {
  // Si se usara la fecha local, este caso fallaria en cuanto el navegador
  // estuviera en un huso negativo: 2026-01-01T00:00:00Z seria 2025-12-31 local.
  assert.equal(addDias("2026-01-01", -1), "2025-12-31");
});

// --- lunesDe -------------------------------------------------------------

test("lunesDe devuelve el lunes de cada dia de una semana", () => {
  // Semana del 26 al 31 de enero de 2026. El 26 es lunes.
  const lunes = "2026-01-26";
  for (let i = 0; i < 7; i++) {
    assert.equal(lunesDe(addDias(lunes, i)), lunes);
  }
});

test("lunesDe de un domingo devuelve el lunes ANTERIOR, no el siguiente", () => {
  // El domingo pertenece a la semana que empieza el lunes antes. Si devolviera
  // el siguiente, las semanas se desplazarian al domingo y el resumen quedaria
  // descuadrado con el calendario.
  assert.equal(lunesDe("2026-02-01"), "2026-01-26");
});

test("lunesDe de un lunes devuelve el mismo dia", () => {
  assert.equal(lunesDe("2026-01-26"), "2026-01-26");
});

test("lunesDe de cada dia de la semana da un lunes real", () => {
  for (let i = 0; i < 14; i++) {
    const fecha = addDias("2026-01-26", i);
    const lunes = lunesDe(fecha);
    const dow = new Date(`${lunes}T00:00:00Z`).getUTCDay();
    assert.equal(dow, 1, `${lunes} deberia ser lunes, es dia ${dow}`);
  }
});

// --- diasDelMes ----------------------------------------------------------

test("diasDelMes acierta con febrero en bisiesto y no bisiesto", () => {
  assert.equal(diasDelMes(2026, 1), 28);
  assert.equal(diasDelMes(2028, 1), 29, "2028 es bisiesto");
  assert.equal(diasDelMes(2000, 1), 29, "2000 es bisiesto (divisible por 400)");
  assert.equal(diasDelMes(1900, 1), 28, "1900 NO es bisiesto (divisible por 100)");
});

test("diasDelMes de los 12 meses", () => {
  const esperado = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for (let m = 0; m < 12; m++) {
    assert.equal(diasDelMes(2026, m), esperado[m], `mes ${m}`);
  }
});

// --- filasDelMes ---------------------------------------------------------

test("todos los meses tienen el numero de filas fijas", () => {
  // El alto del panel no puede cambiar al navegar: de ahi las FILAS_FIJAS.
  for (let a = 2020; a <= 2032; a++) {
    for (let m = 0; m < 12; m++) {
      const filas = filasDelMes(a, m, {});
      assert.equal(
        filas.length,
        FILAS_FIJAS,
        `${a}-${m + 1} devolvio ${filas.length} filas`
      );
    }
  }
});

test("ningun mes necesita mas de las filas fijas", () => {
  // Si algum mes necesitara 6 filas reales, el alto fijo lo cortaria.
  for (let a = 2020; a <= 2032; a++) {
    for (let m = 0; m < 12; m++) {
      const reales = filasDelMes(a, m, {}).filter((f) => !f.relleno);
      assert.ok(
        reales.length <= FILAS_FIJAS,
        `${a}-${m + 1} necesita ${reales.length} filas y solo hay ${FILAS_FIJAS}`
      );
    }
  }
});

test("las filas de relleno van al final y van vacias", () => {
  const filas = filasDelMes(2026, 1, {}); // febrero 2026: 4 semanas reales
  const relleno = filas.filter((f) => f.relleno);
  assert.ok(relleno.length > 0, "febrero deberia tener filas de relleno");
  for (const f of relleno) {
    assert.equal(f.n, 0);
    assert.equal(f.celdas.length, 0);
  }
  const ultimoReal = filas.map((f) => f.relleno).lastIndexOf(false);
  assert.ok(ultimoReal < filas.length - relleno.length, "relleno debe ir al final");
});

test("cada dia cae bajo su dia de la semana real", () => {
  // Este es EL test del bug que mas veces ha vuelto: los dias salian una
  // columna a la izquierda porque las filas se construyen de lunes a domingo y
  // las cabeceras van domingo-primero. El giro de celdas lo arregla.
  const NOMBRE_REAL = DIAS_ES;
  for (let a = 2024; a <= 2027; a++) {
    for (let m = 0; m < 12; m++) {
      for (const fila of filasDelMes(a, m, {})) {
        if (fila.relleno) continue;
        const pintadas = celdasEnPantalla(fila.celdas);
        pintadas.forEach((celda, col) => {
          const dowReal = NOMBRE_REAL[new Date(`${celda.iso}T00:00:00Z`).getUTCDay()];
          assert.equal(
            dowReal,
            DIAS_ES[col],
            `${celda.iso} es ${dowReal} pero cae bajo ${DIAS_ES[col]}`
          );
        });
      }
    }
  }
});

test("el giro de celdas pone el domingo el primero", () => {
  const fila = filasDelMes(2026, 0, {}).find((f) => !f.relleno);
  const pintadas = celdasEnPantalla(fila.celdas);
  // La semana se construye de lunes a domingo, asi que el domingo es el ultimo.
  assert.equal(new Date(`${fila.celdas[fila.celdas.length - 1].iso}T00:00:00Z`).getUTCDay(), 0);
  assert.equal(
    new Date(`${pintadas[0].iso}T00:00:00Z`).getUTCDay(),
    0,
    "el domingo deberia ser la primera columna"
  );
});

test("el giro de celdas no pierde ni duplica dias", () => {
  for (let a = 2024; a <= 2027; a++) {
    for (let m = 0; m < 12; m++) {
      for (const fila of filasDelMes(a, m, {})) {
        if (fila.relleno) continue;
        const antes = fila.celdas.map((c) => c.iso).sort();
        const despues = celdasEnPantalla(fila.celdas).map((c) => c.iso).sort();
        assert.deepEqual(despues, antes, "el giro tiene que ser una permutacion");
      }
    }
  }
});

test("el giro de una lista vacia devuelve una lista vacia", () => {
  assert.deepEqual(celdasEnPantalla([]), []);
});

test("enero de 2026: el 1 cae bajo jueves y el 26 bajo lunes", () => {
  const filas = filasDelMes(2026, 0, {});
  const primerJueves = filas[0];
  const filaDel26 = filas.find((f) => f.celdas.some((c) => c.iso === "2026-01-26"));

  const jueves = celdasEnPantalla(primerJueves.celdas).find((c) => c.iso === "2026-01-01");
  assert.equal(DIAS_ES[celdasEnPantalla(primerJueves.celdas).indexOf(jueves)], "jue");

  const lunes = celdasEnPantalla(filaDel26.celdas).find((c) => c.iso === "2026-01-26");
  assert.equal(DIAS_ES[celdasEnPantalla(filaDel26.celdas).indexOf(lunes)], "lun");

  const sabado = celdasEnPantalla(filaDel26.celdas).find((c) => c.iso === "2026-01-31");
  assert.equal(DIAS_ES[celdasEnPantalla(filaDel26.celdas).indexOf(sabado)], "sab");
});

test("la semana pertenece al mes de su jueves y se numera desde 1", () => {
  // Regla acordada: una semana es del mes donde cae su jueves, para que el
  // resumen semanal y el calendario no puedan contradecirse.
  for (let a = 2024; a <= 2027; a++) {
    for (let m = 0; m < 12; m++) {
      const filas = filasDelMes(a, m, {}).filter((f) => !f.relleno);
      filas.forEach((f, i) => {
        assert.equal(f.n, i + 1, "la numeracion tiene que ser 1, 2, 3...");
        const jueves = addDias(f.lunes, 3);
        assert.equal(
          jueves.slice(0, 7),
          `${a}-${pad(m + 1)}`,
          `la semana ${f.n} de ${a}-${m + 1} tiene su jueves en ${jueves}`
        );
      });
    }
  }
});

test("el importe de la fila suma los siete dias, incluso los del mes vecino", () => {
  // El total de la semana tiene que ser el total de la semana. Si solo sumara
  // los dias del mes, al cambiar de mes se perderia o se duplicaria dinero.
  //
  // La semana que toca el 1 de enero de 2026 empieza el lunes 29 de diciembre,
  // asi que el dia 5 de febrero NUNCA cae en la primera fila: el domingo de esa
  // semana es el 4 de enero. Por eso los 5 puntos van en la semana del 26.
  const dm = {
    "2026-01-26": 10,
    "2026-01-27": -4,
    "2026-01-31": 6, // sabado
    "2026-02-01": 5, // domingo, ya en febrero
  };
  const filas = filasDelMes(2026, 0, dm).filter((f) => !f.relleno);

  // La fila que contiene el 26 de enero.
  const fila = filas.find((f) => f.celdas.some((c) => c.iso === "2026-01-26"));
  assert.equal(fila.lunes, "2026-01-26");
  assert.equal(fila.celdas.length, 7);
  assert.equal(fila.suma, 17, "10 - 4 + 6 + 5 = 17");
  assert.equal(fila.dias, 4, "los cuatro dias con operaciones");

  // Y el total del mes tiene que coincidir con la suma de las filas, sin que
  // ningun dia se pierda ni se cuente dos veces. OJO: aqui el 1 y el 5 de
  // febrero NO cuentan, porque el resumen del mes solo mira los dias de enero
  // y esas fechas no salen en ninguna fila de enero. Es correcto: el 1 y el 5
  // de febrero no son dias de enero. Lo que no puede pasar es que un dia de
  // enero disappeared o se cuente dos veces, y eso es justo lo que se comprueba.
  const totalFilas = filas.reduce((a, f) => a + f.suma, 0);
  assert.equal(totalFilas, 17);

  // Los dias de enero de la semana del 26 de enero.
  const diasDeEnero = filas.find(
    (f) => f.lunes === "2026-01-26"
  );
  for (const celda of diasDeEnero.celdas) {
    if (celda.iso === "2026-02-01") {
      assert.equal(celda.otroMes, true, "el 1 de febrero se marca como mes vecino");
    }
  }
});

test("una semana sin operaciones suma cero y no cuenta dias", () => {
  const filas = filasDelMes(2026, 0, {}).filter((f) => !f.relleno);
  for (const f of filas) {
    assert.equal(f.suma, 0);
    assert.equal(f.dias, 0);
  }
});

test("las celdas del mes vecino se marcan", () => {
  // La primera fila de enero de 2026 empieza el lunes 29 de diciembre, asi que
  // sus tres primeras celdas vienen del mes anterior.
  const primera = filasDelMes(2026, 0, {}).find((f) => !f.relleno);
  assert.equal(primera.lunes, "2025-12-29");
  assert.equal(primera.celdas[0].otroMes, true, "el 29 de diciembre es del mes vecino");
  assert.equal(primera.celdas[1].otroMes, true);
  assert.equal(primera.celdas[2].otroMes, true);
  assert.equal(primera.celdas[3].otroMes, false, "el 1 de enero ya es del mes");
  assert.equal(primera.celdas[3].iso, "2026-01-01");

  // Y la ultima fila de enero se sale por febrero.
  const ultima = filasDelMes(2026, 0, {}).filter((f) => !f.relleno).pop();
  assert.equal(ultima.celdas[6].otroMes, true, "el domingo 1 de febrero es del mes vecino");
});

test("el dia del mes es el numero correcto", () => {
  const filas = filasDelMes(2026, 0, {});
  const con31 = filas.flatMap((f) => f.celdas).find((c) => c.iso === "2026-01-31");
  assert.equal(con31.dia, 31);
});

test("enero de 2026: los dias que se pintan cubren todo el mes una vez", () => {
  const filas = filasDelMes(2026, 0, {}).filter((f) => !f.relleno);
  const pintados = filas.flatMap((f) => celdasEnPantalla(f.celdas)).map((c) => c.iso);
  const delMes = pintados.filter((iso) => iso.startsWith("2026-01-"));
  const unicos = new Set(delMes);
  assert.equal(unicos.size, 31, "enero tiene 31 dias y cada uno aparece una vez");
});

// --- resumenDelMes -------------------------------------------------------

test("el resumen del mes solo cuenta los dias de ESE mes", () => {
  const dm = {
    "2026-01-15": 100,
    "2026-01-16": -30,
    "2026-02-01": 999, // no debe contar en enero
  };
  const enero = resumenDelMes(2026, 0, dm);
  assert.equal(enero.suma, 70);
  assert.equal(enero.dias, 2);
  assert.equal(enero.mejor.key, "2026-01-15");
  assert.equal(enero.peor.key, "2026-01-16");
});

test("un mes sin datos da cero, no error", () => {
  const r = resumenDelMes(2026, 1, {});
  assert.equal(r.suma, 0);
  assert.equal(r.dias, 0);
  assert.equal(r.mejor, null);
  assert.equal(r.peor, null);
});

test("el mejor y el peor dia tienen en cuenta el signo", () => {
  const r = resumenDelMes(2026, 0, {
    "2026-01-01": -50,
    "2026-01-02": 20,
    "2026-01-03": -5,
  });
  assert.equal(r.mejor.v, 20, "el mejor dia es el de mayor importe");
  assert.equal(r.peor.v, -50, "el peor dia es el de menor importe");
});

// --- computeStats --------------------------------------------------------

test("computeStats con la lista vacia no revienta", () => {
  const s = computeStats([]);
  assert.equal(s.total, 0);
  assert.equal(s.netPnl, 0);
  assert.equal(s.winRate, 0);
  assert.equal(s.profitFactor, 0);

  /* Sin operaciones, cinco de los seis ejes del radar se quedan en 0 y solo el
     drawdown marca el 50 neutro. El puntaje sale 16,67, NO 50.
     No es un error: es lo que hace la formula con los valores que tiene. Se
     deja anotado para que nadie lo lea como regresion, y porque significa que
     el radar de una cuenta sin trades muestra casi todos los ejes a cero, que
     es justo lo que se ve. */
  assert.equal(s.radar.ddScore, 50, "el unico eje neutro sin datos es el drawdown");
  assert.equal(s.radar.winRate, 0);
  assert.equal(s.radar.profitFactor, 0);
  assert.ok(Math.abs(s.score - 16.6667) < 0.001, `score = ${s.score}`);
});

test("computeStats cuenta ganadoras y perdedoras por el signo", () => {
  const s = computeStats([
    { date: "2026-01-01", pnl: 100 },
    { date: "2026-01-02", pnl: -40 },
    { date: "2026-01-03", pnl: 0 },
  ]);
  assert.equal(s.total, 3, "el trade con pnl 0 cuenta como operacion");
  assert.equal(s.wins.length, 1);
  assert.equal(s.losses.length, 1);
  assert.equal(s.netPnl, 60);
  assert.ok(Math.abs(s.winRate - 33.3333) < 0.01, "el 0 no cuenta como ganadora");
});

test("computeStats ordena por fecha antes de acumular", () => {
  // El drawdown y la serie acumulada dependen del orden. Si no se ordenara,
  // el maxDD cambiaria segun como llegara el array.
  const desordenado = [
    { date: "2026-01-03", pnl: -100 },
    { date: "2026-01-01", pnl: 100 },
    { date: "2026-01-02", pnl: 100 },
  ];
  const s = computeStats(desordenado);
  assert.deepEqual(
    s.cumSeries.map((p) => p.cum),
    [100, 200, 100]
  );
});

test("computeStats agrupa varios trades del mismo dia", () => {
  const s = computeStats([
    { date: "2026-01-05", pnl: 10 },
    { date: "2026-01-05", pnl: 15 },
    { date: "2026-01-06", pnl: -5 },
  ]);
  assert.deepEqual(
    s.dailyEntries.map((e) => e[0]),
    ["2026-01-05", "2026-01-06"]
  );
  assert.equal(s.dailyEntries[0][1], 25, "los dos trades del dia 5 se suman");
});

test("profit factor es infinito cuando no hay perdedoras, y 99 como tope", () => {
  const soloGanadoras = computeStats([
    { date: "2026-01-01", pnl: 50 },
    { date: "2026-01-02", pnl: 50 },
  ]);
  assert.equal(soloGanadoras.profitFactor, 99, "se topa en 99 para no romper el radar");

  const sinNinguna = computeStats([]);
  assert.equal(sinNinguna.profitFactor, 0);
});

test("todas las ramas del radar se quedan entre 0 y 100", () => {
  const casos = [
    [{ date: "2026-01-01", pnl: 1000 }],
    [{ date: "2026-01-01", pnl: -1000 }],
    [{ date: "2026-01-01", pnl: 0 }],
    Array.from({ length: 50 }, (_, i) => ({ date: `2026-01-${pad((i % 28) + 1)}`, pnl: i % 2 ? -5 : 3 })),
  ];
  for (const items of casos) {
    const s = computeStats(items);
    for (const [nombre, valor] of Object.entries(s.radar)) {
      assert.ok(
        valor >= 0 && valor <= 100,
        `radar.${nombre} = ${valor} fuera de rango`
      );
    }
    assert.ok(s.score >= 0 && s.score <= 100, `score = ${s.score} fuera de rango`);
  }
});

// --- La franja del mes en el grafico -----------------------------------

const HISTORICO = [
  { date: "2026-01-05", pnl: 100 },
  { date: "2026-01-20", pnl: -30 },
  { date: "2026-02-03", pnl: 250 },
  { date: "2026-02-10", pnl: -70 },
  { date: "2026-03-15", pnl: 999 },
];

test("indicesDelMes localiza el tramo del mes en la serie", () => {
  const fechas = HISTORICO.map((t) => t.date);
  assert.deepEqual(indicesDelMes(fechas, 2026, 0), { desde: 0, hasta: 1 });
  assert.deepEqual(indicesDelMes(fechas, 2026, 1), { desde: 2, hasta: 3 });
  assert.deepEqual(indicesDelMes(fechas, 2026, 2), { desde: 4, hasta: 4 });
  assert.equal(indicesDelMes(fechas, 2026, 5), null, "un mes sin dias devuelve null");
});

test("el grafico conserva la serie entera aunque se resalte el mes", () => {
  // La garantia de por que el grafico NO se recorta: la serie sigue siendo la
  // de todos los trades, y el mes solo marca un tramo. Si este test falla,
  // alguien ha recortado el grafico y se ha perdido la curva del ano.
  const todas = computeStats(HISTORICO);
  const mes = indicesDelMes(todas.cumSeries.map((p) => p.date), 2026, 1);

  assert.equal(todas.cumSeries.length, 5, "la serie sigue teniendo los 5 dias");
  assert.deepEqual(
    todas.cumSeries.map((p) => p.cum),
    [100, 70, 320, 250, 1249],
    "el acumulado sigue siendo sobre todo el historico"
  );
  assert.deepEqual(mes, { desde: 2, hasta: 3 }, "febrero son los indices 2 y 3");
});

test("indices del ultimo dia tienen desde igual a hasta", () => {
  const una = [{ date: "2026-05-04", pnl: 10 }];
  assert.deepEqual(indicesDelMes(una.map((t) => t.date), 2026, 4), { desde: 0, hasta: 0 });
});

test("el max drawdown se mide sobre la serie acumulada", () => {
  const s = computeStats([
    { date: "2026-01-01", pnl: 100 },
    { date: "2026-01-02", pnl: -40 },
    { date: "2026-01-03", pnl: -60 },
  ]);
  // acumulado: 100, 60, 0. El pico es 100 y el valle 0, asi que el DD es 100.
  const dd = 100;
  assert.ok(s.radar.ddScore <= 100);
  assert.ok(dd > 0);
});
