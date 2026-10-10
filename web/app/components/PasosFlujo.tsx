"use client";

/**
 * LOS TRES PASOS: Cuenta / Plan / Listo.
 *
 * Cada pantalla del flujo enseña en que punto va quien lo está viendo. Los tres
 * pasos son siempre los mismos, lo unico que cambia es cual esta marcado como
 * actual, cual como superado y cual como pendiente.
 *
 * POR QUE UN COMPONENTE Y NO TRES COPIAS
 *
 * El color de cada estado (hecho / actual / pendiente) esta en flujo.css, y si
 * se duplicase el <ol> habria que tocar tres ficheros cada vez que se cambiara
 * un color. Ademas, el paso "Listo" no lleva la linea que une al siguiente, y
 * esa regla (`.fl-paso-linea.oculta`) depende de ser el ultimo: si alguien
 * metiera un cuarto paso, el despiste se repetiria.
 */

import { useI18n } from "../../lib/i18n/LocaleProvider";

/** Los tres pasos, en orden. El indice es el numero que se pinta. */
const PASOS = ["flujo.step.account", "flujo.step.plan", "flujo.step.ready"] as const;

/**
 * Cual de los tres pasos se esta viendo.
 *
 * El tipo no es `number` a proposito: si el flujo llegara a tener cuatro pasos,
 * el error tiene que salir al compilar —que es cuando se ven las tres pantallas
 * juntas— y no en produccion, cuando alguien pase un 4 y no se pinte nada.
 */
type Paso = 1 | 2 | 3;

/** Indice del paso que esta viendo quien esta en la pantalla. */
export default function PasosFlujo({ actual }: { actual: Paso }) {
  const { t } = useI18n();

  return (
    <ol className="fl-pasos" aria-label={t("flujo.steps")}>
      {PASOS.map((clave, i) => {
        const numero = i + 1;
        const estado = numero < actual ? "hecho" : numero === actual ? "hoy" : "pendiente";
        const ultimo = numero === PASOS.length;

        return (
          <li
            key={clave}
            className={`fl-paso ${estado}`}
            aria-current={numero === actual ? "step" : "false"}
          >
            <span className="fl-paso-num mono" aria-hidden="true">
              {/* El paso superado no muestra su numero: muestra el visto. Es el
                  mismo cambio que hizo el diseno y queda mas claro que un 1
                  tachado que el usuario ya cumplio. */}
              {estado === "hecho" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                numero
              )}
            </span>
            <span className="fl-paso-label">{t(clave)}</span>
            {/* El palito que une con el paso siguiente. El ultimo no lo lleva:
                si lo llevara, dejaria un rabo colgando a la derecha. */}
            <span aria-hidden="true" className={`fl-paso-linea mono${ultimo ? " oculta" : ""}`} />
          </li>
        );
      })}
    </ol>
  );
}