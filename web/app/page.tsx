import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import LanguageSwitcher from "../lib/i18n/LanguageSwitcher";
// Componente de cliente: es el unico trozo de la landing que necesita
// JavaScript, y solo porque los numeros tienen que contar. El resto de la pagina
// sigue renderizandose en servidor.
import ContadorMetricas from "./components/ContadorMetricas";
import {
  LOCALE_COOKIE,
  normalizarLocale,
  traducir,
  type TranslationKey,
} from "../lib/i18n/config";

/**
 * LANDING PUBLICA.
 *
 * Componente de SERVIDOR a proposito: el idioma se lee de la cookie igual que
 * en layout.tsx, asi que la primera pintura sale en el idioma correcto y no
 * hay destello. La unica pieza de cliente es el selector de idioma.
 *
 * REGLA DE CONTENIDO: aqui solo se afirma lo que TradeMind hace HOY. Cada
 * linea de esta pagina tiene que ser verdad sin development deployed. No hay
 * testimonios de usuarios porque no hay usuarios, ni cifras de mercado
 * inventadas, ni funciones planificadas.
 */

export default async function LandingPage() {
  const locale = normalizarLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const t = (clave: TranslationKey) => traducir(locale, clave);

  // Los bloques del dashboard. Cada uno lleva un recorte REAL del panel, no una
  // captura de la pagina entera: asi la landing enseña los detalle (el +$222.90
  // del calendario, la franja turquesa del grafico, el 81.18 del radar) en vez
  // de una miniatura ilegible.
  //
  // atras/superpuestas son los mismos recortes que se ven inclinados detras del
  // principal. Apilarlos es lo que da la sensacion de profundidad.
  //
  // next/image con width/height porque son imagenes estaticas servidas desde
  // public/: sin esas medidas Next no reserva el hueco y la pagina salta.
  const bloques = [
    {
      clave: "kpis",
      etiqueta: "landing.stack.kpis",
      titulo: "landing.blocks.kpis.title",
      cuerpo: "landing.blocks.kpis.body",
      color: "var(--teal)",
      frente: "/landing/panel-kpis.png",
      atras: ["/landing/panel-grafico.png", "/landing/panel-calendario.png"],
      ancho: 590,
      alto: 498,
      atrasAlto: [384, 392],
      // Esta tarjeta no usa la foto del frente: monta el panel de indicadores en
      // HTML con las mismas clases del dashboard, para que los numeros puedan
      // contar. atras[0] queda de fondo, inclinado.
      panelVivo: true,
    },
    {
      clave: "calendario",
      etiqueta: "landing.stack.calendario",
      titulo: "landing.blocks.calendario.title",
      cuerpo: "landing.blocks.calendario.body",
      color: "var(--pink)",
      frente: "/landing/panel-calendario.png",
      atras: ["/landing/panel-radar.png", "/landing/panel-kpis.png"],
      ancho: 590,
      alto: 392,
      atrasAlto: [384, 498],
    },
    {
      clave: "grafico",
      etiqueta: "landing.stack.grafico",
      titulo: "landing.blocks.grafico.title",
      cuerpo: "landing.blocks.grafico.body",
      color: "var(--gold)",
      frente: "/landing/panel-grafico.png",
      atras: ["/landing/panel-kpis.png", "/landing/panel-radar.png"],
      ancho: 590,
      alto: 384,
      atrasAlto: [498, 384],
    },
    {
      clave: "radar",
      etiqueta: "landing.stack.radar",
      titulo: "landing.blocks.radar.title",
      cuerpo: "landing.blocks.radar.body",
      color: "var(--green)",
      frente: "/landing/panel-radar.png",
      atras: ["/landing/panel-grafico.png", "/landing/panel-kpis.png"],
      ancho: 590,
      alto: 384,
      atrasAlto: [384, 498],
    },
  ] as const;

  // Las cuatro vias de entrada de datos. Es el bloque que mas nos diferencia.
  // El color se alterna turquesa/rosa para que la rejilla no quede monotonous.
  const importaciones = [
    {
      titulo: "landing.import.mt5.title",
      cuerpo: "landing.import.mt5.body",
      color: "var(--teal)",
    },
    {
      titulo: "landing.import.excel.title",
      cuerpo: "landing.import.excel.body",
      color: "var(--pink)",
    },
    {
      titulo: "landing.import.manual.title",
      cuerpo: "landing.import.manual.body",
      color: "var(--gold)",
    },
    {
      titulo: "landing.import.universal.title",
      cuerpo: "landing.import.universal.body",
      color: "var(--green)",
    },
  ] as const;

  const pasos = [
    { titulo: "landing.how.s1.title", cuerpo: "landing.how.s1.body" },
    { titulo: "landing.how.s2.title", cuerpo: "landing.how.s2.body" },
    { titulo: "landing.how.s3.title", cuerpo: "landing.how.s3.body" },
  ] as const;

  const problemas = [
    { titulo: "landing.problem.p1.title", cuerpo: "landing.problem.p1.body" },
    { titulo: "landing.problem.p2.title", cuerpo: "landing.problem.p2.body" },
    { titulo: "landing.problem.p3.title", cuerpo: "landing.problem.p3.body" },
  ] as const;

  const preguntas = [
    { q: "landing.faq.q1", a: "landing.faq.a1" },
    { q: "landing.faq.q2", a: "landing.faq.a2" },
    { q: "landing.faq.q3", a: "landing.faq.a3" },
    { q: "landing.faq.q4", a: "landing.faq.a4" },
    { q: "landing.faq.q5", a: "landing.faq.a5" },
    { q: "landing.faq.q6", a: "landing.faq.a6" },
  ] as const;

  return (
    <div className="landing">
      {/* ---------------------------------------------------------- */}
      {/* Navegacion                                                  */}
      {/* ---------------------------------------------------------- */}
      <nav className="landing-nav">
        <div className="landing-brand">
          {/* Mismo SVG que el dashboard, byte a byte, para que el logo de
              la landing y el de la app sean el mismo. */}
          <svg className="brand-icon" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 4c-7 0-11 5-11 11 0 3 1 5 2 7-1 2-2 4-2 6 0 5 4 8 9 8V4z"
              fill="var(--pink)"
            />
            <path
              d="M20 4c7 0 11 5 11 11 0 3-1 5-2 7 1 2 2 4 2 6 0 5-4 8-9 8V4z"
              fill="var(--teal)"
            />
            <path
              d="M14 14l3 3-2 3 3 3-2 3"
              stroke="#05060B"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M26 14l-3 3 2 3-3 3 2 3"
              stroke="#05060B"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="landing-brand-name">TradeMind</span>
        </div>

        <div className="landing-nav-right">
          <LanguageSwitcher />
          <Link href="/login" className="landing-btn">
            {t("landing.nav.login")}
          </Link>
          <Link href="/login" className="landing-btn landing-btn-primary">
            {t("landing.nav.signup")}
          </Link>
        </div>
      </nav>

      {/* ---------------------------------------------------------- */}
      {/* Hero                                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-hero">
        <span className="landing-badge">{t("landing.badge")}</span>
        <h1 className="landing-h1">
          {t("landing.hero.title")} <em>{t("landing.hero.titleAccent")}</em>
        </h1>
        <p className="landing-sub">{t("landing.hero.sub")}</p>
        <div className="landing-hero-actions">
          <Link href="/login" className="landing-btn landing-btn-primary landing-btn-lg">
            {t("landing.hero.cta")}
          </Link>
          <Link href="/login" className="landing-btn landing-btn-lg">
            {t("landing.hero.cta2")}
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* El problema                                                  */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.problem.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.problem.title")}</h2>
        <p className="landing-lead">{t("landing.problem.body")}</p>
        <div className="landing-grid landing-grid-3">
          {problemas.map((p) => (
            <article className="landing-card" key={p.titulo}>
              <h3>{t(p.titulo)}</h3>
              <p>{t(p.cuerpo)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Como funciona                                                */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.how.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.how.title")}</h2>
        <div className="landing-grid landing-grid-3">
          {pasos.map((p, i) => (
            <article className="landing-card" key={p.titulo}>
              {/* El numero va en la fuente de las cifras del dashboard. */}
              <div className="landing-step-n">{i + 1}</div>
              <h3>{t(p.titulo)}</h3>
              <p>{t(p.cuerpo)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Lo que ves: las cuatro vistas                               */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.views.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.views.title")}</h2>
        <p className="landing-lead">{t("landing.views.lead")}</p>
        <div className="landing-views-wide">
          <div className="landing-cards-4">
            {bloques.map((b) => (
              <article
                className="landing-vcard"
                key={b.clave}
                style={{ "--shot": b.color } as React.CSSProperties}
              >
                <span className="landing-vcard-tag">{t(b.etiqueta)}</span>
                <h3>{t(b.titulo)}</h3>
                <p>{t(b.cuerpo)}</p>

                {"panelVivo" in b ? (
                  /* LA TARJETA DE METRICAS TAMBIEN LLEVA ESCENA 3D.
                   *
                   * Se quito en el commit anterior porque el giro fuerte
                   * (-26deg) mas el recorte al 144% dejaban las cifras en una
                   * tira de 20 px. Ese error no fue quitar el 3D: fue no
                   * dosificarlo. aqui van las dos cosas a la vez:
                   *
                   *   - El panel de delante es de TEXTO y cuenta, asi que entra
                   *     casi entero (112%) y con un giro suave: -13 grados en vez
                   *     de -26. Asi se ve el panel entero, se lee, y aun asi se
                   *     ve que esta inclinado.
                   *   - Detras va una CAPA REAL, la captura del mismo panel,
                   *     apagada y desplazada. Eso es lo que da profundidad: una
                   *     sola foto no tiene fondo, se ve plana por definition.
                   *
                   * La capa de atras NO es el grafico de PnL como estaba antes:
                   * ese se colaba entre las cifras y era solo ruido. */
                  <div className="landing-vscene landing-vscene-kpis">
                    <div className="landing-vglow" aria-hidden="true" />

                    <div className="landing-vlayer landing-vlayer-back" aria-hidden="true">
                      <Image
                        src={b.frente}
                        alt=""
                        width={b.ancho}
                        height={b.alto}
                        loading="eager"
                      />
                    </div>

                    <div className="landing-vlayer landing-vlayer-front">
                      <ContadorMetricas />
                    </div>
                  </div>
                ) : (
                  /* Las otras tres: foto con capas 3D. */
                  <div className="landing-vscene">
                    <div className="landing-vglow" aria-hidden="true" />

                    <div className="landing-vlayer landing-vlayer-back" aria-hidden="true">
                      <Image
                        src={b.atras[0]}
                        alt=""
                        width={b.ancho}
                        height={b.atrasAlto[0]}
                        /* next/image mete lazy por defecto, y una capa tapada no
                           llega a cargarse nunca. */
                        loading="eager"
                      />
                    </div>

                    <div className="landing-vlayer landing-vlayer-front">
                      <Image
                        src={b.frente}
                        alt={t(b.titulo)}
                        width={b.ancho}
                        height={b.alto}
                        /* Sin lazy a proposito: el hueco de la version anterior
                           era justo la imagen sin cargar. */
                        loading="eager"
                      />
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* La importacion: el diferenciador                             */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.import.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.import.title")}</h2>
        <p className="landing-lead">{t("landing.import.body")}</p>
        <div className="landing-grid landing-grid-4">
          {importaciones.map((i) => (
            <article
              className="landing-card landing-card-tinted"
              key={i.titulo}
              style={{ "--shot": i.color } as React.CSSProperties}
            >
              <h3>{t(i.titulo)}</h3>
              <p>{t(i.cuerpo)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Idioma                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.langs.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.langs.title")}</h2>
        <p className="landing-lead">{t("landing.langs.body")}</p>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Preguntas                                                   */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-section">
        <span className="landing-eyebrow">{t("landing.faq.eyebrow")}</span>
        <h2 className="landing-h2">{t("landing.faq.title")}</h2>
        {/* <details> nativo: el desplegar no necesita JavaScript, asi que las
            preguntas se abren aunque el script aun no haya cargado. */}
        <div className="landing-faq">
          {preguntas.map((p) => (
            <details key={p.q}>
              <summary>{t(p.q)}</summary>
              <p>{t(p.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Cierre                                                      */}
      {/* ---------------------------------------------------------- */}
      <section className="landing-final">
        <h2 className="landing-h2" style={{ margin: "0 auto" }}>
          {t("landing.final.title")}
        </h2>
        <p className="landing-sub">{t("landing.final.body")}</p>
        <div className="landing-hero-actions">
          <Link href="/login" className="landing-btn landing-btn-primary landing-btn-lg">
            {t("landing.hero.cta")}
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/* Pie con el aviso legal                                      */}
      {/* ---------------------------------------------------------- */}
      <footer className="landing-foot">
        <div className="landing-foot-brand">
          <svg className="brand-icon" viewBox="0 0 40 40" fill="none" width="22" height="22">
            <path
              d="M20 4c-7 0-11 5-11 11 0 3 1 5 2 7-1 2-2 4-2 6 0 5 4 8 9 8V4z"
              fill="var(--pink)"
            />
            <path
              d="M20 4c7 0 11 5 11 11 0 3-1 5-2 7 1 2 2 4 2 6 0 5-4 8-9 8V4z"
              fill="var(--teal)"
            />
          </svg>
          <span className="landing-brand-name">TradeMind</span>
        </div>
        <h4>{t("landing.legal.title")}</h4>
        <p>{t("landing.legal.body")}</p>
        <p style={{ marginTop: "16px" }}>
          &copy; 2026 TradeMind &middot; {t("landing.footer.rights")}
        </p>
      </footer>
    </div>
  );
}