"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartTypeRegistry, TooltipItem } from "chart.js";
import { CfSelect } from "./CfControls";
import { useI18n } from "../../lib/i18n/LocaleProvider";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/* Mismos valores que leía el HTML original de sus variables CSS:
   muted = --muted (#8E93A6) y line = --line (rgba(255,255,255,.09)). */
const MUTED = "#8E93A6";
const LINE = "rgba(255,255,255,.09)";

export type AnalyticsTrade = {
  symbol: string;
  pnl_neto: number | null;
  pnl_bruto: number;
  commission: number;
  swap: number;
  taxes: number;
};

type SymbolPerf = {
  symbol: string;
  count: number;
  pnl: number;
  winrate: number;
};

function computeSymbolPerf(trades: AnalyticsTrade[]): SymbolPerf[] {
  const bySymbol: Record<string, { count: number; wins: number; pnl: number }> = {};
  trades.forEach((t) => {
    const sym = t.symbol || "—";
    if (!bySymbol[sym]) bySymbol[sym] = { count: 0, wins: 0, pnl: 0 };
    bySymbol[sym].count++;
    const pnl = t.pnl_neto !== null && t.pnl_neto !== undefined ? t.pnl_neto : t.pnl_bruto + t.commission + t.swap + (t.taxes ?? 0);
    if (pnl > 0) bySymbol[sym].wins++;
    bySymbol[sym].pnl += pnl;
  });
  return Object.entries(bySymbol).map(([symbol, s]) => ({
    symbol,
    count: s.count,
    pnl: Math.round(s.pnl * 100) / 100,
    winrate: s.count ? Math.round((s.wins / s.count) * 1000) / 10 : 0,
  }));
}

type MetricKey = "pnl" | "winrate" | "count";

function fmtMoney(v: number) {
  const sign = v < 0 ? "-" : "";
  return sign + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Solo el formato numérico: los rótulos visibles salen del diccionario de
   idioma (analytics.metric.*), no de aquí. Antesvivían aquí en inglés fijo y
   se veían traducidos en un sitio y no en otro. */
const METRIC_META: Record<MetricKey, { format: (v: number) => string }> = {
  pnl: { format: (v) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  winrate: { format: (v) => v.toFixed(1) + "%" },
  count: { format: (v) => String(v) },
};

function setSymbolCard(
  prefix: string,
  row: { symbol: string; value: number } | null
) {
  const badge = document.getElementById(prefix + "Badge");
  const symEl = document.getElementById(prefix + "Symbol");
  const valEl = document.getElementById(prefix + "Value");
  if (!badge || !symEl || !valEl) return;
  if (!row) {
    badge.textContent = "—";
    symEl.textContent = "—";
    valEl.textContent = "—";
    valEl.classList.remove("pos", "neg");
    return;
  }
  badge.textContent = row.symbol.slice(0, 2).toUpperCase();
  symEl.textContent = row.symbol;
  valEl.textContent = fmtMoney(row.value);
  valEl.classList.remove("pos", "neg");
  valEl.classList.add(row.value >= 0 ? "pos" : "neg");
}

export default function AnalyticsView({ trades }: { trades: AnalyticsTrade[] }) {
  const { t, locale } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [metric, setMetric] = useState<MetricKey>("winrate");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => computeSymbolPerf(trades), [trades]);

  const sortedRows = useMemo(() => {
    const r = [...rows];
    r.sort((a, b) => (order === "asc" ? a[metric] - b[metric] : b[metric] - a[metric]));
    return r;
  }, [rows, metric, order]);

  const metricMeta = METRIC_META[metric];

  const barColors = metric === "pnl"
    ? sortedRows.map((r) => (r.pnl >= 0 ? "#2FD8C8" : "#FF4D6D"))
    : sortedRows.map(() => "#2FD8C8");

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 6, maxBarThickness: 56 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 900, easing: "easeOutQuart" },
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
              callbacks: { label: (ctx) => metricMeta.format(ctx.raw as number) },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11, family: "'IBM Plex Mono', monospace" }, color: MUTED } },
            y: { grid: { color: LINE }, ticks: { font: { size: 10 }, color: MUTED } },
          },
        },
      });
    }
    const chart = chartRef.current;
    chart.data.labels = sortedRows.map((r) => r.symbol);
    chart.data.datasets[0].data = sortedRows.map((r) => r[metric]);
    chart.data.datasets[0].backgroundColor = barColors;
    chart.options.plugins!.tooltip!.callbacks = {
      ...chart.options.plugins!.tooltip!.callbacks,
      label: (ctx: TooltipItem<keyof ChartTypeRegistry>) => metricMeta.format(ctx.raw as number),
    };
    chart.update();
  }, [sortedRows, metric, order, metricMeta, barColors]);

  // Update symbol cards
  useEffect(() => {
    const numEl = document.getElementById("acNumSymbols");
    if (numEl) numEl.textContent = String(rows.length);

    if (!rows.length) {
      setSymbolCard("acBestSum", null);
      setSymbolCard("acWorstSum", null);
      setSymbolCard("acBestAvg", null);
      setSymbolCard("acWorstAvg", null);
      return;
    }

    const bySum = [...rows].sort((a, b) => b.pnl - a.pnl);
    const withAvg = rows.map((r) => ({ ...r, avg: r.count ? r.pnl / r.count : 0 }));
    const byAvg = [...withAvg].sort((a, b) => b.avg - a.avg);

    setSymbolCard("acBestSum", { symbol: bySum[0].symbol, value: bySum[0].pnl });
    setSymbolCard("acWorstSum", { symbol: bySum[bySum.length - 1].symbol, value: bySum[bySum.length - 1].pnl });
    setSymbolCard("acBestAvg", { symbol: byAvg[0].symbol, value: byAvg[0].avg });
    setSymbolCard("acWorstAvg", { symbol: byAvg[byAvg.length - 1].symbol, value: byAvg[byAvg.length - 1].avg });
  }, [rows]);

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t("analytics.symbolPerformance")}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CfSelect
            value={metric}
            onChange={(v) => setMetric(v as MetricKey)}
            /* min-width:140px como en el HTML original (#anMetricSelect) */
            style={{ minWidth: 140 }}
            options={[
              { value: "pnl", label: t("analytics.metric.pnl") },
              { value: "winrate", label: t("analytics.metric.winrate") },
              { value: "count", label: t("analytics.metric.count") },
            ]}
          />
          <CfSelect
            value={order}
            onChange={(v) => setOrder(v as "asc" | "desc")}
            /* min-width:140px como en el HTML original (#anOrderSelect) */
            style={{ minWidth: 140 }}
            options={[
              { value: "asc", label: t("analytics.order.asc") },
              { value: "desc", label: t("analytics.order.desc") },
            ]}
          />
        </div>
      </div>

      <div style={{ position: "relative", height: 340 }}>
        <canvas ref={canvasRef} />
      </div>

      {rows.length === 0 && (
        <p className="mini-note" style={{ display: "block", marginTop: 14 }}>
          {t("analytics.empty")}
        </p>
      )}

      <div className="stats an-stats">
        <div className="card">
          <div className="label">
            {t("analytics.bestSum")}{" "}
            <span title={t("analytics.bestSumHelp")}>ⓘ</span>
          </div>
          <div className="an-symbol-row">
            <div className="an-symbol-badge" id="acBestSumBadge">—</div>
            <div className="an-symbol-name" id="acBestSumSymbol">—</div>
          </div>
          <div className="value num" id="acBestSumValue">—</div>
        </div>
        <div className="card">
          <div className="label">
            {t("analytics.worstSum")}{" "}
            <span title={t("analytics.worstSumHelp")}>ⓘ</span>
          </div>
          <div className="an-symbol-row">
            <div className="an-symbol-badge" id="acWorstSumBadge">—</div>
            <div className="an-symbol-name" id="acWorstSumSymbol">—</div>
          </div>
          <div className="value num" id="acWorstSumValue">—</div>
        </div>
        <div className="card">
          <div className="label">
            {t("analytics.bestAvg")}{" "}
            <span title={t("analytics.bestAvgHelp")}>ⓘ</span>
          </div>
          <div className="an-symbol-row">
            <div className="an-symbol-badge" id="acBestAvgBadge">—</div>
            <div className="an-symbol-name" id="acBestAvgSymbol">—</div>
          </div>
          <div className="value num" id="acBestAvgValue">—</div>
        </div>
        <div className="card">
          <div className="label">
            {t("analytics.worstAvg")}{" "}
            <span title={t("analytics.worstAvgHelp")}>ⓘ</span>
          </div>
          <div className="an-symbol-row">
            <div className="an-symbol-badge" id="acWorstAvgBadge">—</div>
            <div className="an-symbol-name" id="acWorstAvgSymbol">—</div>
          </div>
          <div className="value num" id="acWorstAvgValue">—</div>
        </div>
        <div className="card">
          <div className="label">
            {t("analytics.numSymbols")}{" "}
            <span title={t("analytics.numSymbolsHelp")}>ⓘ</span>
          </div>
          <div className="value pos num" id="acNumSymbols">0</div>
        </div>
      </div>
    </div>
  );
}
