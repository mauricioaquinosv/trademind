/**
 * AVISO DE OPERACIONES QUE NO SE HAN IMPORTADO.
 *
 * Va FUERA de las vistas a proposito. El codigo salta a la vista de trades
 * nada mas terminar la subida, asi que un aviso que viviera dentro de la vista
 * de importar se pondria en pantalla justo cuando ya no se mira. Este se queda
 * visible estes donde estes, y se cierra a mano.
 *
 * El detalle de cada operacion esta plegado por defecto: el usuario suele
 * querer seguir trabajando, no leer veinte rechazos. Se abre con un clic.
 *
 * NO lleva ni una palabra escrita a mano: todo sale del diccionario ES/EN a
 * traves de `t`. El motivo llega como codigo del backend y se traduce aqui
 * (ver lib/i18n/importRechazos.ts).
 */

"use client";

import { useState } from "react";
import {
  traduceRechazos,
  traduceRepetidas,
  type RechazoTraducido,
} from "../../lib/i18n/importRechazos";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import type { TranslationKey } from "../../lib/i18n/config";

type T = (clave: TranslationKey, vars?: Record<string, string | number>) => string;

type Props = {
  /** Lo que devuelve el backend sin traducir: `data.rechazos`. */
  rechazos: unknown;
  /** Cuantas operaciones se han guardado, para el titular. */
  guardadas: number;
  /** Cuantas habia en el archivo, para decir "498 de 502". */
  leidas: number | null;
  /** Lo que devuelve el backend: `data.ya_importadas`. */
  repetidas: unknown;
  /** El backend solo lo pone a true cuando NO se ha guardado nada y el archivo
      era identico al que ya habia. Solo entonces se puede ofrecer borrar. */
  archivoIdentico: boolean;
  /** Para cerrar el aviso. */
  onClose: () => void;
  /** Para borrar todo y volver a importar. Opcional: solo existe cuando el
      backend dice que el archivo es identico. */
  onReplaceAll?: () => void;
};

export default function AvisoImportacion({
  rechazos, repetidas, guardadas, leidas, archivoIdentico, onClose, onReplaceAll,
}: Props) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);

  const lista: RechazoTraducido[] = traduceRechazos(rechazos, t as T);
  const yaTenia: RechazoTraducido[] = traduceRepetidas(repetidas, t as T);

  // Sin ninguna de las dos listas no hay nada que avisar: el archivo subio bien.
  if (!lista.length && !yaTenia.length) return null;

  const total = leidas ?? guardadas + lista.length + yaTenia.length;

  return (
    <div className="aviso-import" role="status">
      <div className="aviso-import-cab">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 8v5M12 16.5v.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20.2h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>

        <div className="aviso-import-txt">
          {/* El titular cambia segun que haya pasado. "Has importado 498 de
              502" no sirve si lo que paso es que no habia nada nuevo que
              importar. */}
          <b>
            {guardadas === 0 && yaTenia.length > 0
              ? t("import.allThere", { n: yaTenia.length })
              : leidas !== null
                ? t("import.partial", { n: guardadas, total })
                : t("import.why", { n: lista.length })}
          </b>
          {lista.length > 0 && <span>{t("import.rejectedTitle", { n: lista.length })}</span>}
          {yaTenia.length > 0 && (
            <span>{t("import.alreadyTitle", { n: yaTenia.length })}</span>
          )}
        </div>

        <div className="aviso-import-acc">
          <button type="button" className="pill" onClick={() => setAbierto((v) => !v)}>
            {abierto ? t("import.hideDetail") : t("import.showDetail")}
          </button>
          <button type="button" className="icon-btn" aria-label={t("common.cancel")} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* El boton de borrar SOLO aparece cuando el backend dice que el archivo
          era identico. Con una sola operacion nueva, el usuario tiene datos
          que perder y no se le ofrece: por eso no se decide aqui. */}
      {archivoIdentico && onReplaceAll && (
        <button type="button" className="aviso-import-reemplazar" onClick={onReplaceAll}>
          {t("import.replaceAll")}
        </button>
      )}

      {abierto && (
        <ul className="aviso-import-lista">
          {lista.map((r, i) => (
            <li key={`${r.fila ?? "x"}-${i}`} className="aviso-import-item">
              <div className="aviso-import-fila">
                <span className="aviso-import-nro">
                  {r.fila === null ? t("import.rowUnknown") : t("import.row", { n: r.fila })}
                </span>
                {r.simbolo && <span className="aviso-import-sim">{r.simbolo}</span>}
                {r.fecha && <span className="aviso-import-fecha">{r.fecha.replace("T", " ").slice(0, 16)}</span>}
              </div>
              <div className="aviso-import-dato">
                {r.campo}: <b>{r.valor}</b>
              </div>
              <div className="aviso-import-porque">{r.motivo}</div>
              <div className="aviso-import-fix">{r.solucion}</div>
            </li>
          ))}

          {/* Las repetidas van en su propia lista visual: no hay dato malo que
              corregir, solo operaciones que ya estaban. */}
          {yaTenia.map((r, i) => (
            <li key={`rep-${r.fila ?? "x"}-${i}`} className="aviso-import-item aviso-import-ya">
              <div className="aviso-import-fila">
                <span className="aviso-import-nro">
                  {r.fila === null ? t("import.rowUnknown") : t("import.row", { n: r.fila })}
                </span>
                {r.simbolo && <span className="aviso-import-sim">{r.simbolo}</span>}
                {r.fecha && <span className="aviso-import-fecha">{r.fecha.replace("T", " ").slice(0, 16)}</span>}
              </div>
              <div className="aviso-import-porque">{r.motivo}</div>
              <div className="aviso-import-fix">{r.solucion}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}