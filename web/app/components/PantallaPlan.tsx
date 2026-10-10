"use client";

/**
 * PANTALLA DEL PLAN (/plan). El paso 2 de 3.
 *
 * QUE ES Y QUE NO ES
 *
 * Es el diseÃ±o, no el motor. Cuando alguien entre aqui todavÃ­a no se le cobra
 * nada, no se le guarda ninguna suscripciÃ³n y el boton no llama aStripe: se
 * lleva a la Bienvenida porque es el paso 3 y es la que existe. En cuanto haya
 * una pantalla de pago, este boton pasa a /pago y ahi empieza lo de verdad.
 *
 * LO QUE NO SE HA HECHO A PROPOSITO
 *
 * No hay comprobaciÃ³n de "Â¿tiene ya plan?". Cuando esa comprobaciÃ³n exista, esta
 * pantalla pasa a ser a donde vuelve el que ya esta suscrito a renewar. Ahora
 * mismo todo el mundo puede verla, y eso es lo correcto para una maqueta.
 *
 * Las cifras (precio, dias de prueba) salen de lib/plan/datos.ts, no de aqui.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import {
  PRECIO_MENSUAL,
  DIAS_PRUEBA,
  DIA_DEL_AVISO,
  importe,
} from "../../lib/plan/datos";
import CabeceraFlujo from "./CabeceraFlujo";
import PasosFlujo from "./PasosFlujo";

/* Los tres momentos de la prueba, en orden. El "hoy" va aparte porque es el
   unico que no lleva numero de dia. */
const MOMENTOS = ["hoy", "aviso", "fin"] as const;

export default function PantallaPlan() {
  const { t } = useI18n();
  const precio = importe(PRECIO_MENSUAL);

  return (
    <div className="fl">
      <div className="fl-glow a" />
      <div className="fl-glow b" />

      <div className="fl-in">
        <CabeceraFlujo />

        {/* El paso 1 (Cuenta) ya estÃ¡ superado: se entra a /plan despuÃ©s de
            registrarse. */}
        <PasosFlujo actual={2} />

        <main className="fl-plan">
          <section className="fl-plan-texto">
            <p className="fl-kicker mono">{t("plan.kicker")}</p>
            <h1 className="fl-h1 disp">
              {t("plan.title", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
            </h1>
            <p className="fl-lead">{t("plan.subtitle", { dias: DIAS_PRUEBA })}</p>

            <h2 className="fl-h2 disp">{t("plan.howTitle")}</h2>
            <ol className="fl-linea-t">
              {MOMENTOS.map((momento, i) => {
                const ultimo = i === MOMENTOS.length - 1;
                /* Cada momento lleva su color, y el color es el mismo codigo
                   que en el HTML: turquesa el primero, ambar el aviso y rosa el
                   dia del cobro. */
                const color =
                  momento === "hoy" ? "#2FD8C8" : momento === "aviso" ? "#FFC400" : "#E22FA0";
                const cuando =
                  momento === "hoy"
                    ? t("plan.step.today")
                    : momento === "aviso"
                      ? t("plan.step.dayN", { n: DIA_DEL_AVISO })
                      : t("plan.step.dayN", { n: DIAS_PRUEBA });

                return (
                  <li key={momento}>
                    <div className="fl-linea-t-col">
                      <span
                        aria-hidden="true"
                        className="fl-linea-t-dot"
                        style={{ background: color, boxShadow: `0 0 0 4px ${color}2E` }}
                      />
                      <span
                        aria-hidden="true"
                        className={`fl-linea-t-hilo${ultimo ? " oculto" : ""}`}
                      />
                    </div>
                    <div className="fl-linea-t-cuerpo">
                      <div className="fl-linea-t-cuando mono" style={{ color }}>
                        {cuando}
                      </div>
                      {/* El texto lleva dentro el precio, asi que se le pasa el
                          importe ya formateado en vez de construirlo en el
                          diccionario. */}
                      <div className="fl-linea-t-que">
                        {t(`plan.step.${momento}Body` as "plan.step.hoyBody", {
                          precio,
                          dias: DIAS_PRUEBA,
                          n: DIAS_PRUEBA,
                        })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="fl-precio" aria-labelledby="fl-plan-name">
            <span className="fl-precio-badge mono">
              {t("plan.badge", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
            </span>
            <h2 id="fl-plan-name" className="fl-precio-nombre disp">
              {t("plan.name")}
            </h2>

            <div className="fl-precio-cifra">
              <span className="fl-precio-cantidad disp">{precio}</span>
              <span className="fl-precio-periodo">{t("plan.perMonth")}</span>
            </div>
            <p className="fl-precio-nota">
              {t("plan.noChargeToday", { precio, dias: DIAS_PRUEBA })}
            </p>

            <ul className="fl-ventas">
              {[
                "plan.feature.import",
                "plan.feature.accounts",
                "plan.feature.calendar",
                "plan.feature.metrics",
                "plan.feature.analytics",
                "plan.feature.languages",
                "plan.feature.cancel",
              ].map((clave) => (
                <li key={clave}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#2FD8C8"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  <span>{t(clave as "plan.feature.import")}</span>
                </li>
              ))}
            </ul>

            {/* TODO: este boton deberia ir a /pago, que es el paso que falta.
                Apunta a la Bienvenida para poder recorrer el flujo entero. */}
            <Link href="/bienvenida" className="fl-go" style={{ marginTop: 30 }}>
              {t("plan.cta", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
            </Link>
            <p className="fl-plan-pie">{t("plan.ctaNote", { dias: DIAS_PRUEBA })}</p>
          </section>
        </main>
      </div>
    </div>
  );
}