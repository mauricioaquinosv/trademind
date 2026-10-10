"use client";

/**
 * FACTURACION. LA PARTE DE CLIENTE.
 *
 * Lee el estado de la URL y pinta la pantalla con el. Vive aparte de
 * page.tsx porque `useSearchParams` no puede importarse en un componente de
 * servidor, y page.tsx tiene que serlo para poder exportar `metadata`.
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PantallaFacturacion from "../components/PantallaFacturacion";
import { normalizaEstado } from "../../lib/plan/estados";
import type { FechaTrial } from "../../lib/plan/datos";

function Interna() {
  const params = useSearchParams();
  const estado = normalizaEstado(params.get("estado"));

  /* La fecha de hoy se calcula aqui, en el servidor, por el mismo motivo que
     en la Bienvenida: si se calculase en el navegador, el servidor y el cliente
     podrian sacar fechas distintas si la peticion cae cerca de medianoche. */
  const hoy = new Date();
  const hoyPartido: FechaTrial = {
    dia: hoy.getDate(),
    mes: hoy.getMonth(),
    anio: hoy.getFullYear(),
  };

  return <PantallaFacturacion estado={estado} hoy={hoyPartido} />;
}

/** Sin este <Suspense>, Next no puede renderizar la ruta en build. */
export default function FacturacionInterna() {
  return (
    <Suspense fallback={null}>
      <Interna />
    </Suspense>
  );
}