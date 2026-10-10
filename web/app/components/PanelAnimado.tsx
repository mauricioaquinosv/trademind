"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import type { TranslationKey } from "../../lib/i18n/config";

/**
 * EL PANEL DE INDICADORES ENTERO, EN HTML.
 *
 * POR QUE ESTO Y NO UN PNG
 *
 * Un PNG no se puede animar: sus pixeles son fijos. Este panel es una imagen en
 * HTML, hecha con el MISMO codigo y el MISMOS estilos que el panel del
 * dashboard (.stats, .card, .label, .value, .bar-split, .mini-note), asi que se
 * ve identica. Y al ser una imagen, se anima entera: los numeros, la barra y
 * las entradas.
 *
 * El recorte y la inclinacion los pone el contenedor de la landing, igual que en
 * las otras tres tarjetas. Aqui no se decide nada: la tarjeta se recorta sola.
 *
 * QUE SE ANIMA
 *
 *   Las ocho cifras, en cascada, al pasar el raton. El balance cuenta desde
 *   10.000, que es el saldo inicial real de la cuenta.
 *   La barra del winrate se llena un poco despues que su cifra.
 *   Las ocho cajas entran en cascada al aparecer.
 *
 * LOS VALORES
 *
 * Son los del reporte de MT5 de ejemplo de sample_data: 152 operaciones,
 * 109 ganadas y 43 perdidas. Congelados aqui a proposito. Una landing no tiene de
 * donde consultarlos, y lo que se muestra es un ejemplo, no la cuenta de nadie.
 */

interface Metrica {
  clase: "dinero" | "decimal" | "entero" | "fijo";
  desde: number;
  hasta: number;
  signo?: string;
  /** La etiqueta sale del diccionario: este panel estaba en español fijo y la
   *  landing en ingles seguia enseñando "Balance" y "Winrate" en castellano. */
  etiqueta: TranslationKey;
}

const METRICAS: Metrica[] = [
  // El balance cuenta desde el saldo inicial, para que se vea una cuenta
  // creciendo y no un numero que aparece de la nada.
  { clase: "dinero", desde: 10000, hasta: 11308.95, etiqueta: "kpi.balance" },
  { clase: "dinero", desde: 0, hasta: 1308.95, etiqueta: "kpi.netPnl" },
  { clase: "decimal", desde: 0, hasta: 71.71, signo: "%", etiqueta: "kpi.winrate" },
  { clase: "decimal", desde: 0, hasta: 1.28, etiqueta: "kpi.riskReward" },
  { clase: "decimal", desde: 0, hasta: 3.24, etiqueta: "kpi.profitFactor" },
  { clase: "entero", desde: 0, hasta: 152, etiqueta: "kpi.totalTrades" },
  { clase: "dinero", desde: 0, hasta: 8.61, etiqueta: "kpi.expectedValue" },
  { clase: "fijo", desde: 0, hasta: 0, etiqueta: "kpi.avgTradeTime" },
];

const DURACION_MEDIA = "49m 33s";
const GANADAS = 109;
const PERDIDAS = 43;
const WINRATE = 71.71;

const DURACION = 900;
const ESCALON = 140;

/** En-US con coma de miles y punto decimal, igual que el dashboard. */
function fmtDinero(n: number): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** easeOutCubic: arranca rapido y frena, como un contador real. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default function PanelAnimado() {
  const { t } = useI18n();
  const [valores, setValores] = useState<number[]>(METRICAS.map((m) => m.hasta));
  const [barra, setBarra] = useState(WINRATE);

  // Los timeouts pendientes se cancelan al salir el raton, para que al pasar y
  // quitar el raton deprisa no queden cuentas corriendo desincronizadas.
  const pendientes = useRef<number[]>([]);

  useEffect(() => {
    const ids = pendientes.current;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  function fmt(i: number, v: number): string {
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
          const t0 = performance.now();
          const tik = () => {
            const t = Math.min(1, (performance.now() - t0) / DURACION);
            setValores((prev) => {
              const copia = [...prev];
              copia[i] = m.desde + (m.hasta - m.desde) * ease(t);
              return copia;
            });
            if (t < 1) requestAnimationFrame(tik);
          };
          requestAnimationFrame(tik);
        }, i * ESCALON),
      );
    });

    // La barra se llena un poco despues que su cifra, como en el dashboard.
    pendientes.current.push(
      window.setTimeout(() => {
        const t0 = performance.now();
        const tik = () => {
          const t = Math.min(1, (performance.now() - t0) / DURACION);
          setBarra(ease(t) * WINRATE);
          if (t < 1) requestAnimationFrame(tik);
        };
        requestAnimationFrame(tik);
      }, 2 * ESCALON + 100),
    );
  }

  function detener() {
    pendientes.current.forEach((id) => window.clearTimeout(id));
    pendientes.current = [];
    setValores(METRICAS.map((m) => m.hasta));
    setBarra(WINRATE);
  }

  return (
    // El tamano lo fija el contenedor de la landing, que es quien aplica el
    // recorte y el inclinacion. Aqui solo esta el panel.
    <div className="panel-vivo" onMouseEnter={arrancar} onMouseLeave={detener}>
      <div className="stats">
        <div className="stats-caption">
          <span className="stats-caption-title">{t("kpi.allTimeTitle")}</span>
          <span className="stats-caption-note">{t("kpi.allTimeNote")}</span>
        </div>

        <div className="card">
          <div className="label">{t("kpi.balance")}</div>
          <div className="value num pos">{fmt(0, valores[0])}</div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.netPnl")}</div>
          <div className="value num pos">{fmt(1, valores[1])}</div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.winrate")}</div>
          <div className="value num">{fmt(2, valores[2])}</div>
          <div className="bar-split">
            <div className="bar-fill" style={{ width: `${barra}%` }} />
          </div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.riskReward")}</div>
          <div className="value num">{fmt(3, valores[3])}</div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.profitFactor")}</div>
          <div className="value num">{fmt(4, valores[4])}</div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.totalTrades")}</div>
          <div className="value num">{fmt(5, valores[5])}</div>
          <div className="mini-note">
            <span style={{ color: "var(--green)" }}>{t("kpi.tradesWon", { n: GANADAS })}</span>
            {" · "}
            <span style={{ color: "var(--red)" }}>{t("kpi.tradesLost", { n: PERDIDAS })}</span>
          </div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.expectedValue")}</div>
          <div className="value num pos">{fmt(6, valores[6])}</div>
        </div>

        <div className="card">
          <div className="label">{t("kpi.avgTradeTime")}</div>
          <div className="value num">{fmt(7, valores[7])}</div>
        </div>
      </div>
    </div>
  );
}