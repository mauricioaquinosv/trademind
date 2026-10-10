"use client";

/**
 * PANTALLA DE BIENVENIDA (/bienvenida). El paso 3 de 3.
 *
 * QUE ES Y QUE NO ES
 *
 * El diseño del paso con el que se cierra el alta. Cuando se llegue aqui ya no
 * habrá cobro detrás: hoy es el paso 3 del maqueta y no se guarda nada. El día
 * 7 y el importe salen de lib/plan/datos.ts.
 *
 * POR QUE LAS FECHAS VIENEN DEL SERVIDOR Y NO DE AQUI
 *
 * La fecha de fin de prueba se calcula en app/bienvenida/page.tsx, en el
 * servidor, y llega aqui como un {dia, mes, anio}. Podría calcularse en el
 * navegador, pero entonces el servidor y el cliente pueden sacar fechas
 * distintas si la petición cruza medianoche, y React se quejaría de que el
 * HTML no cuadra con lo que se ha pintado en el cliente.
 *
 * El nombre del mes se pone aqui, no en el servidor, porque sale del
 * diccionario: cambiar de idioma tiene que cambiar la fecha a "17 oct" y no
 * dejarla en español.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import { PRECIO_MENSUAL, importe, formateaFecha, type FechaTrial } from "../../lib/plan/datos";
import CabeceraFlujo from "./CabeceraFlujo";
import PasosFlujo from "./PasosFlujo";

/**
 * Las tres filas del resumen.
 *
 * El tipo va declarado a mano en vez de dejar que lo deduzca `as const`: con
 * `as const` las tres filas salen como tres tipos distintos y `fila.aviso`
 * deja de existir en las que no lo tienen. El tipo explicito obliga a que las
 * tres se parezcan y a que `valor: null` signifique "esta fila se compone con
 * la fecha, no con un texto del diccionario".
 */
type Fila = {
  clave: "welcome.row.plan" | "welcome.row.ends" | "welcome.row.charge";
  valor: "welcome.row.planValue" | "welcome.row.chargeValue" | null;
  /** Pinta la cifra en ambar: es el dato que hay que mirar. */
  aviso?: boolean;
};

const FILAS: readonly Fila[] = [
  { clave: "welcome.row.plan", valor: "welcome.row.planValue" },
  { clave: "welcome.row.ends", valor: null },
  { clave: "welcome.row.charge", valor: "welcome.row.chargeValue", aviso: true },
];

export default function PantallaBienvenida({ fin }: { fin: FechaTrial }) {
  const { t, list } = useI18n();

  /* El mes se traduce aqui, en el cliente, con el diccionario del idioma que
     se esta leyendo ahora mismo. */
  const fecha = formateaFecha(fin, list("months.short"));
  const precio = importe(PRECIO_MENSUAL);

  return (
    <div className="fl fl-centro">
      <div className="fl-glow a" />
      <div className="fl-glow b" />

      <div className="fl-in">
        <CabeceraFlujo />

        {/* Esta es la pantalla de "Listo": los dos pasos anteriores están
            superados. */}
        <PasosFlujo actual={3} />

        <main className="fl-bien">
          <div className="fl-sello">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2FD8C8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>

          <h1 className="disp">{t("welcome.title")}</h1>
          <p className="fl-bien-lead">{t("welcome.body", { fecha })}</p>

          <dl className="fl-datos">
            {FILAS.map((fila) => {
              /* El valor de cada fila lleva dentro la fecha o el importe, asi
                 que se compone con t() en vez de dejarlo entero en el
                 diccionario. */
              const valor = fila.valor === null ? fecha : t(fila.valor, { fecha, precio });
              return (
                <div key={fila.clave}>
                  <dt>{t(fila.clave)}</dt>
                  <dd className={`mono${fila.aviso ? " aviso" : ""}`}>{valor}</dd>
                </div>
              );
            })}
          </dl>

          <h2 className="fl-bien-h2 disp">{t("welcome.startTitle")}</h2>
          <ol className="fl-pasos-inicio">
            {[
              ["welcome.step1.title", "welcome.step1.body"],
              ["welcome.step2.title", "welcome.step2.body"],
              ["welcome.step3.title", "welcome.step3.body"],
            ].map(([titulo, cuerpo], i) => (
              <li key={titulo}>
                <span className="fl-paso-num-caja mono" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <div className="fl-paso-inicio-titulo">{t(titulo as "welcome.step1.title")}</div>
                  <div className="fl-paso-inicio-cuerpo">{t(cuerpo as "welcome.step1.body")}</div>
                </div>
              </li>
            ))}
          </ol>

          <Link href="/dashboard" className="fl-go">
            {t("welcome.cta")}
          </Link>

          {/* TODO: apunta a # porque la pantalla de Facturación (/facturacion)
              todavía no existe. Cuando exista, este enlace va allí y no a un
              ancla vacía, que hoy no lleva a ninguna parte. */}
          <p className="fl-bien-pie">
            {t("welcome.changeMind")}{" "}
            <a href="#" className="fl-enlace">
              {t("welcome.manageSub")}
            </a>
          </p>
        </main>
      </div>
    </div>
  );
}