"use client";

/**
 * ACCESO PAUSADO. LA PARTE DE CLIENTE.
 *
 * Lee el motivo de la URL y pinta la pantalla con el. Vive aparte de page.tsx
 * porque `useSearchParams` no puede importarse en un componente de servidor.
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PantallaAccesoPausado from "../components/PantallaAccesoPausado";
import { normalizaMotivo } from "../../lib/plan/estados";

function Interna() {
  const params = useSearchParams();
  const motivo = normalizaMotivo(params.get("motivo"));

  return <PantallaAccesoPausado motivo={motivo} />;
}

/** Sin este <Suspense>, Next no puede renderizar la ruta en build. */
export default function PausaInterna() {
  return (
    <Suspense fallback={null}>
      <Interna />
    </Suspense>
  );
}