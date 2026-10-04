"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import {
  FILAS_FIJAS,
  addDias,
  celdasEnPantalla as rotarCeldas,
  computeStats,
  filasDelMes,
  indicesDelMes,
  lunesDe,
  pad,
  resumenDelMes,
  type StatInput,
} from "../../lib/resumen";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  RadarController,
  RadialLinearScale,
} from "chart.js";

// Hook para animar números (count up)
function useAnimatedNumber(value: number, duration = 900): number {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    function step(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  RadarController,
  RadialLinearScale
);

/* El HTML original hace esto en initCharts(): fija la fuente y el color por defecto
   de TODOS los gráficos. Sin esto, Chart.js usa Helvetica/#666 y las etiquetas de
   los ejes y del radar se ven distintas al original. */
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.color = "#8E93A6";

/* Los meses abreviados y los nombres de mes/día vienen del diccionario de
   idioma (list("months.short"), etc.), para que ES y EN no se desincronicen.
   Antes estaban duplicados en tres sitios dentro de este archivo. */

export type SummaryTrade = {
  entry_time: string | null;
  exit_time: string | null;
  commission: number;
  swap: number;
  pnl_bruto: number;
  pnl_neto: number | null;
};


/* Cifras SIEMPRE completas, con separador de miles.
   Antes esta función abreviaba: 1086 se veía como "$1.09K". Venía del HTML
   original, pero en una herramienta de trading una cifra abreviada es
   ambigua ($1.09K podría ser 1.090 o 1.094), así que se eliminó. */
function fmtMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}





/** Duración media de las operaciones. Como el resto de las tarjetas, va sobre
 *  TODAS las operaciones: la duración media de un mes con cuatro trades no
 *  describe nada. */
function avgTradeDurationLabel(trades: SummaryTrade[]): string {
  const durations = trades
    .map((t) => {
      if (!t.entry_time || !t.exit_time) return null;
      const open = new Date(t.entry_time.replace(" ", "T"));
      const close = new Date(t.exit_time.replace(" ", "T"));
      const ms = close.getTime() - open.getTime();
      return ms >= 0 ? ms : null;
    })
    .filter((ms): ms is number => ms != null);

  if (!durations.length) return "—";
  const avgMs = durations.reduce((a, b) => a + b, 0) / durations.length;
  const totalSec = Math.round(avgMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
}

/**
 * Barra de Winrate: se rellena al cargar y luego un brillo la recorre.
 *
 * El width arranca en 0 y se sube en el frame siguiente. Sin ese frame
 * intermedio la transición CSS no tiene desde dónde arrancar: React pinta el
 * ancho final en el primer render y la barra aparecería de golpe, sin
 * animarse. El HTML original lo resolvía poniendo style="width:0%" en el
 * markup y fijando después el ancho desde JavaScript.
 */
function WinRateBar({ value }: { value: number }) {
  const objetivo = Math.min(100, Math.max(0, value));
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAncho(objetivo));
    return () => cancelAnimationFrame(id);
  }, [objetivo]);

  return (
    <div className="bar-split">
      <div className="bar-fill" style={{ width: `${ancho}%` }} />
    </div>
  );
}

/**
 * Una fila del calendario: los siete días de una semana y, en la última
 * columna, el resumen de ESA MISMA semana.
 *
 * Es un componente aparte para que quede claro que las dos mitades de la fila
 * son la misma semana. Al vivir en la misma rejilla, el resumen no puede
 * desalinearse de sus días por muy que cambie el número de semanas del mes.
 *
 * `rango` se le pasa ya calculado porque el componente está fuera del que tiene
 * acceso al idioma.
 */
function RowSemana({
  fila,
  rango,
  setHoverDia,
  hoverDia,
  hoyISO,
  fmtMoney,
  textos,
}: {
  fila: {
    n: number;
    lunes: string;
    domingo: string;
    suma: number;
    dias: number;
    celdas: { iso: string; dia: number; otroMes: boolean; v: number | undefined }[];
  };
  rango: string;
  setHoverDia: (iso: string | null) => void;
  hoverDia: string | null;
  hoyISO: string;
  fmtMoney: (n: number) => string;
  textos: {
    semana: (n: number) => string;
    dayCount: (n: number) => string;
    noTrades: string;
  };
}) {
  const sinOperaciones = fila.dias === 0;
  const color = fila.suma > 0 ? "var(--green)" : fila.suma < 0 ? "var(--red)" : "var(--muted)";
  // La clase dispara el pulso del total, igual que en los importes del
  // calendario. Sin operaciones no hay pulso ni color.
  const claseWk = sinOperaciones
    ? "cal-wk vacia"
    : fila.suma > 0 ? "cal-wk win" : fila.suma < 0 ? "cal-wk loss" : "cal-wk";


  return (
    <>
      {rotarCeldas(fila.celdas).map((c) => (
        <div
          key={c.iso}
          className={`day${c.v !== undefined ? (c.v > 0 ? " win" : c.v < 0 ? " loss" : "") : ""}`
            + `${c.otroMes ? " otro" : ""}`
            + `${c.iso === hoyISO ? " hoy" : ""}`
            + `${c.iso === hoyISO && c.otroMes ? " hoy-otro" : ""}`
            + `${c.iso === hoverDia ? " senalado" : ""}`}
          onMouseEnter={() => setHoverDia(c.iso)}
        >
          <div className="d">{c.dia}</div>
          {c.v !== undefined && (
            <div className="p">{c.v > 0 ? "+" : ""}{fmtMoney(c.v)}</div>
          )}
        </div>
      ))}

      <div className={claseWk}>
        <span className="l">
          {textos.semana(fila.n)}
          <span className="wk-range">{rango}</span>
        </span>
        <span className="r">
          {sinOperaciones ? (
            <i className="wk-sin">{textos.noTrades}</i>
          ) : (
            <>
              <b style={{ color }}>{fmtMoney(fila.suma)}</b>
              {textos.dayCount(fila.dias)}
            </>
          )}
        </span>
      </div>
    </>
  );
}

export default function SummaryView({ trades, initialBalance }: { trades: SummaryTrade[]; initialBalance: number | null }) {
  const { t, list, locale } = useI18n();
  const mesesCorto = list("months.short");
  const mesesFull = list("months.full");
  const dowNames = list("dow.short");

  /* Fecha completa del tooltip. El orden de las palabras cambia: en español es
     "23 de ene, 2026" y en inglés "Jan 23, 2026". */
  const fechaLarga = (d: Date) =>
    locale === "es"
      ? `${d.getUTCDate()} de ${mesesCorto[d.getUTCMonth()] ?? ""}, ${d.getUTCFullYear()}`
      : `${mesesCorto[d.getUTCMonth()] ?? ""} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

  /* Rango de una semana: "19–25 ene" en español, "Jan 19–25" en inglés.
     Si la semana cae en dos meses distintos se muestran los dos
     ("29 ene – 4 feb"), porque "29–4" a secas es ambiguo. */
  const rangoSemana = (primeraISO: string, ultimaISO: string) => {
    const a = new Date(`${primeraISO}T00:00:00Z`);
    const b = new Date(`${ultimaISO}T00:00:00Z`);
    const ma = mesesCorto[a.getUTCMonth()] ?? "";
    const mb = mesesCorto[b.getUTCMonth()] ?? "";
    const mismoMes = a.getUTCMonth() === b.getUTCMonth();
    if (mismoMes) {
      return locale === "es"
        ? `${a.getUTCDate()}–${b.getUTCDate()} ${mb}`
        : `${ma} ${a.getUTCDate()}–${b.getUTCDate()}`;
    }
    return locale === "es"
      ? `${a.getUTCDate()} ${ma} – ${b.getUTCDate()} ${mb}`
      : `${ma} ${a.getUTCDate()} – ${mb} ${b.getUTCDate()}`;
  };

  const pnlCanvasRef = useRef<HTMLCanvasElement>(null);
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const pnlChartRef = useRef<Chart | null>(null);
  const radarChartRef = useRef<Chart | null>(null);
  // Estado compartido del plugin "onda" del gráfico de PnL (ver pnlWavePlugin).
  const pnlWavePhaseRef = useRef(0);
  const pnlSweepStartRef = useRef<number | null>(null);
  if (pnlSweepStartRef.current === null) pnlSweepStartRef.current = performance.now();

  const [calYear, setCalYear] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState<number | null>(null);
  /* Dirección y contador de la animación de cambio de mes. El contador se usa
     como `key` de la rejilla: al cambiar, React remonta las celdas y la
     animación CSS vuelve a empezar. */
  const [calAnim, setCalAnim] = useState(0);
  const [calDesplazamiento, setCalDesplazamiento] = useState<1 | -1>(1);
  /* Día señalado con el ratón, en cualquiera de los dos sitios: pasar por una
     celda del calendario resalta su punto en la línea de PnL, y al revés. */
  const [hoverDia, setHoverDia] = useState<string | null>(null);
  // true cuando el usuario navega el calendario a mano; entonces ya no se
  // auto-ajusta al mes de los datos.
  const calNavManual = useRef(false);

  /* El mes visible, en un ref, para que lo lea el plugin del gráfico.
     Chart.js registra los plugins UNA vez, al crear el chart, así que si el
     plugin cerrara sobre `calMonth` se quedaría con el valor del primer render y
     la banda no se movería al navegar. Con un ref, el closure lee siempre el
     valor actual. Es el mismo truco que usan pnlWavePhase y pnlSweepStart. */
  const mesEnRef = useRef<[number, number] | null>(null);
  mesEnRef.current = calYear !== null && calMonth !== null ? [calYear, calMonth] : null;

  const items: StatInput[] = useMemo(
    () =>
      trades
        .filter((t) => !!t.exit_time)
        .map((t) => ({
          date: (t.exit_time as string).slice(0, 10),
          pnl: t.pnl_neto !== null && t.pnl_neto !== undefined ? t.pnl_neto : t.pnl_bruto + t.commission + t.swap,
        })),
    [trades]
  );

  /* `s` es la estadística de TODO el histórico, y la usan las ocho tarjetas, el
     radar, el puntaje y el gráfico. DELIBERADAMENTE no cambia al navegar el
     calendario.

     Decisión del usuario: las tarjetas son el rendimiento de la cuenta, no
     una foto de un mes. Se probó filtrarlas por mes (era la propuesta D2) y se
     revirtió, porque con pocos trades el winrate de un mes no dice nada: dos
     operaciones y un 100% no es un dato, es ruido. El winrate que importa es el
     de las 300 operaciones, no el de las 4 de este mes.

     El calendario, el resumen semanal y el total del mes SÍ responden al mes,
     porque ahí la granularidad es el punto: estás leyendo los días, no una nota.
     Para que no haya duda de qué es cada cosa, las tarjetas llevan una etiqueta
     que lo dice y el gráfico lleva la franja del mes. */
  const s = useMemo(() => computeStats(items), [items]);

  const dailyMap = useMemo(() => {
    const m: Record<string, number> = {};
    s.dailyEntries.forEach(([d, v]) => (m[d] = v));
    return m;
  }, [s]);

  /* Mes de referencia = el del último día con datos.
     OJO: antes esto se fijaba solo en el primer render (guard `calYear !== null`),
     pero en ese primer render `trades` todavía viene vacío, así que el calendario
     se quedaba pegado al mes actual y nunca mostraba los días con operaciones.
     Ahora sigue al mes de los datos mientras el usuario no navegue a mano. */
  const dataRefMonth = useMemo(() => {
    if (!s.dailyEntries.length) return null;
    const d = new Date(`${s.dailyEntries[s.dailyEntries.length - 1][0]}T00:00:00Z`);
    return d.getUTCFullYear() * 12 + d.getUTCMonth();
  }, [s]);

  useEffect(() => {
    if (dataRefMonth === null || calNavManual.current) return;
    const d = new Date(`${s.dailyEntries[s.dailyEntries.length - 1][0]}T00:00:00Z`);
    setCalYear(d.getUTCFullYear());
    setCalMonth(d.getUTCMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataRefMonth]);

  // Sin trades todavía: mostrar el mes actual (igual que el HTML original).
  useEffect(() => {
    if (calYear !== null || calNavManual.current) return;
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Plugins de animación para el gráfico PnL ----
  const pnlGlowPlugin = {
    id: "pnlGlow",
    beforeDatasetsDraw(chart: Chart) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.shadowColor = "rgba(47,216,200,.65)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 3;
    },
    afterDatasetsDraw(chart: Chart) {
      chart.ctx.restore();
    },
  };

  /* Plugin "banda del mes": sombrea la franja del eje X que corresponde al mes
     que se está viendo en el calendario.

     EL GRÁFICO NO SE RECORTA. La curva es la de todo el año, porque es la que
     dice "por dónde voy": cuánto llevo ganado, cuán profundo fue el drawdown y si
     estoy recuperando. Recortarla al mes la reiniciaría en cero y perdería todo
     eso. Lo que hace este plugin es señalar DÓNDE está el mes dentro de esa
     curva, para que se pueda leer "cómo fue este mes" sobre el contexto del año.

     Se pinta antes que la línea (beforeDatasetsDraw) para que la curva quede
     encima y no la tape. El ancho se toma de los puntos ya calculados: con un
     solo día del mes, la banda se estrecha para no comerse los meses vecinos. */
  const pnlMonthBandPlugin = {
    id: "pnlMonthBand",
    beforeDatasetsDraw(chart: Chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || meta.data.length < 1) return;
      if (mesEnRef.current === null) return;

      const fechas = (chart.data.datasets[0] as unknown as { fullDates?: string[] }).fullDates;
      if (!fechas || !fechas.length) return;

      const rango = indicesDelMes(fechas, mesEnRef.current[0], mesEnRef.current[1]);
      const { left, right, top, bottom } = chart.chartArea;

      let x1: number;
      let x2: number;
      if (rango === null) {
        return; // el mes no tiene ningún día con operaciones: no hay banda
      } else if (rango.desde === rango.hasta) {
        // Un solo día. La banda se limita a un ancho legible en vez de
        // medir cero, que sería invisible.
        const p = meta.data[rango.desde];
        const ancho = 14;
        x1 = p.x - ancho / 2;
        x2 = p.x + ancho / 2;
      } else {
        const a = meta.data[rango.desde].x;
        const b = meta.data[rango.hasta].x;
        // Un poco de margen a cada lado, para que el primer y el último día del
        // mes queden dentro de la banda y no en el borde.
        const pad = Math.min(18, (b - a) / 2);
        x1 = a - pad;
        x2 = b + pad;
      }

      const ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = "rgba(47,216,200,.07)";
      ctx.fillRect(x1, top, x2 - x1, bottom - top);
      ctx.strokeStyle = "rgba(47,216,200,.30)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, top);
      ctx.lineTo(x1, bottom);
      ctx.moveTo(x2, top);
      ctx.lineTo(x2, bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  // Plugin "onda": dibuja, sobre la línea ya trazada, un brillo que se desliza
  // de izquierda a derecha (en loop) para dar sensación de energía fluyendo por la línea.
  // pnlWavePhase y pnlSweepStart van en refs para que el plugin (que Chart.js solo
  // registra una vez, al crear el chart) y el requestAnimationFrame que la incrementa
  // compartan siempre la MISMA variable.
  const PNL_SWEEP_EVERY = 8000;
  const PNL_SWEEP_DURATION = 1600;
  const PNL_SWEEP_BAND = 0.24;
  const pnlWavePlugin = {
    id: "pnlWave",
    afterDatasetsDraw(chart: Chart) {
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || meta.data.length < 2) return;
      const pts = meta.data.map((p) => ({ x: p.x, y: p.y }));
      const { left, right } = chart.chartArea;
      if (!isFinite(left) || !isFinite(right) || right <= left) return;
      const ctx = chart.ctx;
      const grad = ctx.createLinearGradient(left, 0, right, 0);
      const bandWidth = 0.16;
      const stops = 32;
      // Barrido brillante que recorre toda la línea cada PNL_SWEEP_EVERY ms
      const elapsed = (performance.now() - (pnlSweepStartRef.current as number)) % PNL_SWEEP_EVERY;
      let sweepPos: number | null = null;
      if (elapsed < PNL_SWEEP_DURATION) {
        const t = elapsed / PNL_SWEEP_DURATION;
        sweepPos = -PNL_SWEEP_BAND + t * (1 + 2 * PNL_SWEEP_BAND);
      }
      for (let i = 0; i <= stops; i++) {
        const t = i / stops;
        let d = Math.abs(t - pnlWavePhaseRef.current);
        d = Math.min(d, 1 - d);
        const wave = Math.max(0, 1 - d / bandWidth) * 0.5;
        let sweep = 0;
        if (sweepPos !== null) {
          const d2 = Math.abs(t - sweepPos);
          sweep = Math.max(0, 1 - d2 / PNL_SWEEP_BAND);
        }
        const intensity = Math.min(1, wave + sweep);
        const alpha = (0.04 + intensity * 0.9).toFixed(3);
        grad.addColorStop(t, `rgba(160,255,238,${alpha})`);
      }
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(160,255,238,.9)";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const midX = (prev.x + cur.x) / 2;
        const midY = (prev.y + cur.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.restore();
    },
  };

  // ---- Gráfico de PnL acumulado ----
  useEffect(() => {
    if (!pnlCanvasRef.current) return;

    /* Puntos en los días. El HTML original los tenía ocultos (pointRadius:0)
       y solo aparecían al pasar el ratón; ahora se ven siempre, que es lo que
       permite leer dónde están los saltos de la curva.

       Con muchos días los puntos se solaparían y quedarían ilegibles, así que
       por encima de 45 se ocultan: una mancha de puntos no informa de nada. */
    const demasiadosPuntos = s.cumSeries.length > 45;

    if (!pnlChartRef.current) {
      pnlChartRef.current = new Chart(pnlCanvasRef.current, {
        type: "line",
        data: { labels: [], datasets: [{ data: [], borderColor: "#2FD8C8", borderWidth: 2.5, tension: 0.4, pointRadius: demasiadosPuntos ? 0 : 2.4, pointHitRadius: 12, pointHoverRadius: 5.5, pointBackgroundColor: "#2FD8C8", pointBorderColor: "#0a0c14", pointBorderWidth: 1, pointHoverBackgroundColor: "#8CFFE6", pointHoverBorderColor: "#0a0c14", pointHoverBorderWidth: 2, fill: true, backgroundColor: (c: { chart: Chart }) => {
          const { ctx } = c.chart;
          const g = ctx.createLinearGradient(0, 0, 0, 220);
          g.addColorStop(0, "rgba(47,216,200,.45)");
          g.addColorStop(0.6, "rgba(47,216,200,.10)");
          g.addColorStop(1, "rgba(47,216,200,0)");
          return g;
        } }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          /* Ratón sobre la línea -> resalta la celda de ese día en el
             calendario. La otra mitad del enlace (celda -> línea) está en el
             efecto de más abajo, que mueve el tooltip del gráfico. */
          onHover: (evt, _els, chart) => {
            /* Chart.js entrega un ChartEvent; getElementsAtEventForMode pide el
               Event nativo, que viene en .native. */
            const pts = chart.getElementsAtEventForMode(
              (evt.native ?? evt) as Event,
              "index",
              { intersect: false },
              true,
            );
            const fecha = pts.length ? s.cumSeries[pts[0].index]?.date : undefined;
            setHoverDia(fecha ?? null);
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(10,12,20,.92)",
              borderColor: "rgba(47,216,200,.4)",
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              titleFont: { size: 11.5, weight: 600 },
              bodyFont: { size: 12, family: "'IBM Plex Mono', monospace" },
              bodySpacing: 4,
              callbacks: {
                /* Mismo callback del HTML original: las etiquetas del eje X son solo
                   el número de día, así que el título del tooltip se reconstruye con
                   la fecha completa desde `fullDates` ("23 de ene, 2026"). */
                title: (items) => {
                  const it = items[0];
                  const ds = it.chart.data.datasets[0] as unknown as { fullDates?: string[] };
                  const dateStr = ds.fullDates && ds.fullDates[it.dataIndex];
                  if (!dateStr) return it.label;
                  return fechaLarga(new Date(dateStr + "T00:00:00Z"));
                },
                label: (ctx) => {
                  const ds = ctx.chart.data.datasets[0] as unknown as { dailyCount: number[]; dailyPnl: number[] };
                  const count = ds.dailyCount ? ds.dailyCount[ctx.dataIndex] : 0;
                  const pnl = ds.dailyPnl ? ds.dailyPnl[ctx.dataIndex] : 0;
                  const sign = pnl >= 0 ? "+" : "-";
                  const pnlTxt = "$" + Math.abs(pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return [
                    t("chart.tradeCount", { n: count }),
                    t("chart.profit", { pnl: sign + pnlTxt }),
                  ];
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 6, font: { size: 10 } } },
            y: {
              grid: { color: "rgba(255,255,255,.09)" },
              /* Separador de miles también en el eje: si no, 1200 aparece como
                 "$1200" junto a "$200", y no se lee de un vistazo. */
              ticks: {
                callback: (v) => "$" + Number(v).toLocaleString("en-US"),
                font: { size: 10 },
              },
            },
          },
        },
        plugins: [pnlGlowPlugin, pnlMonthBandPlugin, pnlWavePlugin],
      });
    }

    const chart = pnlChartRef.current;
    chart.data.labels = s.cumSeries.map((p) => `${new Date(`${p.date}T00:00:00Z`).getUTCDate()}`);
    chart.data.datasets[0].data = s.cumSeries.map((p) => Math.round(p.cum * 100) / 100);
    (chart.data.datasets[0] as unknown as { dailyPnl: number[] }).dailyPnl = s.cumSeries.map((p) => p.pnl);
    (chart.data.datasets[0] as unknown as { dailyCount: number[] }).dailyCount = s.cumSeries.map((p) => p.count);
    // El eje X solo muestra el número de día; el tooltip usa fullDates para la fecha completa.
    (chart.data.datasets[0] as unknown as { fullDates: string[] }).fullDates = s.cumSeries.map((p) => p.date);
    // Cambiar de cuenta cambia el número de días, así que el radio de los
    // puntos hay que recalcularlo: si no, se quedarían pegados al cambiar a
    // una cuenta con muchos más días.
    // El cast es necesario: Chart.js tipa datasets[0] como una unión de todos
    // los tipos de gráfico, y pointRadius no existe en todos ellos.
    (chart.data.datasets[0] as unknown as { pointRadius: number }).pointRadius =
      demasiadosPuntos ? 0 : 2.4;
    /* La banda del mes se pinta si el mes cambió. Va en un 'none' aparte porque
       la animación por defecto del update() movería la línea entera de golpe al
       cambiar de cuenta. */
    chart.update("none");
    // locale entra en las dependencias porque el tooltip se reconstruye al
    // cambiar de idioma ("23 de ene, 2026" <-> "Jan 23, 2026").
  }, [s, locale, calYear, calMonth]);

  /* Celda del calendario -> línea de PnL.
     Chart.js no tiene forma de "marcar" un punto desde fuera salvo activando
     sus elementos, así que se activan a mano y se le da la posición real del
     punto para que el tooltip aparezca encima y no en la esquina.
     update('none') es importante: sin modo, Chart.js animaría el movimiento. */
  useEffect(() => {
    const chart = pnlChartRef.current;
    if (!chart) return;

    const idx = hoverDia ? s.cumSeries.findIndex((p) => p.date === hoverDia) : -1;

    if (idx >= 0) {
      const punto = chart.getDatasetMeta(0).data[idx];
      chart.setActiveElements([{ datasetIndex: 0, index: idx }]);
      chart.tooltip?.setActiveElements([{ datasetIndex: 0, index: idx }], {
        x: punto?.x ?? 0,
        y: punto?.y ?? 0,
      });
    } else {
      chart.setActiveElements([]);
      chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    }
    chart.update("none");
  }, [hoverDia, s.cumSeries]);

  // Loop de animación de la onda: incrementa la fase y fuerza el redibujado.
  useEffect(() => {
    let raf = 0;
    function waveLoop() {
      pnlWavePhaseRef.current = (pnlWavePhaseRef.current + 0.0035) % 1;
      const chart = pnlChartRef.current;
      if (chart && chart.canvas.isConnected && document.visibilityState === "visible") {
        chart.draw();
      }
      raf = requestAnimationFrame(waveLoop);
    }
    raf = requestAnimationFrame(waveLoop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- Radar "Puntaje del trader" ----
  useEffect(() => {
    if (!radarCanvasRef.current) return;
    if (!radarChartRef.current) {
      radarChartRef.current = new Chart(radarCanvasRef.current, {
        type: "radar",
        data: {
          labels: [
            t("radar.winRate"), t("radar.profitFactor"), t("radar.wlRatio"),
            t("radar.recovery"), t("radar.maxDrawdown"), t("radar.consistency"),
          ],
          datasets: [{ data: [0, 0, 0, 0, 0, 0], borderColor: "#E22FA0", backgroundColor: (c) => {
            const { ctx, chartArea } = c.chart;
            if (!chartArea) return "rgba(226,47,160,.25)";
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            const r = Math.max(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, "rgba(226,47,160,.5)");
            g.addColorStop(0.7, "rgba(226,47,160,.22)");
            g.addColorStop(1, "rgba(226,47,160,.04)");
            return g;
          }, borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: "#E22FA0", pointBorderColor: "#fff", pointBorderWidth: 1.5, pointHoverRadius: 6, pointHoverBackgroundColor: "#fff", pointHoverBorderColor: "#E22FA0", pointHoverBorderWidth: 2.5, fill: true }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          elements: { line: { tension: 0.08 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(10,12,20,.92)",
              borderColor: "rgba(226,47,160,.4)",
              borderWidth: 1,
              padding: 9,
              cornerRadius: 8,
              titleFont: { size: 11.5, weight: 600 },
              bodyFont: { size: 12, family: "'IBM Plex Mono', monospace" },
              callbacks: { label: (ctx) => (ctx.raw as number).toFixed(0) + " / 100" },
            },
          },
          scales: {
            r: {
              grid: { color: "rgba(255,255,255,.09)" },
              angleLines: { color: "rgba(255,255,255,.09)" },
              pointLabels: { font: { size: 9.5 } },
              ticks: { display: false },
            },
          },
        },
      });
    }
    const chart = radarChartRef.current;
    // El radar es una foto del mes que se está viendo, como las ocho tarjetas.
    chart.data.datasets[0].data = [s.radar.winRate, s.radar.profitFactor, s.radar.wlRatio, s.radar.recovery, s.radar.ddScore, s.radar.consistency].map((v) => Math.round(v));
    // locale: las etiquetas del radar se fijan al crear el chart, así que hay
    // que reconstruirlas al cambiar de idioma.
    chart.data.labels = [
      t("radar.winRate"), t("radar.profitFactor"), t("radar.wlRatio"),
      t("radar.recovery"), t("radar.maxDrawdown"), t("radar.consistency"),
    ];
    chart.update();
  }, [s, locale]);

  /* Flecha de mes que se acaba de pulsar, para que se vea cuál se pulsó.
     Se borra sola: es una pista visual, no un estado que haya que managing. */
  const [calFlash, setCalFlash] = useState<"prev" | "next" | null>(null);
  const calFlashRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    if (calFlashRef.current) window.clearTimeout(calFlashRef.current);
  }, []);

  function flashFlecha(direccion: "prev" | "next") {
    if (calFlashRef.current) window.clearTimeout(calFlashRef.current);
    setCalFlash(direccion);
    calFlashRef.current = window.setTimeout(() => setCalFlash(null), 380);
  }

  function navigateCalendar(delta: number) {
    if (calYear === null || calMonth === null) return;
    calNavManual.current = true;
    let y = calYear;
    let m = calMonth + delta;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCalYear(y);
    setCalMonth(m);
    // Las celdas entran deslizándose en el sentido del desplazamiento.
    setCalDesplazamiento(delta > 0 ? 1 : -1);
    setCalAnim((k) => k + 1);
    flashFlecha(delta > 0 ? "next" : "prev");
  }
  function goToday() {
    // "Este mes" devuelve el control al calendario: vuelve a seguir a los datos.
    calNavManual.current = false;

    let y: number;
    let m: number;
    if (s.dailyEntries.length) {
      const d = new Date(`${s.dailyEntries[s.dailyEntries.length - 1][0]}T00:00:00Z`);
      y = d.getUTCFullYear();
      m = d.getUTCMonth();
    } else {
      const now = new Date();
      y = now.getFullYear();
      m = now.getMonth();
    }

    // Desliza en el sentido del salto, para que el botón "Este mes" se sienta
    // parte de la navegación y no un salto brusco.
    if (calYear !== null && calMonth !== null) {
      const distancia = (y - calYear) * 12 + (m - calMonth);
      if (distancia !== 0) {
        setCalDesplazamiento(distancia > 0 ? 1 : -1);
        setCalAnim((k) => k + 1);
        flashFlecha(distancia > 0 ? "next" : "prev");
      }
    }
    setCalYear(y);
    setCalMonth(m);
  }

  /* Todas las cifras salen de `s`, el histórico entero. No hay `sMes`. */
  const balance = initialBalance != null && isFinite(initialBalance) ? initialBalance + s.netPnl : s.netPnl;
  const balancePositive =
    initialBalance != null && isFinite(initialBalance) ? balance >= initialBalance : s.netPnl >= 0;
  const expectedValue = s.total ? s.netPnl / s.total : 0;
  const scoreTier = s.score < 50 ? "tier-low" : s.score < 75 ? "tier-mid" : "tier-high";

  // Animated numbers
  const animBalance = useAnimatedNumber(balance);
  const animNetPnl = useAnimatedNumber(s.netPnl);
  const animWinRate = useAnimatedNumber(s.winRate);
  const animExpectedValue = useAnimatedNumber(expectedValue);
  const animScore = useAnimatedNumber(s.score);

  const monthLabel = calYear !== null && calMonth !== null ? `${mesesFull[calMonth]} ${calYear}` : "—";

  /**
   * Filas del calendario. UNA fila = UNA semana completa de lunes a domingo.
   *
   * Aqui esta el cambio de fondo: antes el calendario y el resumen semanal eran
   * dos rejillas separadas y, la buena fe del CSS para que las filas
   * coincidieran. Ahora son la MISMA rejilla, asi que es imposible que se
   * desalineen.
   *
   * Por eso el calendario muestra semanas COMPLETAS, con los dias del mes
   * anterior y posterior que caen dentro de la semana. En enero de 2026, que
   * empieza en jueves, la primera fila es 29 dic - 4 ene: los tres primeros dias
   * son de diciembre y se muestran atenuados. Sin eso, la fila del calendario
   * que contiene el dia 4 mixearía dos semanas y no habría forma de alinear.
   *
   * La semana pertenece al mes donde cae su jueves, y se numera 1, 2, 3...
   * dentro de cada mes (misma regla que antes).
   *
   * El importe de la fila suma los siete dias, incluidos los del mes vecino:
   * asi el total de la fila es el total de la semana, sin duplicar ni perder
   * nada al cambiar de mes.
   */
  const filas = useMemo(
    () => (calYear === null || calMonth === null ? [] : filasDelMes(calYear, calMonth, dailyMap)),
    [calYear, calMonth, dailyMap]
  );



  /* Día de hoy en la zona horaria del navegador, que es la del usuario.
     Las celdas del calendario se numeran en UTC, así que comparar con
     toISOString() daría un desfase de un día en buena parte del mundo. */
  const hoyISO = useMemo(() => {
    const a = new Date();
    return `${a.getFullYear()}-${pad(a.getMonth() + 1)}-${pad(a.getDate())}`;
  }, []);

  /* Resumen del mes que se está viendo: total, días operados, mejor y peor
     día. Se calcula sobre el mes del calendario, no sobre todo el histórico,
     para que responda a "¿cómo fue este mes?". */
  const resumenMes = useMemo(
    () => (calYear === null || calMonth === null ? null : resumenDelMes(calYear, calMonth, dailyMap)),
    [calYear, calMonth, dailyMap]
  );

  /* ¿El mes visible tiene operaciones? Solo decide si se dibuja la franja del
     mes sobre el gráfico y su pista. Un mes vacío no tiene dónde señalar nada,
     y una franja sobre un hueco vacío parecería un dato que no existe. */
  const mesConOperaciones = resumenMes !== null && resumenMes.dias > 0;

  return (
    <>
      {/* Las ocho tarjetas son el RENDIMIENTO GLOBAL DE LA CUENTA y no cambian
          al navegar el calendario, por decisión del usuario. Se probó filtrarlas
          por mes y se revirtió: con pocas operaciones el winrate de un mes no
          dice nada (2 trades y 100% es ruido, no una estadística).

          Para que no haya duda de qué es cada cosa, la fila lleva su propia
          etiqueta y debajo una nota que lo dice. El calendario, el resumen
          semanal y el total del mes sí responden al mes, porque ahí la
          granularidad es justamente lo que se está leyendo. */}
      <div className="stats">
        <div className="stats-caption">
          <span className="stats-caption-title">{t("kpi.allTimeTitle")}</span>
          <span className="stats-caption-note">{t("kpi.allTimeNote")}</span>
        </div>
        <div className="card">
          <div className="label">{t("kpi.balance")}</div>
          <div className={`value num ${balancePositive ? "pos" : "neg"}`}>{fmtMoney(animBalance)}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.netPnl")}</div>
          <div className={`value num ${s.netPnl >= 0 ? "pos" : "neg"}`}>{fmtMoney(animNetPnl)}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.winrate")}</div>
          <div className="value num">{animWinRate.toFixed(2)}%</div>
          <WinRateBar value={s.winRate} />
        </div>
        <div className="card">
          <div className="label">{t("kpi.riskReward")}</div>
          <div className="value num">{s.avgLoss ? Math.abs(s.avgWin / s.avgLoss).toFixed(2) : "—"}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.profitFactor")}</div>
          <div className="value num">{isFinite(s.profitFactor) && s.profitFactor < 99 ? s.profitFactor.toFixed(2) : "∞"}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.totalTrades")}</div>
          <div className="value num">{s.total}</div>
          <div className="mini-note">
            <span style={{ color: "var(--green)" }}>{t("kpi.tradesWon", { n: s.wins.length })}</span> ·{" "}
            <span style={{ color: "var(--red)" }}>{t("kpi.tradesLost", { n: s.losses.length })}</span>
          </div>
        </div>
        <div className="card">
          <div className="label">
            {t("kpi.expectedValue")}{" "}
            <span title={t("kpi.expectedValueHelp")}>
              ⓘ
            </span>
          </div>
          <div className={`value num ${expectedValue >= 0 ? "pos" : "neg"}`}>{fmtMoney(animExpectedValue)}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.avgTradeTime")}</div>
          <div className="value num">{avgTradeDurationLabel(trades)}</div>
        </div>
      </div>

      <div className="grid-main">
        <div className="panel chart-panel">
          <h2>
            {t("chart.cumulativePnl")} <span>{monthLabel}</span>
          </h2>
          <div className="pnl-canvas-wrap">
            <canvas ref={pnlCanvasRef} height={150} />
          </div>
          {/* Pista de la franja turquesa. Sin ella, ver una banda sobre la curva
              no significa nada: el usuario no sabría si es un mes, un highlight
              o un error de render. */}
          {mesConOperaciones && (
            <div className="mini-note band-hint">{t("chart.monthBandHint")}</div>
          )}
        </div>

        <div className="panel score-panel">
          <h2>{t("score.title")}</h2>
          <div className="score-wrap">
            <div className="radar-canvas-wrap">
              <canvas ref={radarCanvasRef} width={230} height={200} />
            </div>
            <div className={`score-num num ${scoreTier}`}>{animScore.toFixed(2)}</div>
            <div className="score-bar" style={{ width: "90%" }}>
              <div className="score-bar-shine" />
              <i style={{ left: `${Math.min(100, Math.max(0, s.score))}%` }} />
            </div>
          </div>
        </div>

        {/* Un solo panel: cada fila es una semana completa (7 dias) y a su
            derecha, el resumen de ESA MISMA semana. Al ser la misma rejilla,
            las filas no pueden desalinearse. Ocupa todo el ancho de
            .grid-main porque ya no hay panel hermano al que dejarle sitio. */}
        <div className="panel cal-panel">
          <h2 className="cal-title">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="16" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="8.5" cy="14" r="1.1" fill="currentColor" />
              <circle cx="12" cy="14" r="1.1" fill="currentColor" />
            </svg>
            {t("cal.title")}
          </h2>
          {/* La barra de navegación va FUERA de la rejilla de las semanas, pero
              con la MISMA plantilla de columnas y la octava vacía. Así el final
              de la barra es el final del sábado por construcción.

              No puede ir dentro de .cal-grid: al ser un elemento más de esa
              rejilla, la colocación automática dejaba "Dom" en el primer hueco
              libre, que era la columna 8 de la fila 1, y todo el calendario se
              desplazaba una columna. */}
          <div className="cal-nav">
            <div className="cal-nav-inner">
              <button
                type="button"
                className={`cal-arrow${calFlash === "prev" ? " destello" : ""}`}
                onClick={() => navigateCalendar(-1)}
                aria-label={t("cal.prevMonth")}
              >
                ‹
              </button>
              <span
                className="cal-month"
                onClick={goToday}
                title={t("cal.backToCurrent")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToday();
                  }
                }}
              >
                {calMonth !== null ? mesesFull[calMonth] : "—"}
                <span className="cal-year">{calYear ?? ""}</span>
              </span>
              <button
                type="button"
                className={`cal-arrow${calFlash === "next" ? " destello" : ""}`}
                onClick={() => navigateCalendar(1)}
                aria-label={t("cal.nextMonth")}
              >
                ›
              </button>
            </div>
          </div>

          <div
            className={`cal-grid anim-${calDesplazamiento > 0 ? "next" : "prev"}`}
            key={calAnim}
            onMouseLeave={() => setHoverDia(null)}
          >
            {/* Las cabeceras se mantienen en el orden tradicional
                domingo-primero, como estaban. El desajuste no se arregla
                moviendo las cabeceras sino las CELDAS: la semana se construye
                de lunes a domingo, así que el domingo es el último elemento y
                se coloca el primero. Ver celdasEnPantalla en RowSemana. */}
            {dowNames.map((d, i) => (
              <div className={`dow${i === 0 || i === 6 ? " fin" : ""}`} key={d}>{d}</div>
            ))}
            <div className="dow cal-dow-wk">{t("cal.weekColumn")}</div>

            {filas.length === 0 && (
              <p className="mini-note cal-vacio">{t("weekly.empty")}</p>
            )}

            {filas.map((f) =>
              /* Filas de relleno: existen solo para mantener el alto del panel
                 constante entre meses. No se pintan. */
              f.relleno ? (
                <div className="cal-relleno" key={`relleno-${f.n}`} />
              ) : (
                <RowSemana
                  key={f.lunes}
                  fila={f}
                  rango={rangoSemana(f.lunes, f.domingo)}
                  setHoverDia={setHoverDia}
                  hoverDia={hoverDia}
                  hoyISO={hoyISO}
                  fmtMoney={fmtMoney}
                  textos={{
                    semana: (n) => t("weekly.week", { n }),
                    dayCount: (n) => t("weekly.dayCount", { n }),
                    noTrades: t("weekly.noTrades"),
                  }}
                />
              ),
            )}
          </div>

          {resumenMes && (
            <div className="cal-resumen">
              <span className="cr-item">
                <span className="cr-label">{t("cal.monthTotal")}</span>
                <b className={resumenMes.suma >= 0 ? "pos" : "neg"}>{fmtMoney(resumenMes.suma)}</b>
              </span>
              {resumenMes.dias === 0 ? (
                <span className="cr-item">{t("cal.noTrades")}</span>
              ) : (
                <>
                  <span className="cr-item">{t("cal.daysOperated", { n: resumenMes.dias })}</span>
                  {resumenMes.mejor && (
                    <span className="cr-item">
                      {t("cal.bestDay")} {Number(resumenMes.mejor.key.slice(8, 10))}{" "}
                      <b className={resumenMes.mejor.v >= 0 ? "pos" : "neg"}>{fmtMoney(resumenMes.mejor.v)}</b>
                    </span>
                  )}
                  {resumenMes.peor && resumenMes.peor.v < 0 && (
                    <span className="cr-item">
                      {t("cal.worstDay")} {Number(resumenMes.peor.key.slice(8, 10))}{" "}
                      <b className="neg">{fmtMoney(resumenMes.peor.v)}</b>
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
