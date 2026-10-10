/**
 * Tests de los datos de la landing: que el ejemplo cuadre consigo mismo y con
 * los totales reales de la cuenta de la que sale.
 *
 *     cd web
 *     npm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GRAFICO,
  acumuladoDe,
  calendario,
  cifras,
  curva,
  dinero,
  radar,
  yDe,
} from "../lib/landing/datos.ts";

const casi = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} no es ${b}`);

test("los totales del ejemplo coinciden con los de la cuenta real", () => {
  const c = cifras();
  casi(c.pnl, 1308.95);
  casi(c.balance, 11308.95);
  casi(c.expectedValue, 8.61);
  assert.equal(c.operaciones, 152);
  assert.equal(c.ganadas + c.perdidas, c.operaciones);
  assert.equal(c.winrate.toFixed(2), "71.71");
});

test("el calendario: 16 dias operados, el mejor es el 2 y el peor el 24", () => {
  const cal = calendario();
  assert.equal(cal.diasOperados, 16);
  assert.equal(cal.mejor.n, 2);
  assert.equal(cal.mejor.valor, 222.9);
  assert.equal(cal.peor.valor, -96.25);
  assert.equal(cal.peor.n, 24);
  casi(cal.total, 1094.9);
});

test("cada semana suma sus dias, y la suma de semanas es el total del mes", () => {
  const cal = calendario();
  casi(cal.semanas.reduce((s, w) => s + w.suma, 0), cal.total);
  assert.equal(cal.semanas.length, 4);
  assert.deepEqual(
    cal.semanas.map((w) => [w.desde, w.hasta]),
    [[1, 7], [8, 14], [15, 21], [22, 28]],
  );
});

test("la curva termina en el P&L total y no se sale de la rejilla", () => {
  const c = curva();
  casi(c.puntos.at(-1).acumulado, cifras().pnl);
  for (const [x, y] of c.xy) {
    assert.ok(x >= GRAFICO.x0 && x <= GRAFICO.der, `x=${x} fuera de la rejilla`);
    assert.ok(y >= GRAFICO.arriba && y <= GRAFICO.base, `y=${y} fuera de la rejilla`);
  }
  assert.ok(c.bandaX >= GRAFICO.izq);
  assert.ok(c.bandaX + c.bandaAncho <= GRAFICO.der + 0.001);
});

test("yDe y acumuladoDe son inversas", () => {
  for (const v of [0, 214.05, 700, 1308.95, 1400]) casi(acumuladoDe(yDe(v)), v, 1e-9);
});

test("los rotulos del eje caen sobre puntos reales de la curva", () => {
  const c = curva();
  assert.equal(c.ticks.length, 5);
  assert.deepEqual(c.ticks[0], { x: GRAFICO.x0, mes: 0, dia: 26 });
  assert.equal(c.ticks[1].mes, 1);
  assert.equal(c.ticks[1].dia, 2);
});

test("el radar tiene seis ejes, cinco anillos y las etiquetas fuera del dibujo", () => {
  const r = radar();
  assert.equal(r.anillos.length, 5);
  assert.equal(r.datos.split(" ").length, 6);
  assert.equal(r.etiquetas.length, 6);
});

test("dinero: formato del dashboard", () => {
  assert.equal(dinero(11308.95), "$11,308.95");
  assert.equal(dinero(222.9, true), "+$222.90");
  assert.equal(dinero(-96.25), "−$96.25");
  assert.equal(dinero(0), "$0.00");
});
