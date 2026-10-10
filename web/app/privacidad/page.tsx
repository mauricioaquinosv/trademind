import PaginaLegal from "../legal/PaginaLegal";

/** Politica de privacidad: que datos se guardan y que puede hacer el usuario. */
export default function Privacidad() {
  return (
    <PaginaLegal
      doc={{
        titulo: "legal.privacy.title",
        h1: "legal.privacy.h1",
        secciones: [
          { titulo: "legal.privacy.who", cuerpo: "legal.privacy.whoBody" },
          { titulo: "legal.privacy.data", cuerpo: "legal.privacy.dataBody" },
          { titulo: "legal.privacy.why", cuerpo: "legal.privacy.whyBody" },
          { titulo: "legal.privacy.keep", cuerpo: "legal.privacy.keepBody" },
          { titulo: "legal.privacy.third", cuerpo: "legal.privacy.thirdBody" },
          { titulo: "legal.privacy.rights", cuerpo: "legal.privacy.rightsBody" },
          { titulo: "legal.privacy.cookies", cuerpo: "legal.privacy.cookiesBody" },
        ],
      }}
    />
  );
}