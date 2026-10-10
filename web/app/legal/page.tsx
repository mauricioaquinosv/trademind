import PaginaLegal from "./PaginaLegal";

/** Aviso legal: quien es el titular del sitio y bajo que condiciones. */
export default function Legal() {
  return (
    <PaginaLegal
      doc={{
        titulo: "legal.legal.title",
        h1: "legal.legal.h1",
        secciones: [
          { titulo: "legal.legal.who", cuerpo: "legal.legal.whoBody" },
          { titulo: "legal.legal.use", cuerpo: "legal.legal.useBody" },
          { titulo: "legal.legal.ip", cuerpo: "legal.legal.ipBody" },
          { titulo: "legal.legal.liability", cuerpo: "legal.legal.liabilityBody" },
        ],
      }}
    />
  );
}