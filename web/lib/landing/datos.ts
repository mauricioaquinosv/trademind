/**
 * Datos y calculos de la landing: SOLO logica pura, sin React ni DOM.
 *
 * Todo lo que el panel de ejemplo de la landing dibuja sale de aqui: el
 * calendario de febrero, la curva de P&L acumulado, las ocho cifras y el
 * radar. Esta separado de Landing.tsx para poder comprobarlo con tests (la
 * landing ya tuvo una curva que se salia del recuadro por un paso mal medido).
 *
 * Los DIAS son de ejemplo. Lo que SI coincide con la cuenta real de la que sale
 * el ejemplo son los totales: P&L neto $1,308.95, balance $11,308.95 (con
 * $10,000 de partida) y expected value $8.61 sobre 152 operaciones.
 */

/** Dias de enero con operaciones: [dia, resultado]. */
export const ENERO: ReadonlyArray<readonly [number, number]> = [
  [26, 96.4],
  [28, -38.2],
  [29, 71.85],
  [30, 84.0],
];

/**
 * Febrero de 2026 en filas domingo-sabado. Cada celda es el resultado del dia,
 * o null si no hubo operaciones. El numero del dia es fila * 7 + columna + 1,
 * porque el 1 de febrero de 2026 cae en domingo.
 */
export const FEBRERO: ReadonlyArray<ReadonlyArray<number | null>> = [
  [null, 222.9, -48.6, 96.4, null, null, null],
  [null, 58.2, 142.6, -73.4, 109.85, null, null],
  [null, null, 187.35, -52.1, 96.7, 61.45, null],
  [null, 131.1, -96.25, 104.6, 54.3, 99.8, null],
];

export const BALANCE_INICIAL = 10000;
export const TOTAL_OPERACIONES = 152;
export const GANADAS = 109;
export const PERDIDAS = 43;

/** Marco del grafico (viewBox 640 x 262). */
export const GRAFICO = {
  ancho: 640,
  alto: 262,
  izq: 64, // donde empiezan las lineas de la rejilla
  der: 620, // donde acaban
  arriba: 20, // y de $1,400
  base: 216, // y de $0
  maximo: 1400, // lo que vale arriba
  x0: 78, // x del primer punto
  xFin: 610, // x del ultimo punto: dentro de la rejilla, no fuera
} as const;

/** y del grafico para un P&L acumulado. */
export function yDe(valor: number): number {
  const { base, arriba, maximo } = GRAFICO;
  return base - (valor / maximo) * (base - arriba);
}

/** Inversa de yDe: el P&L acumulado que representa una y. */
export function acumuladoDe(y: number): number {
  const { base, arriba, maximo } = GRAFICO;
  return ((base - y) * maximo) / (base - arriba);
}

/** Curva suavizada con la misma tension (0.4) que usa Chart.js en el dashboard. */
export function curvaSuave(pts: ReadonlyArray<readonly [number, number]>, tension = 0.4): string {
  const n = pts.length;
  const f = (v: number) => v.toFixed(1);
  type P = readonly [number, number];
  const ctrl = (a: P, b: P, c: P) => {
    const d01 = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const d12 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const s = d01 + d12 || 1;
    const fa = (tension * d01) / s;
    const fb = (tension * d12) / s;
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    return {
      p: [b[0] - fa * dx, b[1] - fa * dy] as P,
      n: [b[0] + fb * dx, b[1] + fb * dy] as P,
    };
  };
  const cs = pts.map((p, i) =>
    i === 0 || i === n - 1 ? { p, n: p } : ctrl(pts[i - 1], p, pts[i + 1]),
  );
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C${f(cs[i].n[0])},${f(cs[i].n[1])} ${f(cs[i + 1].p[0])},${f(cs[i + 1].p[1])} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
  }
  return d;
}

export type CeldaDia = { n: number; valor: number | null };
export type Semana = {
  numero: number;
  desde: number;
  hasta: number;
  suma: number;
  dias: number;
};

export type Calendario = {
  filas: CeldaDia[][];
  semanas: Semana[];
  total: number;
  diasOperados: number;
  mejor: { valor: number; n: number };
  peor: { valor: number; n: number };
};

/** El calendario de febrero con sus semanas y sus totales. */
export function calendario(): Calendario {
  let total = 0;
  let diasOperados = 0;
  let mejor = { valor: -Infinity, n: 0 };
  let peor = { valor: Infinity, n: 0 };
  const semanas: Semana[] = [];
  const filas = FEBRERO.map((fila, r) => {
    let suma = 0;
    let dias = 0;
    const celdas = fila.map((valor, c) => {
      const n = r * 7 + c + 1;
      if (valor !== null) {
        suma += valor;
        dias += 1;
        total += valor;
        diasOperados += 1;
        if (valor > mejor.valor) mejor = { valor, n };
        if (valor < peor.valor) peor = { valor, n };
      }
      return { n, valor };
    });
    semanas.push({ numero: r + 1, desde: r * 7 + 1, hasta: r * 7 + 7, suma, dias });
    return celdas;
  });
  return { filas, semanas, total, diasOperados, mejor, peor };
}

export type PuntoCurva = { mes: 0 | 1; dia: number; delta: number; acumulado: number };

export type Curva = {
  puntos: PuntoCurva[];
  xy: [number, number][];
  linea: string;
  area: string;
  puntosPath: string;
  bandaX: number;
  bandaAncho: number;
  ticks: { x: number; mes: 0 | 1; dia: number }[];
};

/** La curva de P&L acumulado de enero y febrero. */
export function curva(): Curva {
  const base: { mes: 0 | 1; dia: number; delta: number }[] = [];
  ENERO.forEach(([dia, delta]) => base.push({ mes: 0, dia, delta }));
  const cal = calendario();
  cal.filas.forEach((fila) =>
    fila.forEach((c) => {
      if (c.valor !== null) base.push({ mes: 1, dia: c.n, delta: c.valor });
    }),
  );

  let acum = 0;
  const puntos = base.map((p) => {
    acum += p.delta;
    return { ...p, acumulado: acum };
  });

  const { x0, xFin } = GRAFICO;
  const paso = (xFin - x0) / (puntos.length - 1);
  const xy = puntos.map((p, i) => [x0 + i * paso, yDe(p.acumulado)] as [number, number]);
  const linea = curvaSuave(xy);
  const ultimo = xy[xy.length - 1];

  const primerFeb = puntos.findIndex((p) => p.mes === 1);
  const bandaX = x0 + primerFeb * paso - paso / 2;
  const bandaFin = Math.min(GRAFICO.der, ultimo[0] + paso / 2);

  // Cinco rotulos repartidos por la curva, sobre puntos que existen de verdad.
  const idx = [0, primerFeb, Math.round((puntos.length - 1) * 0.55), Math.round((puntos.length - 1) * 0.8), puntos.length - 1];
  const ticks = idx.map((i) => ({ x: xy[i][0], mes: puntos[i].mes, dia: puntos[i].dia }));

  return {
    puntos,
    xy,
    linea,
    area: `${linea} L${ultimo[0].toFixed(1)},${GRAFICO.base} L${x0},${GRAFICO.base} Z`,
    puntosPath: xy.map((p) => `M${p[0].toFixed(1)},${p[1].toFixed(1)} h0`).join(" "),
    bandaX,
    bandaAncho: bandaFin - bandaX,
    ticks,
  };
}

export type Cifras = {
  balance: number;
  pnl: number;
  winrate: number;
  profitFactor: string;
  riesgoBeneficio: string;
  operaciones: number;
  ganadas: number;
  perdidas: number;
  expectedValue: number;
  tiempoMedio: string;
};

/** Las ocho cifras globales. Los totales salen de los dias de ejemplo. */
export function cifras(): Cifras {
  const pnl = curva().puntos.at(-1)?.acumulado ?? 0;
  return {
    balance: BALANCE_INICIAL + pnl,
    pnl,
    winrate: (GANADAS / TOTAL_OPERACIONES) * 100,
    profitFactor: "3.24",
    riesgoBeneficio: "1.28",
    operaciones: TOTAL_OPERACIONES,
    ganadas: GANADAS,
    perdidas: PERDIDAS,
    expectedValue: pnl / TOTAL_OPERACIONES,
    tiempoMedio: "49m 33s",
  };
}

/** Formato de dinero igual que el del dashboard: $1,234.56 y −$1,234.56. */
export function dinero(v: number, conSigno = false): string {
  const a = Math.abs(v)
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (v < 0) return `−$${a}`;
  return `${conSigno ? "+" : ""}$${a}`;
}

export type Radar = {
  anillos: string[];
  ejes: string;
  datos: string;
  puntos: string;
  etiquetas: { x: number; y: number }[];
};

export const PUNTAJE = 81.18;
export const RADAR_VALORES = [0.66, 1.0, 0.12, 1.0, 0.94, 0.78] as const;

/** Radar de seis ejes, el primero arriba y en sentido horario. */
export function radar(): Radar {
  const cx = 190;
  const cy = 120;
  const R = 80;
  const ang = [-90, -30, 30, 90, 150, 210].map((a) => (a * Math.PI) / 180);
  const en = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(ang[i]),
    cy + r * Math.sin(ang[i]),
  ];
  const poligono = (pts: [number, number][]) =>
    pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const seis = [0, 1, 2, 3, 4, 5];
  const datos = RADAR_VALORES.map((v, i) => en(i, R * v));
  return {
    anillos: [0.2, 0.4, 0.6, 0.8, 1].map((s) => poligono(seis.map((i) => en(i, R * s)))),
    ejes: seis
      .map((i) => {
        const p = en(i, R);
        return `M${cx},${cy} L${p[0].toFixed(1)},${p[1].toFixed(1)}`;
      })
      .join(" "),
    datos: poligono(datos),
    puntos: datos.map((p) => `M${p[0].toFixed(1)},${p[1].toFixed(1)} h0`).join(" "),
    etiquetas: seis.map((i) => {
      const p = en(i, R + 16);
      return { x: Number(p[0].toFixed(1)), y: Number((p[1] + 4).toFixed(1)) };
    }),
  };
}
