"use client";

/**
 * PANTALLA DE ACCESO PAUSADO (/acceso-pausado).
 *
 * QUE ES
 *
 * La pantalla que ve quien ya no puede entrar. El diseño la tiene en dos
 * versiones que solo se diferencian en el icono, el título, el párrafo y el
 * texto del botón:
 *
 *   - `prueba-terminada`: se acabaron los 7 días y nunca se cobró.
 *   - `pago-no-recibido`: se intentó cobrar y el banco lo rechazó hasta agotar
 *     los reintentos.
 *
 * Las dos son la misma pantalla porque a alguien le da igual cual de las dos
 * sea: lo que necesita saber es que sus datos siguen ahí y qué hacer ahora.
 *
 * POR QUE NO DICE "SE HA BORRADO TU CUENTA"
 *
 * Porque no es verdad, y es la frase que más daño hace cuando ocurre. Aqui se
 * dice lo contrario de forma explicita: tus datos estan a salvo. El diseño lo
 * tiene asi y es lo correcto.
 *
 * QUE ESTADO SE PINTA
 *
 * El de `?motivo=` en la URL. Lo normal es que lo diga la suscripcion guardada.
 * Aqui no hay ninguna, asi que se lee de la direccion para poder ver las dos.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import { PRECIO_MENSUAL, DIAS_PRUEBA, importe } from "../../lib/plan/datos";
import type { MotivoPausa } from "../../lib/plan/estados";
import CabeceraFlujo from "./CabeceraFlujo";

export default function PantallaAccesoPausado({ motivo }: { motivo: MotivoPausa }) {
  const { t } = useI18n();
  const precio = importe(PRECIO_MENSUAL);

  return (
    <div className="fl fl-centro">
      {/* El brillo va al reves que en las demas pantallas: turquesa arriba y
          rosa abajo. En el diseño es al reves, y es a proposito: esta pagina
          no es una puerta de entrada, es un cierre. */}
      <div className="fl-glow b" />
      <div className="fl-glow a" />

      <div className="fl-in">
        <CabeceraFlujo />

        <main className="fl-pausa">
          <div className="fl-pausa-sello" aria-hidden="true">
            {motivo === "prueba-terminada" ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F26BC0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF5C7A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
                <path d="M3 10h18" />
                <path d="M7 14.5h4" />
              </svg>
            )}
          </div>

          <h1 className="disp">{t(`pausa.${motivo}.title` as "pausa.prueba-terminada.title")}</h1>
          <p className="fl-pausa-lead">
            {t(`pausa.${motivo}.lead` as "pausa.prueba-terminada.lead", {
              dias: DIAS_PRUEBA,
              n: DIAS_PRUEBA,
            })}
          </p>

          {/* Lo unico que de verdad importa aqui. */}
          <div className="fl-datos-salvos">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2FD8C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l7 3v5.5c0 4.4-2.9 8.1-7 9.5-4.1-1.4-7-5.1-7-9.5V6l7-3z" />
              <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
            </svg>
            <div>
              <div className="fl-datos-salvos-titulo">{t("pausa.safeTitle")}</div>
              <div className="fl-datos-salvos-cifra mono">
                {t("pausa.safeCount", { n: 152, cuentas: 1 })}
              </div>
              <div className="fl-datos-salvos-nota">{t("pausa.safeBody")}</div>
            </div>
          </div>

          <div className="fl-pausa-precio">
            <span className="fl-pausa-precio-cifra disp">{precio}</span>
            <span className="fl-pausa-precio-nota">{t("plan.perMonth")}</span>
          </div>

          {/* TODO: este boton va a /plan, que es donde se empieza a pagar. Con
              el motor de pago detras, el que vaya a /pago si la tarjeta se
              puede reutilizar. */}
          <Link href="/plan" className="fl-go">
            {t(`pausa.${motivo}.cta` as "pausa.prueba-terminada.cta")}
          </Link>
          <p className="fl-pausa-pie">{t("plan.feature.cancel")}</p>

          <div className="fl-pausa-salir">
            {/* Salir de la cuenta es lo ultimo que se ofrece, y en texto
                pequeno: quien esta aqui todavia esta pensando en volver. */}
            <Link href="/login" className="fl-lnk">
              {t("logout")}
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}