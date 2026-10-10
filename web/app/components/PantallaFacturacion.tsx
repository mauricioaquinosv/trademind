"use client";

/**
 * PANTALLA DE FACTURACION (/facturacion).
 *
 * UNA SOLA PANTALLA, CINCO ESTADOS
 *
 * El diseño la dibuja en cinco versiones: en prueba, a punto de acabar, activa,
 * cancelada y con el pago rechazado. Lo que cambia entre ellas es un aviso, una
 * insignia de color, un texto, la barra de la prueba y que botones hay. Todo lo
 * demas —la lateral, la cabecera, el panel de la tarjeta, la tabla de facturas—
 * es el mismo y se escribe una sola vez aqui.
 *
 * QUE ESTADO SE PINTa
 *
 * El de `?estado=` en la URL. Lo normal es que lo diga la suscripcion guardada
 * en la base de datos; como no hay ninguna, se lee de la direccion para poder
 * recorrer las cinco sin backend. Los valores validos son los de
 * `lib/plan/estados.ts`; uno desconocido cae en el de por defecto, en vez de
 * dejar la pagina en blanco.
 *
 * LO QUE NO HACE NADA
 *
 * El boton de cancelar abre un cuadro de confirmacion (por diseno: cancelar mal
 * es un problema de verdad) pero ese cuadro no cancela nada. Reactivar, cambiar
 * la tarjeta y actualizar la tarjeta tampoco hacen nada. Cuando exista el motor,
 * estos botones empiezan a llamar a la API.
 */

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import {
  PRECIO_MENSUAL,
  DIAS_PRUEBA,
  DIA_DEL_AVISO,
  normalizaDia,
  finDePruebaEnDia,
  masDias,
  masMeses,
  progresoPrueba,
  formateaFecha,
  importe,
  TARJETA_MUESTRA,
  type FechaTrial,
} from "../../lib/plan/datos";
import {
  DIA_POR_ESTADO,
  muestraProgreso,
  reactivable,
  type EstadoFacturacion,
} from "../../lib/plan/estados";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";
import { Logo } from "./Landing";

/** La lateral con las secciones de la aplicacion. */
const SECCIONES = [
  { clave: "nav.summary", href: "/dashboard" },
  { clave: "nav.trades", href: "/dashboard" },
  { clave: "nav.accounts", href: "/dashboard" },
  { clave: "nav.analytics", href: "/dashboard" },
  { clave: "import.title", href: "/dashboard" },
] as const;

/**
 * El color de cada estado.
 *
 * Van aqui y no en el CSS porque el color ES el estado: en el diseño, verde es
 * prueba o activa, ambar es "se te acaba", gris es cancelada y rojo es "algo ha
 * fallado". Si estuvieran en el CSS haria falta una clase por estado, que es
 * justo lo que se ha querido evitar al decidir que esto fuese una lista.
 */
const COLOR: Readonly<
  Record<EstadoFacturacion, { fondo: string; borde: string; texto: string }>
> = {
  "en-prueba": {
    fondo: "rgba(47,216,200,0.10)",
    borde: "rgba(47,216,200,0.30)",
    texto: "#7DF0DE",
  },
  "termina-pronto": {
    fondo: "rgba(255,196,0,0.10)",
    borde: "rgba(255,196,0,0.32)",
    texto: "#FFD84D",
  },
  activa: { fondo: "rgba(47,216,200,0.10)", borde: "rgba(47,216,200,0.30)", texto: "#7DF0DE" },
  cancelada: {
    fondo: "rgba(255,255,255,0.06)",
    borde: "rgba(255,255,255,0.14)",
    texto: "#C9CCDA",
  },
  "pago-fallido": {
    fondo: "rgba(255,92,122,0.10)",
    borde: "rgba(255,92,122,0.34)",
    texto: "#FF8FA6",
  },
};

/** La insignia del estado. El "activa" no lleva marco: no es una alerta. */
const INSIGNIA: Readonly<Record<EstadoFacturacion, string>> = {
  "en-prueba": "rgba(47,216,200,0.16)",
  "termina-pronto": "rgba(255,196,0,0.16)",
  activa: "rgba(47,216,200,0.16)",
  cancelada: "rgba(255,255,255,0.10)",
  "pago-fallido": "rgba(255,92,122,0.16)",
};

export default function PantallaFacturacion({
  estado,
  hoy,
}: {
  estado: EstadoFacturacion;
  hoy: FechaTrial;
}) {
  const { t, list } = useI18n();
  const [confirmando, setConfirmando] = useState(false);

  const meses = list("months.short");
  const fecha = (f: FechaTrial) => formateaFecha(f, meses);
  const precio = importe(PRECIO_MENSUAL);
  const color = COLOR[estado];

  /* El dia de la prueba en el que se supone al usuario. Con la prueba ya
     pasada el numero es 0 y aqui se guarda como 1: `finDePruebaEnDia` espera un
     dia entre 1 y 7, y 0 daria una fecha en el pasado. Aqui no se usa, pero se
     deja coherente para que no haya un 0 suelto. */
  const dia = normalizaDia(DIA_POR_ESTADO[estado]);
  const enPrueba = muestraProgreso(estado);

  /* LAS FECHAS DE CADA ESTADO, Y POR QUE NO SON TODAS IGUALES
     Con la prueba corriendo, lo que importa es cuando acaba. Con la prueba ya
     pasada, lo que importa es el proximo cobro, y ese es dentro de un mes.
     Mezclar ambos (poner siempre la fecha de fin de la prueba) haria que un
     usuario con la suscripcion activa leiese una fecha que ya paso. */
  const hoyReal = new Date(hoy.anio, hoy.mes, hoy.dia);
  const finPrueba = finDePruebaEnDia(hoyReal, dia);
  const enUnMes = masMeses(hoyReal, 1);
  /* La fecha que se ensena como "cuando va a pasar algo": el fin de la prueba
     si sigue corriendo, y el proximo cobro si ya no. */
  const siguiente = enPrueba ? finPrueba : enUnMes;

  const hayAviso = estado !== "activa";

  return (
    <div className="fl">
      <div className="fl-glow a" />

      <div className="fl-lateral-envoltura">
        <aside className="fl-lateral">
          <div className="fl-lateral-marca">
            <Logo size={28} />
            <span className="disp">TradeMind</span>
          </div>
          <nav className="fl-lateral-nav" aria-label={t("billing.sections")}>
            {SECCIONES.map((s) => (
              <Link key={s.clave} href={s.href} className="fl-nav-item">
                {t(s.clave)}
              </Link>
            ))}
            <span className="fl-nav-item actual" aria-current="page">
              {t("nav.billing")}
            </span>
          </nav>
        </aside>

        <div className="fl-fact-cuerpo">
          {/* El aviso de arriba. En "activa" no hay nada que decir, asi que no
              se pinta el hueco: un recuadro vacio parece un fallo. */}
          {hayAviso && (
            <div
              className="fl-fact-aviso"
              role="status"
              style={{ background: color.fondo, borderBottom: `1px solid ${color.borde}` }}
            >
              <p style={{ margin: 0 }}>
                <b>{t(`billing.banner.${estado}.lead` as "billing.banner.en-prueba.lead", {
                  quedan: DIAS_PRUEBA - dia,
                  n: DIAS_PRUEBA - dia,
                })}</b>{" "}
                {t(`billing.banner.${estado}.body` as "billing.banner.en-prueba.body", {
                  fecha: fecha(siguiente),
                  n: dia,
                  dias: DIAS_PRUEBA,
                  quedan: DIAS_PRUEBA - dia,
                  precio,
                })}
              </p>
              <button type="button" className="fl-btn" style={{ height: 36, padding: "0 16px", fontSize: 13.5 }}>
                {t(
                  reactivable(estado)
                    ? "billing.banner.cancelada.cta"
                    : (estado === "pago-fallido" ? "billing.banner.pago-fallido.cta" : "billing.banner.en-prueba.cta")
                )}
              </button>
            </div>
          )}

          <div className="fl-fact-in">
            <div className="fl-fact-cab">
              <h1 className="fl-fact-h1 disp">{t("billing.title")}</h1>
              <LanguageSwitcher />
            </div>

            {/* --- el plan --- */}
            <section className="fl-panel fl-panel-sub" aria-labelledby="fl-plan">
              <div className="fl-panel-fila">
                <div style={{ minWidth: 0 }}>
                  <div className="fl-panel-cab">
                    <h2 id="fl-plan" className="fl-panel-titulo disp">
                      {t("billing.planName")}
                    </h2>
                    <span
                      className="fl-insignia mono"
                      style={{ background: INSIGNIA[estado], color: color.texto }}
                    >
                      {t(`billing.badge.${estado}` as "billing.badge.activa")}
                    </span>
                  </div>
                  <p className="fl-panel-desc">
                    {t(`billing.desc.${estado}` as "billing.desc.activa", {
                      fecha: fecha(siguiente),
                      n: dia,
                      dias: DIAS_PRUEBA,
                      quedan: DIAS_PRUEBA - dia,
                      precio,
                    })}
                  </p>
                </div>
                <div className="fl-panel-precio">
                  <div className="fl-panel-precio-cifra disp">{precio}</div>
                  <div className="fl-panel-precio-nota">{t("plan.perMonth")}</div>
                </div>
              </div>

              {/* La barra solo mientras la prueba corre. */}
              {enPrueba && (
                <div className="fl-progreso">
                  <div
                    className="fl-progreso-pista"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={DIAS_PRUEBA}
                    aria-valuenow={dia}
                    aria-label={t("billing.progress")}
                  >
                    <div
                      className="fl-progreso-relleno"
                      style={{
                        width: `${progresoPrueba(dia)}%`,
                        background: estado === "termina-pronto" ? "#FFC400" : "#2FD8C8",
                      }}
                    />
                  </div>
                  <div className="fl-progreso-pie">
                    <span className="mono">
                      {t("billing.dayOf", { n: dia, dias: DIAS_PRUEBA })}
                    </span>
                    <span>{t("billing.endsOn", { fecha: fecha(siguiente) })}</span>
                  </div>
                </div>
              )}

              <div className="fl-panel-acciones">
                {reactivable(estado) ? (
                  <button type="button" className="fl-btn fl-btn-p">
                    {t("billing.reactivate")}
                  </button>
                ) : (
                  <button type="button" className="fl-btn fl-btn-d" onClick={() => setConfirmando(true)}>
                    {t("billing.cancel")}
                  </button>
                )}
              </div>
            </section>

            {/* --- la tarjeta --- */}
            <section className="fl-panel fl-tarjeta" aria-labelledby="fl-tarjeta">
              <div className="fl-tarjeta-izq">
                <span className="fl-tarjeta-icono" aria-hidden="true">
                  <svg width="22" height="16" viewBox="0 0 24 18" fill="none" stroke="#C9CCDA" strokeWidth="1.7" strokeLinecap="round">
                    <rect x="1.5" y="1.5" width="21" height="15" rx="2.5" />
                    <path d="M1.5 6.5h21" />
                  </svg>
                </span>
                <div>
                  <h2 id="fl-tarjeta" className="fl-resumen-titulo mono">
                    {t("billing.paymentMethod")}
                  </h2>
                  <div className="fl-tarjeta-dato mono">{t("billing.cardSample")}</div>
                  {/* Con el pago rechazado el motivo va en rojo. Es lo unico
                      que cambia en este panel entre estados. */}
                  <div
                    className={`fl-tarjeta-caduca${estado === "pago-fallido" ? " roja" : ""}`}
                  >
                    {estado === "pago-fallido"
                      ? t("billing.cardDeclined")
                      : t("billing.cardExpires", { fecha: TARJETA_MUESTRA.caducidad })}
                  </div>
                </div>
              </div>
              <button type="button" className="fl-btn">
                {t("billing.changeCard")}
              </button>
            </section>

            {/* --- las facturas --- */}
            <section className="fl-panel fl-facturas" aria-labelledby="fl-facturas">
              <h2 id="fl-facturas" className="fl-resumen-titulo mono">
                {t("billing.invoices")}
              </h2>

              {estado === "en-prueba" || estado === "termina-pronto" ? (
                <p className="fl-facturas-vacio">
                  {t("billing.noInvoices", { fecha: fecha(siguiente) })}
                </p>
              ) : estado === "pago-fallido" ? (
                <ul>
                  <li>
                    <span className="fecha">{fecha(enUnMes)}</span>
                    <span className="mono">{precio}</span>
                    <span className="estado-fallida mono">{t("billing.failed")}</span>
                  </li>
                </ul>
              ) : estado === "cancelada" ? (
                <p className="fl-facturas-vacio">{t("billing.noInvoicesCancel")}</p>
              ) : (
                <ul>
                  <li>
                    <span className="fecha">{fecha(masMeses(hoyReal, -1))}</span>
                    <span className="mono">{precio}</span>
                    <span className="estado-pagada mono">{t("billing.paid")}</span>
                  </li>
                  <li>
                    <span className="fecha">{fecha(finPrueba)}</span>
                    <span className="mono">{precio}</span>
                    <span className="estado-pagada mono">{t("billing.paid")}</span>
                  </li>
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* El cuadro de confirmar. Sale encima del panel y no sobre el fondo de
          la pagina, por eso va aqui dentro y no en un portal. */}
      {confirmando && (
        <div className="fl-modal-fondo" onClick={() => setConfirmando(false)}>
          <div
            className="fl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fl-modal-t"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fl-modal-t" className="disp">
              {t("billing.confirm.title")}
            </h2>
            <p>{t("billing.confirm.body", { fecha: fecha(siguiente) })}</p>
            <ul>
              {[t("billing.confirm.keep1"), t("billing.confirm.keep2")].map((linea) => (
                <li key={linea}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7DF0DE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  <span>{linea}</span>
                </li>
              ))}
            </ul>
            <div className="fl-modal-acciones">
              <button type="button" className="fl-btn fl-btn-d">
                {t("billing.confirm.yes")}
              </button>
              <button type="button" className="fl-btn fl-btn-p" onClick={() => setConfirmando(false)}>
                {t("billing.confirm.keep")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}