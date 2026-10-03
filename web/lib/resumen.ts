/**
 * Logica pura de la vista Resumen: fechas, semanas, calendario y metricas.
 *
 * Estaba todo dentro de SummaryView.tsx, y eso hacia que no hubiera forma de
 * probarlo: los tests del frontend eran cero. Aqui vive separado, sin React y
 * sin estado, para poder ejercitarlo con `node --test` sin montar el navegador.
 *
 * REGLA DE FECHAS. Todo se calcula en UTC a proposito. Las fechas de los trades
 * llegan en UTC; si se mezclaran con el huso del navegador, los dias se moverian
 * de columna segun donde este el usuario. Un dia es un dia, no una hora.
 */

export type StatInput = { date: string; pnl: number };

export type Celda = {
  iso: string;
  dia: number;
  otroMes: boolean;
  v: number | undefined;
};

export type Fila = {
  n: number;
  lunes: string;
  domingo: string;
  suma: number;
  dias: number;
  relleno?: boolean;
  celdas: Celda[];
};

export type ResumenMes = {
  suma: number;
  dias: number;
  mejor: { key: string; v: number } | null;
  peor: { key: string; v: number } | null;
};

/** Numero de dos digitos, para construir fechas ISO. */
export const pad = (n: number): string => String(n).padStart(2, "0");

/** Suma N dias a una fecha ISO y devuelve la nueva fecha ISO. */
export function addDias(fechaISO: string, n: number): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Fecha ISO (YYYY-MM-DD) del lunes de la semana a la que pertenece un dia. */
export function lunesDe(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo ... 6 = sabado
  const retroceder = (dow + 6) % 7; // lunes = 0, domingo = 6
  d.setUTCDate(d.getUTCDate() - retroceder);
  return d.toISOString().slice(0, 10);
}

/**
 * ALTO FIJO: siempre 5 filas, el maximo que puede tener un mes.
 *
 * Parece que un mes de 31 dias que empiece en domingo daria 6 filas, pero no:
 * como la semana 1 es la que contiene al menos el jueves del dia 1, el primer
 * jueves cae en el dia 1, 2 o 3 como muy tarde, y desde ahi solo caben 5 jueves
 * separados por 7 dias dentro de 31 dias (1, 8, 15, 22, 29).
 *
 * Sin el alto fijo el panel crecia o menguaba al navegar y todo lo de abajo
 * saltaba. Las filas de relleno no se pintan: solo mantienen la altura.
 */
export const FILAS_FIJAS = 5;

/** Numero de dias del mes, en UTC. */
export function diasDelMes(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Filas del calendario para un mes.
 *
 * LA REGLA DE LAS SEMANAS. Cada semana pertenece al mes donde cae su JUEVES, y
 * se numera 1, 2, 3... dentro de cada mes. El importe de la fila suma los siete
 * dias, incluidos los del mes vecino: asi el total de la fila es el total de la
 * semana, sin duplicar ni perder nada al cambiar de mes.
 */
export function filasDelMes(
  calYear: number,
  calMonth: number,
  dailyMap: Record<string, number>
): Fila[] {
  const prefijo = `${calYear}-${pad(calMonth + 1)}`;
  const primeroISO = `${prefijo}-01`;
  const ultimoISO = `${prefijo}-${pad(diasDelMes(calYear, calMonth))}`;

  // Primera semana cuyo jueves cae dentro del mes.
  let lunes = lunesDe(primeroISO);
  while (addDias(lunes, 3) < primeroISO) {
    lunes = addDias(lunes, 7);
  }

  const salida: Fila[] = [];
  let n = 1;

  for (;;) {
    if (addDias(lunes, 3) > ultimoISO) break;

    const celdas: Celda[] = [];
    let suma = 0;
    let dias = 0;

    for (let i = 0; i < 7; i++) {
      const iso = addDias(lunes, i);
      const v = dailyMap[iso];
      if (v !== undefined) {
        suma += v;
        dias += 1;
      }
      celdas.push({
        iso,
        dia: new Date(`${iso}T00:00:00Z`).getUTCDate(),
        otroMes: iso.slice(0, 7) !== prefijo,
        v,
      });
    }

    salida.push({ n, lunes, domingo: addDias(lunes, 6), suma, dias, celdas });
    lunes = addDias(lunes, 7);
    n += 1;
  }

  while (salida.length < FILAS_FIJAS) {
    salida.push({ n: 0, lunes: "", domingo: "", suma: 0, dias: 0, celdas: [], relleno: true });
  }

  return salida;
}

/**
 * Las celdas en el orden en que se pintan.
 *
 * LAS CABECERAS ESTAN EN ORDEN DOMINGO-PRIMERO, pero la semana se construye de
 * lunes a domingo. El domingo es el ULTIMO elemento de esa lista, asi que para
 * que salga en la primera columna se coloca al principio.
 *
 * Si no se gira, cada dia cae una columna a la izquierda de la suya: el lunes 26
 * de enero se veia bajo "Sun". Ya paso, y por eso esta funcion existe y tiene
 * test propio.
 */
export function celdasEnPantalla(celdas: Celda[]): Celda[] {
  if (celdas.length === 0) return [];
  return [celdas[celdas.length - 1], ...celdas.slice(0, -1)];
}

/**
 * Resumen del mes que se esta viendo: total, dias operados, mejor y peor dia.
 *
 * Se calcula sobre el mes del calendario, no sobre todo el historico, para que
 * responda a "¿como fue este mes?".
 */
export function resumenDelMes(
  calYear: number,
  calMonth: number,
  dailyMap: Record<string, number>
): ResumenMes {
  const prefijo = `${calYear}-${pad(calMonth + 1)}`;
  let suma = 0;
  let dias = 0;
  let mejor: { key: string; v: number } | null = null;
  let peor: { key: string; v: number } | null = null;

  for (let dia = 1; dia <= diasDelMes(calYear, calMonth); dia++) {
    const key = `${prefijo}-${pad(dia)}`;
    const v = dailyMap[key];
    if (v === undefined) continue;
    suma += v;
    dias += 1;
    if (!mejor || v > mejor.v) mejor = { key, v };
    if (!peor || v < peor.v) peor = { key, v };
  }

  return { suma, dias, mejor, peor };
}

/** Totales y ratios de un conjunto de trades. Sin filtro de mes. */
export function computeStats(items: StatInput[]) {
  const sorted = [...items].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const total = sorted.length;
  const wins = sorted.filter((t) => t.pnl > 0);
  const losses = sorted.filter((t) => t.pnl < 0);
  const netPnl = sorted.reduce((s, t) => s + t.pnl, 0);
  const winRate = total ? (wins.length / total) * 100 : 0;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  const dailyMap: Record<string, number> = {};
  const dailyCountMap: Record<string, number> = {};
  sorted.forEach((t) => {
    dailyMap[t.date] = (dailyMap[t.date] || 0) + t.pnl;
    dailyCountMap[t.date] = (dailyCountMap[t.date] || 0) + 1;
  });
  const dailyEntries = Object.entries(dailyMap).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  );

  let cum = 0;
  const cumSeries = dailyEntries.map(([d, v]) => {
    cum += v;
    return { date: d, cum, pnl: v, count: dailyCountMap[d] || 0 };
  });

  let peak = -Infinity;
  let maxDD = 0;
  cumSeries.forEach((p) => {
    peak = Math.max(peak, p.cum);
    maxDD = Math.max(maxDD, peak - p.cum);
  });

  const dailyVals = dailyEntries.map((e) => e[1]);
  const mean = dailyVals.reduce((a, b) => a + b, 0) / (dailyVals.length || 1);
  const variance = dailyVals.reduce((s, v) => s + (v - mean) ** 2, 0) / (dailyVals.length || 1);
  const stdev = Math.sqrt(variance);
  const consistency = mean
    ? Math.max(0, Math.min(100, 100 - (stdev / Math.abs(mean)) * 20))
    : 50;
  const recovery = maxDD
    ? Math.max(0, Math.min(100, (netPnl / maxDD) * 15))
    : netPnl > 0
      ? 100
      : 0;
  const ddScore =
    netPnl !== 0 ? Math.max(0, Math.min(100, 100 - (maxDD / Math.abs(netPnl || 1)) * 40)) : 50;
  const wlRatio = avgLoss ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? 5 : 0;

  const radar = {
    winRate: Math.min(100, winRate),
    profitFactor: Math.min(100, profitFactor * 33),
    wlRatio: Math.min(100, wlRatio * 30),
    recovery,
    ddScore,
    consistency,
  };
  const score =
    (radar.winRate +
      radar.profitFactor +
      radar.wlRatio +
      radar.recovery +
      radar.ddScore +
      radar.consistency) /
    6;

  return { total, wins, losses, netPnl, winRate, avgWin, avgLoss, profitFactor, dailyEntries, cumSeries, radar, score };
}
