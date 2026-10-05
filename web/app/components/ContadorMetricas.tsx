"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";

/**
 * LOS 8 INDICADORES DE LA TARJETA "METRICS", CON LOS NUMEROS VIVOS.
 *
 * POR QUE EXISTE Y NO UN VIDEO, QUE ES LO QUE HACE LA COMPETENCIA:
 * un video de esta animacion pesa 5,57 MB y lleva el texto horneado en pixeles,
 * asi que no se podria traducir. Aqui los nombres y las cifras son texto de
 * verdad: se traducen, se leen con lector de pantalla, respetan
 * prefers-reduced-motion y pesan cero.
 *
 * LOS VALORES SON FIJOS, Y ES A PROPOSITO. Son los del reporte de MT5 de
 * ejemplo que hay en sample_data: 152 operaciones, winrate 71,71%. No se
 * consultan en caliente porque una landing no tiene de donde consultarlos, y no
 * hace falta: lo que se muestra es un ejemplo, no la cuenta de nadie. Si
 * cambia el reporte de ejemplo, se cambia en METRICAS y ya.
 *
 * LA TARJETA USA LAS MISMAS CLASES QUE EL DASHBOARD (.card, .label, .value,
 * .bar-split, .mini-note), que estan en dashboard.css. No se reimplementa el
 * estilo: se reaprovecha, y por eso sale identica al panel real.
 */

type Clase = "dinero" | "decimal" | "entero" | "fijo";

interface Metrica {
  clase: Clase;
  desde: number;
  hasta: number;
  signo?: string;
}

const METRICAS: Metrica[] = [
  // El balance cuenta desde el saldo inicial de la cuenta (10.000) y no desde
  // cero: asi se ve una cuenta creciendo en vez de un numero de la nada.
  { clase: "dinero", desde: 10000, hasta: 11308.95 },
  { clase: "dinero", desde: 0, hasta: 1308.95 },
  { clase: "decimal", desde: 0, hasta: 71.71, signo: "%" },
  { clase: "decimal", desde: 0, hasta: 1.28 },
  { clase: "decimal", desde: 0, hasta: 3.24 },
  { clase: "entero", desde: 0, hasta: 152 },
  { clase: "dinero", desde: 0, hasta: 8.61 },
  // La duracion media son dos unidades (minutos y segundos), no un numero que se
  // pueda interpolar, asi que no cuenta.
  { clase: "fijo", desde: 0, hasta: 0 },
];

/** La duracion media, que se escribe tal cual y no se anima. */
const DURACION_MEDIA = "49m 33s";

/** Cuanto tarda cada numero, y el retardo entre uno y el siguiente. */
const DURACION = 900;
const ESCALON = 150;

/**
 * Formato de dinero IDENTICO al del dashboard.
 *
 * El dashboard usa en-US en las tres partes de la app (SummaryView, AnalyticsView
 * y la tabla de trades): $11,308.95, con coma de miles y punto decimal. Aqui se
 * uso es-ES al principio y salia $11.308,95, que es distinto de lo que ve
 * cualquiera que use el producto. El separador de miles de la cuenta NO depende
 * del idioma de la interfaz, y asi esta en el codigo existente.
 */
function fmtDinero(n: number): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** easeOutCubic: arranca rapido y frena. Es lo que hace que un numero parezca
 *  contar en vez de deslizarse. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default function ContadorMetricas() {
  const { t } = useI18n();

  // Arranca en el valor FINAL: sin raton encima la tarjeta tiene que leerse
  // bien, que es lo que se ve el 99% del tiempo.
  const [valores, setValores] = useState<number[]>(METRICAS.map((m) => m.hasta));
  const [barra, setBarra] = useState(71.71);

  // Los timeouts y los=requestAnimationFrame pendientes, para cancelarlos si el
  // raton sale antes de que la cascada termine. Sin esto, al pasar y quitar el
  // raton deprisa se quedan cuentas corriendo y los numeros se desincronizan.
  const pendientes = useRef<number[]>([]);

  useEffect(() => {
    const ids = pendientes.current;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  function formatea(i: number, v: number): string {
    const m = METRICAS[i];
    if (m.clase === "fijo") return DURACION_MEDIA;
    if (m.clase === "dinero") return fmtDinero(v);
    if (m.clase === "entero") return String(Math.round(v));
    return v.toFixed(2) + (m.signo ?? "");
  }

  function arrancar() {
    pendientes.current.forEach((id) => window.clearTimeout(id));
    pendientes.current = [];
    setValores(METRICAS.map(() => 0));
    setBarra(0);

    METRICAS.forEach((m, i) => {
      if (m.clase === "fijo") return;

      pendientes.current.push(
        window.setTimeout(() => {
          const arranque = performance.now();
          const tik = () => {
            const t = Math.min(1, (performance.now() - arranque) / DURACION);
            const v = m.desde + (m.hasta - m.desde) * ease(t);
            setValores((prev) => {
              const copia = [...prev];
              copia[i] = v;
              return copia;
            });
            if (t < 1) requestAnimationFrame(tik);
          };
          requestAnimationFrame(tik);
        }, i * ESCALON),
      );
    });

    // La barra se llena un poco despues que su cifra, que es lo que hace el
    // dashboard: no salen a la vez el numero y su barra.
    pendientes.current.push(
      window.setTimeout(() => {
        const arranque = performance.now();
        const tik = () => {
          const t = Math.min(1, (performance.now() - arranque) / DURACION);
          setBarra(ease(t) * 71.71);
          if (t < 1) requestAnimationFrame(tik);
        };
        requestAnimationFrame(tik);
      }, 2 * ESCALON + 120),
    );
  }

  function detener() {
    pendientes.current.forEach((id) => window.clearTimeout(id));
    pendientes.current = [];
    setValores(METRICAS.map((m) => m.hasta));
    setBarra(71.71);
  }

  return (
    // data-testid: sirve para apuntar a este panel con las herramientas del
    // navegador y comprobar la cascada, que si no no se puede medir.
    <div
      className="landing-stats"
      data-testid="contador-metricas"
      onMouseEnter={arrancar}
      onMouseLeave={detener}
    >
      <div className="stats">
        <div className="stats-caption">
          <span className="stats-caption-title">{t("kpi.allTimeTitle")}</span>
          <span className="stats-caption-note">{t("kpi.allTimeNote")}</span>
        </div>

        <div className="landing-kpis">
          <div className="card">
            <div className="label">{t("kpi.balance")}</div>
            <div className="value num pos">{formatea(0, valores[0])}</div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.netPnl")}</div>
            <div className="value num pos">{formatea(1, valores[1])}</div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.winrate")}</div>
            <div className="value num">{formatea(2, valores[2])}</div>
            <div className="bar-split">
              <div className="bar-fill" style={{ width: `${barra}%` }} />
            </div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.riskReward")}</div>
            <div className="value num">{formatea(3, valores[3])}</div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.profitFactor")}</div>
            <div className="value num">{formatea(4, valores[4])}</div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.totalTrades")}</div>
            <div className="value num">{formatea(5, valores[5])}</div>
            <div className="mini-note">
              <span style={{ color: "var(--green)" }}>{t("kpi.tradesWon", { n: 109 })}</span>
              {" · "}
              <span style={{ color: "var(--red)" }}>{t("kpi.tradesLost", { n: 43 })}</span>
            </div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.expectedValue")}</div>
            <div className="value num pos">{formatea(6, valores[6])}</div>
          </div>

          <div className="card">
            <div className="label">{t("kpi.avgTradeTime")}</div>
            <div className="value num">{formatea(7, valores[7])}</div>
          </div>
        </div>
      </div>
    </div>
  );
}