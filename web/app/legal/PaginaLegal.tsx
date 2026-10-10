"use client";

/**
 * LAS TRES PAGINAS LEGALES, EN UNA SOLA.
 *
 * `/legal`, `/privacidad` y `/terminos` montan este mismo componente con distinto
 * contenido. Se podia haber hecho con tres ficheros y tres juegos de etiquetas,
 * pero el armazon es identico y duplicarlo haria que arreglar un fallo en el
 * estilo obligara a arreglarlo en tres sitios.
 *
 * EL DISENO
 *
 * El mismo de la landing: el fondo oscuro, los brillos y la tipografia de
 * display. Aqui NO va la rejilla que sigue al raton: en un texto largo de
 * veinte párrafos distrae, y estas paginas se leen, no se miran.
 *
 * LO QUE NO SE HA HECHO
 *
 * No se ha inventado ningun dato. Los cinco huecos salen de `lib/legal/datos.ts`
 * con el texto "[PENDIENTE: ...]" delante, y la pagina lo avisa arriba para que
 * no se pueda publicar esto creyendo que esta listo.
 */

import Link from "next/link";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import type { TranslationKey } from "../../lib/i18n/config";
import { conDatos, hayPendientes, DATOS_LEGAL } from "../../lib/legal/datos";
import { Logo } from "../components/Landing";

/* Las claves se tipan como `TranslationKey` y no como `string`: el tipo sale de
   las claves de es.ts, y si aqui se dejara como string, escribir mal un nombre
   no daria error hasta que la pagina saliera con "legal.terms.advice" escrito
   en medio. Es el mismo mecanismo que protege el resto del proyecto. */
type Doc = {
  titulo: TranslationKey;
  h1: TranslationKey;
  secciones: { titulo: TranslationKey; cuerpo: TranslationKey }[];
  cierre?: TranslationKey;
};

export default function PaginaLegal({ doc }: { doc: Doc }) {
  const { t } = useI18n();

  return (
    <div className="lgl">
      <div className="lg-glow a" />
      <div className="lg-glow b" />

      <header className="lgl-cab">
        <Link href="/" className="lg-brand">
          <Logo size={30} />
          <span className="disp">TradeMind</span>
        </Link>
      </header>

      <main className="lgl-main">
        {/* El aviso de los datos sin rellenar. Sale SIEMPRE que falte alguno, y
            va arriba del todo para que no se pase por alto. */}
        {hayPendientes() && (
          <div className="lgl-pendiente" role="alert">
            <b>⚠ Faltan datos por rellenar</b>
            <p>
              Edita <code>web/lib/legal/datos.ts</code> y pon estos cinco valores:
            </p>
            <ul>
              {Object.entries(DATOS_LEGAL).map(([clave, valor]) => (
                <li key={clave}>
                  <code>{clave}</code>: {String(valor)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h1 className="lgl-h1 disp">{t(doc.h1)}</h1>
        <p className="lgl-fecha">
          {t("legal.lastUpdate", { fecha: DATOS_LEGAL.fecha })}
        </p>

        <nav className="lgl-sumario" aria-label={t("legal.sections")}>
          {doc.secciones.map((s) => (
            <a key={s.titulo} href={`#${s.titulo}`}>
              {t(s.titulo)}
            </a>
          ))}
        </nav>

        {doc.secciones.map((s) => (
          <section key={s.titulo} className="lgl-sec">
            <h2>{t(s.titulo)}</h2>
            {/* conDatos(): sustituye {nombre}, {nif}, {email} y {lugar} por los
                valores de lib/legal/datos.ts. */}
            <p>{conDatos(t(s.cuerpo))}</p>
          </section>
        ))}

        {doc.cierre && <p className="lgl-cierre">{conDatos(t(doc.cierre))}</p>}

        <Link href="/" className="lgl-boton btn-p">
          {t("legal.toCta")}
        </Link>
        <p className="lgl-vuelta">
          <Link href="/">{t("legal.backHome")}</Link>
        </p>
      </main>
    </div>
  );
}