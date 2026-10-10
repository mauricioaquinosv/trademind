"use client";

/**
 * PANTALLA DE PAGO (/pago).
 *
 * QUE ES Y QUE NO ES
 *
 * El diseño del paso 2 de 3. El formulario NO cobra nada: no hay Stripe, ni
 * backend, ni tarjeta que se procese. Los campos se pueden rellenar y se puede
 * mandar, y lo unico que hace el boton es llevar a la Bienvenida.
 *
 * LO QUE HAY QUE MIRAR ANTES DE PUBLICAR
 *
 * El boton dice "Empezar prueba gratis" y debajo hay un candado que promete que
 * TradeMind no guarda los datos de la tarjeta. Las dos cosas son verdad solo
 * cuando el pago lo haga un tercero. Mientras el formulario sea este, esas dos
 * frases son una promesa sin nada detras, igual que lo eran los terminos que
 * no existian. Por eso esta pantalla no se enlaza desde ningun sitio todavia.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import {
  PRECIO_MENSUAL,
  DIAS_PRUEBA,
  formateaFecha,
  importe,
  type FechaTrial,
} from "../../lib/plan/datos";
import CabeceraFlujo from "./CabeceraFlujo";

export default function PantallaPago({ fin }: { fin: FechaTrial }) {
  const { t, list } = useI18n();
  const precio = importe(PRECIO_MENSUAL);
  const fechaCobro = formateaFecha(fin, list("months.short"));

  return (
    <div className="fl">
      <div className="fl-glow a" />
      <div className="fl-glow b" />

      <div className="fl-in">
        <CabeceraFlujo />

        {/* Volver al plan: cambiar de opinion antes de meter la tarjeta es
            justo lo que este enlace tiene que permitir. */}
        <div className="fl-volver">
          <Link href="/plan">← {t("pago.back")}</Link>
        </div>

        <main className="fl-pago">
          <section className="fl-pago-res" aria-labelledby="fl-pago-h1">
            <h1 id="fl-pago-h1" className="fl-pago-h1 disp">
              {t("pago.title", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
            </h1>
            <p className="fl-pago-lead">
              {t("pago.lead", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
            </p>

            <div className="fl-resumen">
              <h2 className="fl-resumen-titulo mono">{t("pago.summary")}</h2>

              <div className="fl-resumen-fila">
                <div>
                  <div className="fl-resumen-plan disp">{t("plan.name")}</div>
                  <div className="fl-resumen-plan-nota">{t("pago.planNote")}</div>
                </div>
                {/* Tachado a proposito: es lo que costaria AL MES, no lo que se
                    paga en esta pantalla. Sin tacharlo parece un precio
                    rebajado. */}
                <div className="fl-resumen-tachado mono">{precio}</div>
              </div>

              <div className="fl-resumen-prueba">
                <span>{t("pago.trialLine", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}</span>
                <span className="mono">{t("pago.zero")}</span>
              </div>

              <div className="fl-resumen-total">
                <span className="fl-resumen-total-etq">{t("pago.totalToday")}</span>
                <span className="fl-resumen-total-cifra disp">{t("pago.zero")}</span>
              </div>

              {/* La fecha del primer cobro, en letras y no en numeros: es el
                  dato que mas se lee de esta pantalla. */}
              <p className="fl-aviso-cobro">
                {t("pago.chargeOn", {
                  fecha: fechaCobro,
                  precio,
                  dias: DIAS_PRUEBA,
                  n: DIAS_PRUEBA,
                })}
              </p>
            </div>

            <p className="fl-impuestos">{t("pago.taxes")}</p>
          </section>

          <section className="fl-form" aria-labelledby="fl-form-titulo">
            <h2 id="fl-form-titulo" className="fl-form-titulo disp">
              {t("pago.method")}
            </h2>

            {/* Los campos NO se envian a ningun sitio. No hay `action` y el
                boton es un enlace, no un `type="submit"`: mientras no haya un
                motor de pago, un formulario que "envia" seria mentir. */}
            <div className="fl-form-campos">
              <div className="fl-campo">
                <label className="fl-campo-etq" htmlFor="pago-email">
                  {t("pago.email")}
                </label>
                <input
                  id="pago-email"
                  className="fl-input"
                  type="email"
                  readOnly
                  value={t("pago.emailEjemplo")}
                />
              </div>

              <div className="fl-campo">
                <label className="fl-campo-etq" htmlFor="pago-nombre">
                  {t("pago.cardName")}
                </label>
                <input
                  id="pago-nombre"
                  className="fl-input"
                  type="text"
                  placeholder={t("pago.cardNamePh")}
                  autoComplete="cc-name"
                />
              </div>

              <div className="fl-campo">
                <label className="fl-campo-etq" htmlFor="pago-numero">
                  {t("pago.cardNumber")}
                </label>
                <input
                  id="pago-numero"
                  className="fl-input mono"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 1234 1234 1234"
                  autoComplete="cc-number"
                />
              </div>

              <div className="fl-campo-par">
                <div>
                  <label className="fl-campo-etq" htmlFor="pago-caducidad">
                    {t("pago.expiry")}
                  </label>
                  <input
                    id="pago-caducidad"
                    className="fl-input mono"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM / AA"
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <label className="fl-campo-etq" htmlFor="pago-cvc">
                    {t("pago.cvc")}
                  </label>
                  <input
                    id="pago-cvc"
                    className="fl-input mono"
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              <div className="fl-campo">
                <label className="fl-campo-etq" htmlFor="pago-cp">
                  {t("pago.postalCode")}
                </label>
                <input
                  id="pago-cp"
                  className="fl-input"
                  type="text"
                  placeholder={t("pago.postalCodePh")}
                  autoComplete="postal-code"
                />
              </div>

              {/* TODO: este enlace va a /pago-real, que es donde estara Stripe.
                  Ahora mismo va a la Bienvenida para poder recorrer el flujo. */}
              <Link href="/bienvenida" className="fl-go" style={{ marginTop: 6 }}>
                {t("pago.cta", { dias: DIAS_PRUEBA, n: DIAS_PRUEBA })}
              </Link>
            </div>

            <p className="fl-seguro">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
              <span>{t("pago.secure")}</span>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}