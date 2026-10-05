"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CIFRAS ANIMADAS ENCIMA DE LA FOTO DEL PANEL.
 *
 * QUE ES Y QUE NO ES
 *
 * La tarjeta NO se ha redisenado. Sigue siendo la foto panel-kpis.png con su
 * recorte, su inclinacion y sus tarjetas a medio cortar, igual que las otras
 * tres. Eso es intencionado: el usuario pidio replicarla tal cual.
 *
 * Lo unico que cambia es que los numeros salen del PNG y se animan. Para eso van
 * en HTML, colocados encima de la foto en la posicion exacta que tenian dentro
 * del panel, con el mismo tamano.
 *
 * LAS MEDIDAS ESTAN MEDIDAS, NO ESTIMADAS
 *
 * En el navegador, con la tarjeta montada, la imagen se dibuja en x=-33 con
 * 395 px de ancho (escala 395/590 = 0.6695). La escena visible va de x=25 a
 * x=304.
 *
 * Con eso, las ocho cifras quedan asi:
 *
 *   columna derecha   x=191.9   entera
 *   columna izquierda x=-16.9   CORTADA 42 px por la izquierda
 *
 * Que es exactamente lo que se ve en la foto: cuatro tarjetas enteras a la
 * derecha y cuatro cortadas a la izquierda. Las cortadas NO se arreglan, porque
 * el usuario dijo que no le importa que se vean incompletas.
 *
 * POR QUE LAS IZQUIERDAS SE VEN CORTADAS Y NO DESAPARECIDAS
 *
 * La caja se sale de la escena por la izquierda y el contenedor tiene
 * overflow:hidden, asi que se recorta sola, igual que la foto. Sin esto, una cifra
 * en x negativo se dibujaria encima de la de la derecha.
 */

type Clase = "dinero" | "decimal" | "entero" | "fijo";

interface Cifra {
  /** Posicion dentro del panel original, en px del PNG. */
  px: number;
  py: number;
  /** Tamano de la cifra ya escalada a como se ve en pantalla. */
  tam: number;
  clase: Clase;
  desde: number;
  hasta: number;
  signo?: string;
  color: string;
}

/**
 * Las ocho cifras del panel, con su posicion en el PNG de 590x498.
 *
 * Los valores son los del reporte de MT5 de ejemplo de sample_data (152
 * operaciones). Congelados a proposito: una landing no tiene de donde
 * consultarlos y lo que se muestra es un ejemplo. Si cambia el reporte de
 * ejemplo, se cambia aqui.
 */
export const CIFRAS: Cifra[] = [
  // Columna izquierda: se ven cortadas por la izquierda.
  { px: 24, py: 108, tam: 20, clase: "dinero", desde: 10000, hasta: 11308.95, color: "#2FD8B8" },
  { px: 24, py: 212, tam: 19, clase: "decimal", desde: 0, hasta: 71.71, signo: "%", color: "#F1F2F6" },
  { px: 24, py: 336, tam: 19, clase: "decimal", desde: 0, hasta: 3.24, color: "#F1F2F6" },
  { px: 24, py: 458, tam: 20, clase: "dinero", desde: 0, hasta: 8.61, color: "#2FD8B8" },

  // Columna derecha: se ven enteras.
  { px: 336, py: 108, tam: 20, clase: "dinero", desde: 0, hasta: 1308.95, color: "#2FD8B8" },
  { px: 336, py: 212, tam: 19, clase: "decimal", desde: 0, hasta: 1.28, color: "#F1F2F6" },
  { px: 336, py: 328, tam: 21, clase: "entero", desde: 0, hasta: 152, color: "#F1F2F6" },
  { px: 336, py: 458, tam: 20, clase: "fijo", desde: 0, hasta: 0, color: "#F1F2F6" },
];

/** La duracion media son dos unidades: no se interpola. */
const DURACION_MEDIA = "49m 33s";

const DURACION = 900;
const ESCALON = 140;

/*
 * LAS DOS ESCALAS, MEDIDAS EN EL NAVEGADOR Y NO CALCULADAS.
 *
 * ESC_IMAGEN: el PNG mide 590 px de ancho y dentro del contenedor se dibuja con
 * 395, o sea 395/590 = 0.6695.
 *
 * ESC_PANTALLA: la capa de delante va girada (-26 en Y, 11 en X) y eso la
 * estrecha un poco. Medido de forma empirica: mover el `left` 20 px mueve la
 * cifra 19 px en pantalla, o sea que un pixel de aqui se ve como 0.95.
 *
 * Sin la segunda escala las cifras se van 9 px a la izquierda, que es la
 * diferencia que se midio entre lo teorico y lo dibujado.
 */
const ESC_IMAGEN = 0.6695;
const ESC_PANTALLA = 0.95;
const ESCALA = ESC_IMAGEN * ESC_PANTALLA;

/** Como pide dinero el dashboard: en-US, con coma de miles y punto decimal. */
function fmtDinero(n: number): string {
  return "$" + n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** easeOutCubic: arranca rapido y frena. Es lo que hace que un numero parezca
 *  contar en vez de deslizarse. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CifrasAnimadas() {
  const [valores, setValores] = useState<number[]>(CIFRAS.map((c) => c.hasta));

  // Los timeouts pendientes se cancelan al salir el raton, para que al pasar y
  // quitar el raton deprisa no se queden cuentas corriendo desincronizadas.
  const pendientes = useRef<number[]>([]);

  useEffect(() => {
    const ids = pendientes.current;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  function texto(i: number, v: number): string {
    const c = CIFRAS[i];
    if (c.clase === "fijo") return DURACION_MEDIA;
    if (c.clase === "dinero") return fmtDinero(v);
    if (c.clase === "entero") return String(Math.round(v));
    return v.toFixed(2) + (c.signo ?? "");
  }

  function arrancar() {
    pendientes.current.forEach((id) => window.clearTimeout(id));
    pendientes.current = [];
    setValores(CIFRAS.map(() => 0));

    CIFRAS.forEach((c, i) => {
      if (c.clase === "fijo") return;

      pendientes.current.push(
        window.setTimeout(() => {
          const t0 = performance.now();
          const tik = () => {
            const t = Math.min(1, (performance.now() - t0) / DURACION);
            const v = c.desde + (c.hasta - c.desde) * ease(t);
            setValores((prev) => {
              const copia = [...prev];
              copia[i] = v;
              return copia;
            });
            if (t < 1) requestAnimationFrame(tik);
          };
          requestAnimationFrame(tik);
        }, i * ESCALON),
      );
    });
  }

  function detener() {
    pendientes.current.forEach((id) => window.clearTimeout(id));
    pendientes.current = [];
    setValores(CIFRAS.map((c) => c.hasta));
  }

  return (
    <div className="landing-cifras" onMouseEnter={arrancar} onMouseLeave={detener}>
      {CIFRAS.map((c, i) => (
        <span
          key={i}
          className="landing-cifra"
          style={
            {
              // Coordenadas RELATIVAS al contenedor, que coincide exactamente con la
              // foto, por las dos escalas medidas (ver ESCALA).
              //
              // Con esto la columna izquierda cae en x=-17,7, o sea FUERA de la
              // escena visible (0..279), y se recorta sola. La derecha cae en
              // x=180,7 y se ve entera. Que es exactamente lo que hace la foto:
              // cuatro tarjetas enteras a la derecha y cuatro cortadas a la
              // izquierda.
              left: c.px * ESCALA,
              top: c.py * ESCALA,
              fontSize: c.tam,
              color: c.color,
            } as React.CSSProperties
          }
        >
          {texto(i, valores[i])}
        </span>
      ))}
    </div>
  );
}