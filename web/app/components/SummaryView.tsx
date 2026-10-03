"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";
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

const pad = (n: number) => String(n).padStart(2, "0");

function fmtMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const val = abs >= 1000 ? (abs / 1000).toFixed(2).replace(/\.00$/, "") + "K" : abs.toFixed(2).replace(/\.00$/, "");
  return sign + "$" + val;
}
function fmtMoneyFull(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type StatInput = { date: string; pnl: number };

/** Suma N días a una fecha ISO y devuelve la nueva fecha ISO. */
function addDias(fechaISO: string, n: number): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Fecha ISO (YYYY-MM-DD) del lunes de la semana a la que pertenece un día.
 *
 * Se usa UTC a propósito y no la fecha local: las claves de los trades vienen
 * en UTC y mezclarlas con el huso del navegador movería los días de una semana
 * al bordering incorrecto.
 */
function lunesDe(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo ... 6 = sábado
  const retroceder = (dow + 6) % 7; // lunes = 0, domingo = 6
  d.setUTCDate(d.getUTCDate() - retroceder);
  return d.toISOString().slice(0, 10);
}

function computeStats(items: StatInput[]) {
  const sorted = [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
  const dailyEntries = Object.entries(dailyMap).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  let cum = 0;
  const cumSeries = dailyEntries.map(([d, v]) => {
    cum += v;
    return { date: d, cum, pnl: v, count: dailyCountMap[d] || 0 };
  });

  /* El resumen semanal se calcula aparte, en el componente, porque depende del
     mes que se está viendo en el calendario. Aquí solo va lo que es
     independiente del mes. */

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
  const consistency = mean ? Math.max(0, Math.min(100, 100 - (stdev / Math.abs(mean)) * 20)) : 50;
  const recovery = maxDD ? Math.max(0, Math.min(100, (netPnl / maxDD) * 15)) : netPnl > 0 ? 100 : 0;
  const ddScore = netPnl !== 0 ? Math.max(0, Math.min(100, 100 - (maxDD / Math.abs(netPnl || 1)) * 40)) : 50;
  const wlRatio = avgLoss ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? 5 : 0;

  const radar = {
    winRate: Math.min(100, winRate),
    profitFactor: Math.min(100, profitFactor * 33),
    wlRatio: Math.min(100, wlRatio * 30),
    recovery,
    ddScore,
    consistency,
  };
  const score = (radar.winRate + radar.profitFactor + radar.wlRatio + radar.recovery + radar.ddScore + radar.consistency) / 6;

  return { total, wins, losses, netPnl, winRate, avgWin, avgLoss, profitFactor, dailyEntries, cumSeries, radar, score };
}

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
  // true cuando el usuario navega el calendario a mano; entonces ya no se
  // auto-ajusta al mes de los datos.
  const calNavManual = useRef(false);

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
            y: { grid: { color: "rgba(255,255,255,.09)" }, ticks: { callback: (v) => "$" + v, font: { size: 10 } } },
          },
        },
        plugins: [pnlGlowPlugin, pnlWavePlugin],
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
    chart.update();
    // locale entra en las dependencias porque el tooltip se reconstruye al
    // cambiar de idioma ("23 de ene, 2026" <-> "Jan 23, 2026").
  }, [s, locale]);

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
    chart.data.datasets[0].data = [s.radar.winRate, s.radar.profitFactor, s.radar.wlRatio, s.radar.recovery, s.radar.ddScore, s.radar.consistency].map((v) => Math.round(v));
    // locale: las etiquetas del radar se fijan al crear el chart, así que hay
    // que reconstruirlas al cambiar de idioma.
    chart.data.labels = [
      t("radar.winRate"), t("radar.profitFactor"), t("radar.wlRatio"),
      t("radar.recovery"), t("radar.maxDrawdown"), t("radar.consistency"),
    ];
    chart.update();
  }, [s, locale]);

  function navigateCalendar(delta: number) {
    if (calYear === null || calMonth === null) return;
    calNavManual.current = true;
    let y = calYear;
    let m = calMonth + delta;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCalYear(y);
    setCalMonth(m);
  }
  function goToday() {
    // "Este mes" devuelve el control al calendario: vuelve a seguir a los datos.
    calNavManual.current = false;
    if (s.dailyEntries.length) {
      const d = new Date(`${s.dailyEntries[s.dailyEntries.length - 1][0]}T00:00:00Z`);
      setCalYear(d.getUTCFullYear());
      setCalMonth(d.getUTCMonth());
    } else {
      const now = new Date();
      setCalYear(now.getFullYear());
      setCalMonth(now.getMonth());
    }
  }

  const balance = initialBalance != null && isFinite(initialBalance) ? initialBalance + s.netPnl : s.netPnl;
  const balancePositive = initialBalance != null && isFinite(initialBalance) ? balance >= initialBalance : s.netPnl >= 0;
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
   * Semanas del mes visible, de lunes a domingo, numeradas 1, 2, 3... dentro
   * de cada mes.
   *
   * REGLA: una semana pertenece al mes donde cae SU JUEVES. Equivale a decir
   * "el mes que tiene más días de esa semana": el jueves es el cuarto día de
   * una semana de siete, así que si el jueves está en un mes, ese mes tiene
   * al menos 4 de los 7 días.
   *
   * Por qué el jueves y no el lunes ni el domingo:
   *   - La semana del 26 ene-1 feb tiene 6 días de enero y 1 de febrero, así
   *     que es de ENERO. If fuera por el lunes también.
   *   - La semana del 30 mar-5 abr tiene 2 días de marzo y 5 de abril, así que
   *     es de ABRIL. Por el lunes sería de marzo y por el domingo también.
   * Con el jueves las dos salen bien, y no hay que inventar excepciones.
   *
   * Comprobado con enero de 2026, que empieza en jueves:
   *   S1  29 dic - 4 ene     S2  5-11 ene     S3  12-18 ene
   *   S4  19-25 ene         S5  26 ene - 1 feb
   * y febrero empieza de nuevo:
   *   S1  2-8 feb    S2  9-15 feb    S3  16-22 feb    S4  23 feb - 1 mar
   *
   * La etiqueta SIEMPRE muestra las fechas reales de la semana, sin recortar.
   * Recortar era lo que confundía: en enero, la semana del 29 dic al 4 ene se
   * veía como "1-4 ene" y parecía que el sistema se había inventado una
   * semana de cuatro días.
   */
  const semanas = useMemo(() => {
    if (calYear === null || calMonth === null) return [];

    const prefijo = `${calYear}-${pad(calMonth + 1)}`;
    const primeroISO = `${prefijo}-01`;
    const ultimoDia = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    const ultimoISO = `${prefijo}-${pad(ultimoDia)}`;

    // Primera semana cuyo jueves cae dentro del mes. Como mucho hay que
    // avanzar una semana: el jueves de la semana que contiene el día 1 está
    // como mucho 3 días antes de él.
    let lunes = lunesDe(primeroISO);
    while (addDias(lunes, 3) < primeroISO) {
      lunes = addDias(lunes, 7);
    }

    const salida: {
      n: number; lunes: string; domingo: string; suma: number; dias: number;
    }[] = [];

    let n = 1;
    for (;;) {
      const jueves = addDias(lunes, 3);
      if (jueves > ultimoISO) break;

      const domingo = addDias(lunes, 6);

      let suma = 0;
      let dias = 0;
      for (let iso = lunes; iso <= domingo; iso = addDias(iso, 1)) {
        const v = dailyMap[iso];
        if (v !== undefined) {
          suma += v;
          dias += 1;
        }
      }

      salida.push({ n, lunes, domingo, suma, dias });

      lunes = addDias(lunes, 7);
      n += 1;
    }

    return salida;
  }, [calYear, calMonth, dailyMap]);

  const calendarCells = useMemo(() => {
    if (calYear === null || calMonth === null) return [];
    const startOffset = new Date(Date.UTC(calYear, calMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const cells: { dayNum: number; key: string; v: number | undefined; other: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        cells.push({ dayNum: 0, key: "", v: undefined, other: true });
        continue;
      }
      const key = `${calYear}-${pad(calMonth + 1)}-${pad(dayNum)}`;
      cells.push({ dayNum, key, v: dailyMap[key], other: false });
    }
    return cells;
  }, [calYear, calMonth, dailyMap]);

  return (
    <>
      <div className="stats">
        <div className="card">
          <div className="label">{t("kpi.balance")}</div>
          <div className={`value num ${balancePositive ? "pos" : "neg"}`}>{fmtMoneyFull(animBalance)}</div>
        </div>
        <div className="card">
          <div className="label">{t("kpi.netPnl")}</div>
          <div className={`value num ${s.netPnl >= 0 ? "pos" : "neg"}`}>{fmtMoneyFull(animNetPnl)}</div>
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
          <div className={`value num ${expectedValue >= 0 ? "pos" : "neg"}`}>{fmtMoneyFull(animExpectedValue)}</div>
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

        <div className="panel">
          <div className="cal-nav">
            <span className="cal-arrow" style={{ cursor: "pointer", padding: "2px 8px" }} onClick={() => navigateCalendar(-1)}>‹</span>
            <span className="cal-month">{monthLabel}</span><span className="cal-arrow" style={{ cursor: "pointer", padding: "2px 8px" }} onClick={() => navigateCalendar(1)}>›</span>
            <span className="pill" style={{ padding: "3px 9px", cursor: "pointer" }} onClick={goToday}>{t("common.thisMonth")}</span>
          </div>
          <div className="cal">
            {dowNames.map((d) => (
              <div className="dow" key={d}>{d}</div>
            ))}
            {calendarCells.map((c, i) =>
              c.other ? (
                <div className="day" style={{ opacity: 0.35 }} key={i} />
              ) : (
                <div className={`day${c.v !== undefined ? (c.v > 0 ? " win" : c.v < 0 ? " loss" : "") : ""}`} key={i}>
                  <div className="d">{c.dayNum}</div>
                  {c.v !== undefined && <div className="p">{c.v > 0 ? "+" : ""}{fmtMoney(c.v)}</div>}
                </div>
              )
            )}
          </div>
        </div>

        <div className="panel">
          <h2>{t("weekly.title")}</h2>
          <div className="weeklist">
            {semanas.length === 0 && <p className="mini-note">{t("weekly.empty")}</p>}
            {semanas.map((w) => {
              const sinOperaciones = w.dias === 0;
              const color = w.suma > 0 ? "var(--green)" : w.suma < 0 ? "var(--red)" : "var(--muted)";
              return (
                <div className={`wk${sinOperaciones ? " vacia" : ""}`} key={w.lunes}>
                  <span className="l">
                    {t("weekly.week", { n: w.n })}
                    <span className="wk-range">{rangoSemana(w.lunes, w.domingo)}</span>
                  </span>
                  <span className="r">
                    {sinOperaciones ? (
                      <i className="wk-sin">{t("weekly.noTrades")}</i>
                    ) : (
                      <>
                        <b style={{ color }}>{fmtMoney(w.suma)}</b>
                        {t("weekly.dayCount", { n: w.dias })}
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
