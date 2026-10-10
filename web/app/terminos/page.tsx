import PaginaLegal from "../legal/PaginaLegal";

/** Terminos y condiciones: el acuerdo, y sobre todo lo que TradeMind NO es. */
export default function Terminos() {
  return (
    <PaginaLegal
      doc={{
        titulo: "legal.terms.title",
        h1: "legal.terms.h1",
        secciones: [
          { titulo: "legal.terms.service", cuerpo: "legal.terms.serviceBody" },
          { titulo: "legal.terms.advice", cuerpo: "legal.terms.adviceBody" },
          { titulo: "legal.terms.risk", cuerpo: "legal.terms.riskBody" },
          { titulo: "legal.terms.account", cuerpo: "legal.terms.accountBody" },
          { titulo: "legal.terms.data", cuerpo: "legal.terms.dataBody" },
          { titulo: "legal.terms.law", cuerpo: "legal.terms.lawBody" },
        ],
        cierre: "legal.terms.accept",
      }}
    />
  );
}