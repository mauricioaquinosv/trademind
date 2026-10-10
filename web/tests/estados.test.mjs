/**
 * Tests de los estados de la suscripcion.
 *
 * LO IMPORTANTE AQUI NO SON LOS TEXTOS, ES LA LISTA
 *
 * La pantalla de Facturacion pinta un estado. Si un estado se anade y no se
 * anade a la lista, /facturacion no lo reconoce y cae en el primero, que es el
 * de "en prueba": un usuario con la suscripcion pagada veria una pagina de
 * prueba, y no sabria por que.
 *
 * Tambien se comprueba que el estado por defecto este en la lista. Si no lo
 * estuviera, normalizaEstado devolveria un valor que no esta en
 * ESTADOS_FACTURACION y el tipo EstadoFacturacion dejaría de cubrirlo.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ESTADOS_FACTURACION,
  ESTADO_FACTURACION_POR_DEFECTO,
  DIA_POR_ESTADO,
  MOTIVOS_PAUSA,
  MOTIVO_PAUSA_POR_DEFECTO,
  muestraProgreso,
  reactivable,
  normalizaEstado,
  normalizaMotivo,
} from "../lib/plan/estados.ts";

// --- la lista de estados -------------------------------------------------

test("el estado por defecto esta en la lista", () => {
  assert.ok(
    ESTADOS_FACTURACION.includes(ESTADO_FACTURACION_POR_DEFECTO),
    "el estado por defecto tiene que estar en la lista, o normalizaEstado devolveria algo inexistente"
  );
});

test("no hay estados repetidos", () => {
  assert.equal(ESTADOS_FACTURACION.length, new Set(ESTADOS_FACTURACION).size);
});

test("todos los estados tienen un dia asignado", () => {
  for (const e of ESTADOS_FACTURACION) {
    assert.ok(
      typeof DIA_POR_ESTADO[e] === "number",
      `a ${e} le falta el dia en DIA_POR_ESTADO`
    );
  }
});

test("los dias de los estados que cuentan la prueba estan entre 1 y 7", () => {
  // Los estados con la prueba ya pasada van a 0, y aqui se permite.
  for (const [estado, dia] of Object.entries(DIA_POR_ESTADO)) {
    assert.ok(
      dia === 0 || (dia >= 1 && dia <= 7),
      `${estado} tiene el dia ${dia}, fuera de rango`
    );
  }
});

test("normalizaEstado acepta los de la lista", () => {
  for (const e of ESTADOS_FACTURACION) {
    assert.equal(normalizaEstado(e), e);
  }
});

test("normalizaEstado no se deja enganar por mayusculas ni espacios", () => {
  assert.equal(normalizaEstado("  EN-PRUEBA  "), "en-prueba");
  assert.equal(normalizaEstado("Activa"), "activa");
});

test("normalizaEstado desconocido cae en el de por defecto", () => {
  assert.equal(normalizaEstado("no-existe"), ESTADO_FACTURACION_POR_DEFECTO);
  assert.equal(normalizaEstado(""), ESTADO_FACTURACION_POR_DEFECTO);
  assert.equal(normalizaEstado(null), ESTADO_FACTURACION_POR_DEFECTO);
  assert.equal(normalizaEstado(undefined), ESTADO_FACTURACION_POR_DEFECTO);
});

// --- lo que decide cada pantalla ----------------------------------------

test("solo los dos estados de prueba ensenan la barra", () => {
  assert.equal(muestraProgreso("en-prueba"), true);
  assert.equal(muestraProgreso("termina-pronto"), true);
  for (const e of ["activa", "cancelada", "pago-fallido"]) {
    assert.equal(muestraProgreso(e), false, `${e} no deberia ensenar la barra`);
  }
});

test("solo la cancelada se puede reactivar", () => {
  assert.equal(reactivable("cancelada"), true);
  for (const e of ["en-prueba", "termina-pronto", "activa", "pago-fallido"]) {
    assert.equal(reactivable(e), false, `${e} no se puede reactivar`);
  }
});

test("termina-pronto y en-prueba son dias distintos", () => {
  // Si fueran el mismo, las dos pantallas serian iguales y sobraria una.
  assert.notEqual(DIA_POR_ESTADO["en-prueba"], DIA_POR_ESTADO["termina-pronto"]);
});

/* ------------------------------------------------------------------------
 * Los motivos del acceso pausado
 * ---------------------------------------------------------------------- */
test("el motivo por defecto esta en la lista", () => {
  assert.ok(MOTIVOS_PAUSA.includes(MOTIVO_PAUSA_POR_DEFECTO));
});

test("normalizaMotivo acepta los de la lista y rechaza el resto", () => {
  for (const m of MOTIVOS_PAUSA) {
    assert.equal(normalizaMotivo(m), m);
  }
  assert.equal(normalizaMotivo("cualquier-cosa"), MOTIVO_PAUSA_POR_DEFECTO);
  assert.equal(normalizaMotivo(null), MOTIVO_PAUSA_POR_DEFECTO);
});