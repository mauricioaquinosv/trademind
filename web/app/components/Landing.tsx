"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import type { TranslationKey } from "../../lib/i18n/config";
import {
  GRAFICO,
  PUNTAJE,
  calendario,
  cifras,
  curva,
  dinero,
  radar,
} from "../../lib/landing/datos";
import { iniciarEfectos } from "./landingFx";

/**
 * LANDING PUBLICA.
 *
 * Es el diseno final (con sus animaciones) llevado a codigo. Las cifras del
 * panel de ejemplo salen de lib/landing/datos.ts, que tiene sus tests; los
 * textos, de los diccionarios ES/EN.
 *
 * Es un componente de cliente porque el selector de idioma y las animaciones
 * lo necesitan, pero se pinta tambien en el servidor: el idioma llega de la
 * cookie por LocaleProvider, asi que la primera pintura ya sale bien.
 *
 * REGLA DE CONTENIDO: solo se afirma lo que TradeMind hace HOY. No hay
 * testimonios (no hay usuarios) ni cifras de mercado inventadas. Las cifras del
 * panel son de ejemplo y se dice en la propia pagina.
 *
 * NOTA DE ESTRUCTURA: las animaciones y el CSS buscan elementos por su lugar en
 * el arbol (.hero.wrap > div > div:first-child, #producto .wrap > div:nth-child(5)...).
 * No se cambie el orden de los bloques sin cambiar landingFx.ts y landing.css.
 */

// Todo esto es puro y no cambia: se calcula una vez.
const CAL = calendario();
const CURVA = curva();
const CIFRAS = cifras();
const RADAR = radar();

const FUENTES =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..700&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Grotesk:wght@400..700&display=swap";

const GLOWS: { top: number; left?: number | string; right?: number | string; w: number; color: string }[] = [
  { top: -280, left: -260, w: 1000, color: "rgba(226,47,160,.26)" },
  { top: -320, right: -280, w: 1050, color: "rgba(47,216,200,.22)" },
  { top: 1500, left: "30%", w: 1100, color: "rgba(120,60,220,.17)" },
  { top: 2800, right: -320, w: 1000, color: "rgba(47,216,200,.12)" },
  { top: 3900, left: -320, w: 1000, color: "rgba(226,47,160,.15)" },
  { top: 4900, right: "8%", w: 1100, color: "rgba(120,60,220,.2)" },
];

const METODOS = [
  { name: "landing.import.m1.name", body: "landing.import.m1.body", dot: "#2FD8C8" },
  { name: "landing.import.m2.name", body: "landing.import.m2.body", dot: "#E22FA0" },
  { name: "landing.import.m3.name", body: "landing.import.m3.body", dot: "#9A6BFF" },
  { name: "landing.import.m4.name", body: "landing.import.m4.body", dot: "#2FD8B8" },
] as const satisfies readonly { name: TranslationKey; body: TranslationKey; dot: string }[];

const PROBLEMAS = ["p1", "p2", "p3"] as const;
const PREGUNTAS = ["1", "2", "3", "4", "5", "6"] as const;

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5l3.2 3L13 4.8" stroke="#2FD8C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** El logo. Se exporta para que el login use el MISMO y no otro parecido: dos
 *  logos distintos en dos pantallas del mismo producto se notan. */
export const Logo = ({ size, relleno }: { size: number; relleno?: boolean }) => (
  <svg viewBox="0 0 40 40" fill="none" width={size} height={size} aria-hidden="true">
    <path d="M20 4c-7 0-11 5-11 11 0 3 1 5 2 7-1 2-2 4-2 6 0 5 4 8 9 8V4z" fill="#E22FA0" />
    <path d="M20 4c7 0 11 5 11 11 0 3-1 5-2 7 1 2 2 4 2 6 0 5-4 8-9 8V4z" fill="#2FD8C8" />
    {!relleno && (
      <>
        <path d="M14 14l3 3-2 3 3 3-2 3" stroke="#05060B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M26 14l-3 3 2 3-3 3 2 3" stroke="#05060B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    )}
  </svg>
);

export default function Landing() {
  const { t, list, locale, setLocale } = useI18n();
  const raiz = useRef<HTMLDivElement>(null);

  // Las animaciones se montan despues de pintar y se desmontan al salir o al
  // cambiar de idioma (que vuelve a montar la landing entera, ver `key`).
  useEffect(() => {
    if (!raiz.current) return;
    return iniciarEfectos(raiz.current);
  }, [locale]);

  const meses = list("months.short");
  const mesLargo = list("months.full");
  const dias = list("dow.short");

  /** "2 feb" en español, "Feb 2" en inglés. */
  const fecha = (mes: number, dia: number) =>
    locale === "es" ? `${dia} ${(meses[mes] ?? "").toLowerCase()}` : `${meses[mes] ?? ""} ${dia}`;

  const botonIdioma = (code: "es" | "en") => {
    const activo = locale === code;
    return (
      <button
        type="button"
        onClick={() => setLocale(code)}
        aria-pressed={activo}
        className="mono"
        style={{
          border: 0,
          cursor: "pointer",
          padding: "5px 9px",
          borderRadius: 7,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: ".05em",
          background: activo ? "#2FD8C8" : "transparent",
          color: activo ? "#04211E" : "#A3A8BC",
        }}
      >
        {code.toUpperCase()}
      </button>
    );
  };

  const kpi = (clave: TranslationKey, valor: string, color: string, barra?: string) => (
    <div className="dcard">
      <div className="dlabel">{t(clave)}</div>
      <span className="dval dnum" style={{ color }}>{valor}</span>
      {barra && (
        <div className="dbar"><i style={{ width: barra }} /></div>
      )}
    </div>
  );

  const winrate = `${CIFRAS.winrate.toFixed(2)}%`;
  const VERDE = "#2FD8B8";
  const ROJO = "#FF4D6D";
  const mesFeb = (meses[1] ?? "").toLowerCase();
  const mesCorto = locale === "es" ? mesFeb : (meses[1] ?? "");
  const tituloMes = `${mesLargo[1] ?? ""}`;

  // ----- el radar (se usa dos veces: en el hero y en el bloque de producto) -----
  const radarSvg = (id: string) => (
    <svg viewBox="0 0 380 236" width="100%" style={{ display: "block", height: "auto" }} role="img" aria-label={t("landing.radar.aria")}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E22FA0" stopOpacity=".5" />
          <stop offset=".7" stopColor="#E22FA0" stopOpacity=".22" />
          <stop offset="1" stopColor="#E22FA0" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1">
        {RADAR.anillos.map((p, i) => (
          <polygon key={i} points={p} />
        ))}
        <path d={RADAR.ejes} />
      </g>
      <polygon points={RADAR.datos} fill={`url(#${id})`} stroke="#E22FA0" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={RADAR.puntos} fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
      <path d={RADAR.puntos} fill="none" stroke="#E22FA0" strokeWidth="6" strokeLinecap="round" />
      <g fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#8E93A6">
        {(
          [
            ["landing.radar.ax1", "middle"],
            ["landing.radar.ax2", "start"],
            ["landing.radar.ax3", "start"],
            ["landing.radar.ax4", "middle"],
            ["landing.radar.ax5", "end"],
            ["landing.radar.ax6", "end"],
          ] as const
        ).map(([clave, ancla], i) => (
          <text key={clave} x={RADAR.etiquetas[i].x} y={RADAR.etiquetas[i].y} textAnchor={ancla}>
            {t(clave)}
          </text>
        ))}
      </g>
    </svg>
  );

  return (
    <div className="lp" key={locale} ref={raiz}>
      {/* React 19 sube este <link> al <head>. */}
      <link rel="stylesheet" href={FUENTES} precedence="default" />

      <div id="top" style={{ position: "relative", overflowX: "clip", backgroundColor: "#05060B", minHeight: "100%" }}>
        {/* Brillos de fondo: turquesa y morado de la marca, repartidos a lo largo de la pagina */}
        {GLOWS.map((g, i) => (
          <div
            key={i}
            aria-hidden="true"
            style={{
              position: "absolute",
              top: g.top,
              left: g.left,
              right: g.right,
              width: g.w,
              height: g.w,
              borderRadius: "50%",
              background: `radial-gradient(circle,${g.color} 0%,rgba(0,0,0,0) 62%)`,
              pointerEvents: "none",
            }}
          />
        ))}
        {/* Papel cuadriculado de grafico, solo en la parte alta */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 980,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
            backgroundSize: "64px 64px",
            WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 0%,#000 25%,transparent 75%)",
            maskImage: "radial-gradient(ellipse 70% 80% at 50% 0%,#000 25%,transparent 75%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* ============ Navegacion ============ */}
          <nav
            style={{
              position: "sticky",
              top: 0,
              zIndex: 30,
              background: "rgba(5,6,11,.72)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, height: 68 }}>
              <a href="#top" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={30} />
                <span className="disp" style={{ fontSize: 21, fontWeight: 700 }}>TradeMind</span>
              </a>
              <div className="nav-links" style={{ display: "flex", gap: 30, fontSize: 14.5, color: "#A3A8BC" }}>
                <a className="nl" href="#producto">{t("landing.nav.product")}</a>
                <a className="nl" href="#importar">{t("landing.nav.import")}</a>
                <a className="nl" href="#preguntas">{t("landing.nav.faq")}</a>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  role="group"
                  aria-label="Idioma / Language"
                  style={{ display: "inline-flex", padding: 3, borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.03)" }}
                >
                  {botonIdioma("es")}
                  {botonIdioma("en")}
                </div>
                <Link className="btn btn-g nav-login" href="/login?modo=entrar">{t("landing.nav.login")}</Link>
                <Link className="btn btn-p" href="/login">{t("landing.nav.signup")}</Link>
              </div>
            </div>
          </nav>

          {/* ============ Hero ============ */}
          <div className="hero wrap" style={{ paddingTop: 84, paddingBottom: 96 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "64px 56px" }}>
              <div style={{ flex: "1 1 440px", minWidth: 0 }}>
                <span
                  className="mono"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 13px",
                    borderRadius: 999,
                    border: "1px solid rgba(47,216,200,.35)",
                    background: "rgba(47,216,200,.08)",
                    fontSize: 11.5,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "#7DF0DE",
                  }}
                >
                  <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#2FD8C8", boxShadow: "0 0 10px #2FD8C8" }} />
                  {t("landing.badge")}
                </span>
                <h1 className="disp" style={{ fontSize: "clamp(42px,6.2vw,80px)", lineHeight: 1, fontWeight: 700, margin: "24px 0 0" }}>
                  {t("landing.hero.title")}{" "}
                  <span className="uline" style={{ color: "#2FD8C8", boxShadow: "inset 0 -0.16em 0 rgba(226,47,160,.5)" }}>
                    {t("landing.hero.accent")}
                  </span>
                </h1>
                <p style={{ fontSize: 19, lineHeight: 1.6, color: "#A3A8BC", maxWidth: 520, margin: "26px 0 0" }}>{t("landing.hero.sub")}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 34 }}>
                  <Link className="btn btn-p btn-lg" href="/login">{t("landing.hero.cta")}</Link>
                  <a className="btn btn-g btn-lg" href="#como">{t("landing.hero.cta2")}</a>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 26px", marginTop: 34 }}>
                  <span className="tick"><Check />{t("landing.hero.trust1")}</span>
                  <span className="tick"><Check />{t("landing.hero.trust2")}</span>
                  <span className="tick"><Check />{t("landing.hero.trust3")}</span>
                </div>
              </div>

              {/* Replica del dashboard: barra lateral, cifras, curva de P&L y puntaje */}
              <div style={{ flex: "1.15 1 520px", minWidth: 0, position: "relative", paddingTop: 22, paddingBottom: 24 }}>
                <div className="lpanel" style={{ padding: 14, borderRadius: 24 }}>
                  <div className="dshell dx">
                    <div className="dnav">
                      <div className="dnb on">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                        </svg>
                        <span>{t("landing.tab.dashboard")}</span>
                      </div>
                      <div className="dnb">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" />
                        </svg>
                        <span>{t("nav.trades")}</span>
                      </div>
                      <div className="dnb">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 7a2 2 0 0 1 2-2h12v3" /><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="16.5" cy="13.5" r="1.2" />
                        </svg>
                        <span>{t("nav.accounts")}</span>
                      </div>
                      <div className="dnb">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 20V11M12 20V4M19 20v-6" />
                        </svg>
                        <span>{t("nav.analytics")}</span>
                      </div>
                    </div>
                    <div className="dmain">
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 10px" }}>
                        <span className="dcap-t">{t("landing.allTime.title")}</span>
                        <span className="dcap-n">{t("landing.allTime.note")}</span>
                      </div>
                      <div className="dstats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))" }}>
                        {kpi("landing.metric.balance", dinero(CIFRAS.balance), VERDE)}
                        {kpi("landing.metric.pnl", dinero(CIFRAS.pnl), VERDE)}
                        {kpi("landing.metric.winrate", winrate, "#F1F2F6", winrate)}
                        {kpi("landing.metric.pf", CIFRAS.profitFactor, "#F1F2F6")}
                      </div>
                      <div className="hrow">
                        <div className="dpanel">
                          <div className="dglow" style={{ width: "65%", height: 220, left: "-8%", top: -80, background: "radial-gradient(circle,rgba(47,216,200,.28),transparent 70%)" }} />
                          <div className="dglow" style={{ width: "45%", height: 190, right: "-8%", bottom: -80, background: "radial-gradient(circle,rgba(226,47,160,.18),transparent 70%)" }} />
                          <h2 className="dh2">
                            {t("landing.chart.title")}
                            <span>{tituloMes} 2026</span>
                          </h2>
                          <svg viewBox={`0 0 ${GRAFICO.ancho} ${GRAFICO.alto}`} width="100%" style={{ display: "block", height: "auto" }} role="img" aria-label={t("landing.chart.aria")}>
                            <defs>
                              <linearGradient id="gFillA" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#2FD8C8" stopOpacity=".45" />
                                <stop offset=".6" stopColor="#2FD8C8" stopOpacity=".10" />
                                <stop offset="1" stopColor="#2FD8C8" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <rect x={CURVA.bandaX} y={GRAFICO.arriba} width={CURVA.bandaAncho} height={GRAFICO.base - GRAFICO.arriba} fill="rgba(47,216,200,.07)" stroke="rgba(47,216,200,.30)" />
                            <g stroke="rgba(255,255,255,.09)" strokeWidth="1">
                              {[20, 48, 76, 104, 132, 160, 188, 216].map((y) => (
                                <line key={y} x1={GRAFICO.izq} y1={y} x2={GRAFICO.der} y2={y} />
                              ))}
                            </g>
                            <g fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#8E93A6" textAnchor="end">
                              {[1400, 1200, 1000, 800, 600, 400, 200, 0].map((v, i) => (
                                <text key={v} x="56" y={24 + i * 28}>{dinero(v).replace(".00", "")}</text>
                              ))}
                            </g>
                            <g fontFamily="IBM Plex Mono, monospace" fontSize="10.5" fill="#8E93A6" textAnchor="middle">
                              {CURVA.ticks.map((k, i) => (
                                <text key={i} x={k.x} y="238">{fecha(k.mes, k.dia)}</text>
                              ))}
                            </g>
                            <path d={CURVA.area} fill="url(#gFillA)" />
                            <path d={CURVA.linea} fill="none" stroke="#2FD8C8" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px rgba(47,216,200,.65))" }} />
                            <path d={CURVA.puntosPath} fill="none" stroke="#0a0c14" strokeWidth="7.4" strokeLinecap="round" />
                            <path d={CURVA.puntosPath} fill="none" stroke="#2FD8C8" strokeWidth="5.2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div className="dpanel" style={{ display: "flex", flexDirection: "column" }}>
                          <div className="dglow" style={{ width: "60%", height: 200, left: "-10%", top: -70, background: "radial-gradient(circle,rgba(226,47,160,.22),transparent 70%)" }} />
                          <h2 className="dh2">{t("landing.radar.panel")}</h2>
                          {radarSvg("gRad2")}
                          <span className="dscore dnum">{PUNTAJE.toFixed(2)}</span>
                          <div className="dsbar"><i style={{ left: `${PUNTAJE}%` }} /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="chip" style={{ position: "absolute", top: 0, right: 22 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: VERDE, boxShadow: `0 0 8px ${VERDE}` }} />
                  <span className="mono" style={{ color: "#F1F2F6" }}>{t("landing.tab.dashboard")}</span>
                </div>
                <div className="chip" style={{ position: "absolute", bottom: 0, left: 22 }}>
                  <span style={{ color: "#8E93A6" }}>{t("landing.chip.best")}</span>
                  <span className="mono" style={{ color: "#8CF3E3", fontWeight: 600 }}>{dinero(CAL.mejor.valor, true)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ============ Franja de importacion ============ */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.015)" }}>
            <div className="wrap" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px 40px", paddingTop: 22, paddingBottom: 22 }}>
              <span className="mono" style={{ fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#7B8199" }}>{t("landing.strip.label")}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 34px", fontSize: 15, fontWeight: 500, color: "#D7DAE6" }}>
                <span>{t("landing.strip.1")}</span>
                <span>{t("landing.strip.2")}</span>
                <span>{t("landing.strip.3")}</span>
                <span>{t("landing.strip.4")}</span>
              </div>
            </div>
          </div>

          {/* ============ El problema ============ */}
          <section className="sec" style={{ borderTop: 0 }}>
            <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: "56px 80px" }}>
              <div style={{ flex: "1 1 380px", minWidth: 0 }}>
                <span className="eyebrow">{t("landing.problem.eyebrow")}</span>
                <h2 className="disp h2">{t("landing.problem.title")}</h2>
                <p className="lead">{t("landing.problem.lead")}</p>
              </div>
              <div style={{ flex: "1.1 1 420px", minWidth: 0, display: "flex", flexDirection: "column" }}>
                {PROBLEMAS.map((p) => (
                  <div key={p} style={{ padding: "28px 0", borderTop: "1px solid rgba(255,255,255,.1)" }}>
                    <h3 className="disp" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{t(`landing.problem.${p}.title`)}</h3>
                    <p style={{ margin: "10px 0 0", color: "#A3A8BC", fontSize: 16.5, lineHeight: 1.65, maxWidth: 480 }}>{t(`landing.problem.${p}.body`)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Como funciona ============ */}
          <section className="sec" id="como">
            <div className="wrap">
              <span className="eyebrow">{t("landing.how.eyebrow")}</span>
              <h2 className="disp h2" style={{ maxWidth: 640 }}>{t("landing.how.title")}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 52 }}>
                {(["s1", "s2", "s3"] as const).map((s, i) => (
                  <div key={s} className="lpanel" style={{ padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
                    <span
                      className="mono"
                      style={{ width: 34, height: 34, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, border: "1px solid rgba(47,216,200,.5)", color: "#7DF0DE" }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="disp" style={{ fontSize: 23, fontWeight: 600, margin: 0 }}>{t(`landing.how.${s}.title`)}</h3>
                      <p style={{ margin: "10px 0 0", color: "#A3A8BC", fontSize: 16, lineHeight: 1.6 }}>{t(`landing.how.${s}.body`)}</p>
                    </div>

                    {s === "s1" && (
                      <div className="inner" style={{ marginTop: "auto", padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                        <svg width="30" height="36" viewBox="0 0 30 36" fill="none" aria-hidden="true">
                          <path d="M3 2h16l8 8v22a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="rgba(47,216,200,.12)" stroke="#2FD8C8" strokeWidth="1.5" />
                          <path d="M19 2v8h8" stroke="#2FD8C8" strokeWidth="1.5" />
                          <path d="M7 18h14M7 23h14M7 28h9" stroke="rgba(47,216,200,.6)" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <div style={{ minWidth: 0 }}>
                          <div className="mono" style={{ fontSize: 12.5, color: "#F1F2F6", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ReportHistory.xlsx</div>
                          <div className="mono" style={{ fontSize: 11, color: "#7B8199", marginTop: 3 }}>{t("landing.how.s1.count")}</div>
                        </div>
                      </div>
                    )}

                    {s === "s2" && (
                      <div className="inner" style={{ marginTop: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className="mono" style={{ fontSize: 11, color: "#8E93A6", display: "flex", justifyContent: "space-between" }}>
                          <span>{t("landing.how.s2.buy")}</span>
                          <span style={{ color: "#7DF0DE" }}>FIFO</span>
                        </div>
                        <div className="bar-row" style={{ display: "flex", gap: 3, height: 16 }}>
                          <span style={{ flex: 3, background: "rgba(47,216,200,.7)", borderRadius: "5px 2px 2px 5px" }} />
                          <span style={{ flex: 2, background: "rgba(47,216,200,.42)", borderRadius: "2px 5px 5px 2px" }} />
                        </div>
                        <div className="bar-row" style={{ display: "flex", gap: 3, height: 16 }}>
                          <span style={{ flex: 3, background: "rgba(226,47,160,.7)", borderRadius: "5px 2px 2px 5px" }} />
                          <span style={{ flex: 2, background: "rgba(226,47,160,.42)", borderRadius: "2px 5px 5px 2px" }} />
                        </div>
                        <div className="mono" style={{ fontSize: 11, color: "#8E93A6" }}>{t("landing.how.s2.sell")}</div>
                      </div>
                    )}

                    {s === "s3" && (
                      <div className="inner" style={{ marginTop: "auto", padding: 14 }}>
                        <div className="bar-col" style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 64 }}>
                          {[
                            ["38%", "rgba(47,216,200,.35)"],
                            ["22%", "rgba(255,77,109,.5)"],
                            ["100%", "#2FD8C8"],
                            ["54%", "rgba(47,216,200,.35)"],
                            ["30%", "rgba(255,77,109,.5)"],
                          ].map(([alto, color], j) => (
                            <span key={j} style={{ flex: 1, height: alto, background: color, borderRadius: "5px 5px 2px 2px" }} />
                          ))}
                        </div>
                        <div className="mono" style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 10.5, color: "#7B8199" }}>
                          {[1, 2, 3, 4, 5].map((d) => (
                            <span key={d} style={{ flex: 1, textAlign: "center", color: d === 3 ? "#7DF0DE" : undefined }}>{dias[d]}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Producto ============ */}
          <section className="sec" id="producto">
            <div className="wrap">
              <span className="eyebrow">{t("landing.views.eyebrow")}</span>
              <h2 className="disp h2" style={{ maxWidth: 680 }}>{t("landing.views.title")}</h2>
              <p className="lead">{t("landing.views.lead")}</p>

              <div className="bento" style={{ marginTop: 56 }}>
                {/* Calendario */}
                <div className="b12" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="cap">
                    <h3 className="disp">{t("landing.cal.capTitle")}</h3>
                    <p>{t("landing.cal.capBody")}</p>
                  </div>
                  <div className="dpanel dx" style={{ padding: "22px 24px" }}>
                    <div className="dglow" style={{ width: "50%", height: 200, left: "-8%", top: -80, background: "radial-gradient(circle,rgba(47,216,200,.16),transparent 70%)" }} />
                    <h2 className="dcal-title">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" />
                      </svg>
                      {t("landing.cal.title")}
                    </h2>
                    <div className="dscroll">
                      <div style={{ minWidth: 780 }}>
                        <div className="dgrid" style={{ margin: "10px 0 12px" }}>
                          <div style={{ gridColumn: "1 / 8", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span className="darrow" aria-hidden="true">&#8249;</span>
                            <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.012em" }}>
                              {tituloMes}
                              <span style={{ color: "#8E93A6", fontWeight: 500, marginLeft: 5 }}>2026</span>
                            </span>
                            <span className="darrow" aria-hidden="true">&#8250;</span>
                          </div>
                        </div>
                        <div className="dgrid">
                          {dias.map((d, i) => (
                            <div key={d} className={i === 0 || i === 6 ? "ddow dfin" : "ddow"}>{d}</div>
                          ))}
                          <div className="dwkh">{t("landing.cal.weekCol")}</div>
                        </div>
                        <div className="dgrid">
                          {CAL.filas.map((fila, r) => {
                            const sem = CAL.semanas[r];
                            const rango = t("landing.cal.range", { a: sem.desde, b: sem.hasta, mes: mesCorto });
                            return [
                              ...fila.map((c, ci) => (
                                <div key={`${r}-${ci}`} className={c.valor === null ? "dday" : c.valor >= 0 ? "dday dwin" : "dday dloss"}>
                                  <span className="dtop">{c.n}</span>
                                  <span className="dbot" style={{ color: c.valor === null ? "#8E93A6" : c.valor >= 0 ? VERDE : ROJO }}>
                                    {c.valor === null ? "" : dinero(c.valor, true)}
                                  </span>
                                </div>
                              )),
                              <div key={`${r}-w`} className={sem.dias === 0 ? "dwk dvacia" : "dwk"}>
                                <span className="dtop">{t("landing.cal.week", { n: sem.numero })}</span>
                                <span className="dmid">{rango}</span>
                                <span className="dbot" style={{ color: sem.dias === 0 ? "#8E93A6" : sem.suma >= 0 ? VERDE : ROJO }}>
                                  {sem.dias === 0 ? t("landing.cal.noTrades") : dinero(sem.suma)}
                                </span>
                                {sem.dias > 0 && <span className="dextra">{t("landing.cal.days", { n: sem.dias })}</span>}
                              </div>,
                            ];
                          })}
                        </div>
                        <div className="dres">
                          <span>{t("landing.cal.monthTotal")} <b className="tot" style={{ color: VERDE }}>{dinero(CAL.total, true)}</b></span>
                          <span>{CAL.diasOperados} {t("landing.cal.daysTraded")}</span>
                          <span>{t("landing.cal.best")} <b style={{ color: VERDE }}>{dinero(CAL.mejor.valor, true)}</b> <span style={{ color: "#5C6178" }}>{fecha(1, CAL.mejor.n)}</span></span>
                          <span>{t("landing.cal.worst")} <b style={{ color: ROJO }}>{dinero(CAL.peor.valor)}</b> <span style={{ color: "#5C6178" }}>{fecha(1, CAL.peor.n)}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ocho metricas */}
                <div className="b7" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="cap">
                    <h3 className="disp">{t("landing.metrics.title")}</h3>
                    <p>{t("landing.metrics.sub")}</p>
                  </div>
                  <div className="dx" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 10px", margin: "0 2px" }}>
                      <span className="dcap-t">{t("landing.allTime.title")}</span>
                      <span className="dcap-n">{t("landing.allTime.note")}</span>
                    </div>
                    <div className="dstats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
                      {kpi("landing.metric.balance", dinero(CIFRAS.balance), VERDE)}
                      {kpi("landing.metric.pnl", dinero(CIFRAS.pnl), VERDE)}
                      {kpi("landing.metric.winrate", winrate, "#F1F2F6", winrate)}
                      {kpi("landing.metric.rr", CIFRAS.riesgoBeneficio, "#F1F2F6")}
                      {kpi("landing.metric.pf", CIFRAS.profitFactor, "#F1F2F6")}
                      <div className="dcard">
                        <div className="dlabel">{t("landing.metric.trades")}</div>
                        <span className="dval dnum">{CIFRAS.operaciones}</span>
                        <div className="dmini">
                          <span style={{ color: VERDE }}>{t("landing.metric.won", { n: CIFRAS.ganadas })}</span>
                          {" · "}
                          <span style={{ color: ROJO }}>{t("landing.metric.lost", { n: CIFRAS.perdidas })}</span>
                        </div>
                      </div>
                      <div className="dcard">
                        <div className="dlabel">{t("landing.metric.ev")}<span className="dinfo">i</span></div>
                        <span className="dval dnum" style={{ color: VERDE }}>{dinero(CIFRAS.expectedValue)}</span>
                      </div>
                      {kpi("landing.metric.time", CIFRAS.tiempoMedio, "#F1F2F6")}
                    </div>
                  </div>
                </div>

                {/* Radar */}
                <div className="b5" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div className="cap">
                    <h3 className="disp">{t("landing.radar.title")}</h3>
                    <p>{t("landing.radar.sub")}</p>
                  </div>
                  <div className="dpanel dx" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div className="dglow" style={{ width: "60%", height: 200, left: "-10%", top: -70, background: "radial-gradient(circle,rgba(226,47,160,.22),transparent 70%)" }} />
                    <div className="dglow" style={{ width: "45%", height: 180, right: "-10%", bottom: -70, background: "radial-gradient(circle,rgba(255,196,0,.16),transparent 70%)" }} />
                    <h2 className="dh2">{t("landing.radar.panel")}</h2>
                    {radarSvg("gRad")}
                    <span className="dscore dnum">{PUNTAJE.toFixed(2)}</span>
                    <div className="dsbar"><i style={{ left: `${PUNTAJE}%` }} /></div>
                  </div>
                </div>
              </div>

              {/* Otras tres vistas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 0, marginTop: 72, borderTop: "1px solid rgba(255,255,255,.1)" }}>
                {(["trades", "accounts", "analytics"] as const).map((v) => (
                  <div key={v} style={{ padding: "26px 28px 0 0" }}>
                    <h3 className="disp" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{t(`landing.more.${v}.title`)}</h3>
                    <p style={{ margin: "8px 0 0", color: "#A3A8BC", fontSize: 15.5, lineHeight: 1.6, maxWidth: 340 }}>{t(`landing.more.${v}.body`)}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px 24px", marginTop: 44 }}>
                <Link className="btn btn-p btn-lg" href="/login">{t("landing.hero.cta")}</Link>
                <span className="mono" style={{ fontSize: 11.5, color: "#7B8199", letterSpacing: ".04em" }}>{t("landing.sampleNote")}</span>
              </div>
            </div>
          </section>

          {/* ============ Importacion ============ */}
          <section className="sec" id="importar">
            <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: "56px 72px", alignItems: "flex-start" }}>
              <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                <span className="eyebrow">{t("landing.import.eyebrow")}</span>
                <h2 className="disp h2" style={{ maxWidth: 520 }}>{t("landing.import.title")}</h2>
                <p className="lead">{t("landing.import.lead")}</p>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
                  {METODOS.map((m) => (
                    <div key={m.name} style={{ display: "flex", gap: 16, padding: "18px 0", borderTop: "1px solid rgba(255,255,255,.1)" }}>
                      <span style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", marginTop: 7, background: m.dot, boxShadow: `0 0 10px ${m.dot}` }} />
                      <div style={{ minWidth: 0 }}>
                        <div className="disp" style={{ fontSize: 19, fontWeight: 600 }}>{t(m.name)}</div>
                        <p style={{ margin: "5px 0 0", color: "#A3A8BC", fontSize: 15.5, lineHeight: 1.55, maxWidth: 420 }}>{t(m.body)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: "1 1 420px", minWidth: 0 }}>
                <div className="lpanel" style={{ padding: 22 }}>
                  <div style={{ border: "1.5px dashed rgba(47,216,200,.45)", borderRadius: 16, background: "rgba(47,216,200,.05)", padding: "34px 20px", textAlign: "center" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                      <path d="M20 28V10M12 18l8-8 8 8" stroke="#2FD8C8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 30v2a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-2" stroke="rgba(47,216,200,.6)" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                    <div className="disp" style={{ fontSize: 18, fontWeight: 600, marginTop: 10 }}>{t("landing.import.drop")}</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "#8E93A6", marginTop: 6 }}>.xlsx · .xls · .csv</div>
                  </div>
                  <div className="inner" style={{ marginTop: 14, padding: "6px 16px" }}>
                    {(
                      [
                        ["landing.import.k1", "ReportHistory.xlsx", "#F1F2F6"],
                        ["landing.import.k2", t("landing.import.v2"), "#F1F2F6"],
                        ["landing.import.k3", "152", "#F1F2F6"],
                        ["landing.import.k4", t("landing.import.v4"), "#8CF3E3"],
                      ] as const
                    ).map(([k, v, c]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,.06)" }}>
                        <span style={{ fontSize: 13, color: "#8E93A6", flex: "none" }}>{t(k)}</span>
                        <span className="mono" style={{ fontSize: 12.5, color: c, textAlign: "right", minWidth: 0, overflowWrap: "anywhere" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ============ Preguntas ============ */}
          <section className="sec" id="preguntas">
            <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: "48px 80px" }}>
              <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                <span className="eyebrow">{t("landing.faq.eyebrow")}</span>
                <h2 className="disp h2" style={{ maxWidth: 420 }}>{t("landing.faq.title")}</h2>
                <p className="lead" style={{ fontSize: 16.5 }}>{t("landing.faq.note")}</p>
              </div>
              <div className="faq" style={{ flex: "1.5 1 460px", minWidth: 0 }}>
                {PREGUNTAS.map((n) => (
                  <details key={n}>
                    <summary>{t(`landing.faq.q${n}`)}</summary>
                    <p>{t(`landing.faq.a${n}`)}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ============ Cierre ============ */}
          <section id="empezar" className="wrap" style={{ paddingTop: 40, paddingBottom: 120 }}>
            <div
              className="lpanel"
              style={{
                padding: "clamp(32px,6vw,72px)",
                borderRadius: 28,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "32px 48px",
                background: "linear-gradient(135deg,rgba(226,47,160,.18),rgba(25,27,42,.85) 45%,rgba(47,216,200,.16))",
              }}
            >
              <div style={{ flex: "1 1 380px", minWidth: 0 }}>
                <h2 className="disp" style={{ fontSize: "clamp(32px,4.6vw,58px)", lineHeight: 1.03, fontWeight: 700, margin: 0, maxWidth: 640 }}>{t("landing.final.title")}</h2>
                <p style={{ fontSize: 18, lineHeight: 1.6, color: "#B4B9CC", maxWidth: 520, margin: "20px 0 0" }}>{t("landing.final.body")}</p>
              </div>
              <Link className="btn btn-p btn-lg" href="/login">{t("landing.nav.signup")}</Link>
            </div>
          </section>

          {/* ============ Pie ============ */}
          <footer style={{ borderTop: "1px solid rgba(255,255,255,.08)" }}>
            <div className="wrap" style={{ paddingTop: 44, paddingBottom: 56 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Logo size={24} relleno />
                <span className="disp" style={{ fontSize: 18, fontWeight: 700 }}>TradeMind</span>
              </div>
              <h4 style={{ margin: "28px 0 0", fontSize: 13, fontWeight: 600, color: "#D7DAE6" }}>{t("landing.legal.title")}</h4>
              <p style={{ margin: "8px 0 0", maxWidth: 760, fontSize: 13.5, lineHeight: 1.7, color: "#8E93A6" }}>{t("landing.legal.body")}</p>
              <p className="mono" style={{ margin: "22px 0 0", fontSize: 12, color: "#7B8199" }}>
                &copy; 2026 TradeMind &middot; {t("landing.footer.rights")}
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
