/**
 * Animaciones de la landing: entrada escalonada, odometros, dashboard en vivo,
 * cruz con valores, rejilla que reacciona al raton y cinta de simbolos.
 *
 * Es el diseno animado tal como venia, llevado a una funcion que se puede
 * montar y desmontar:
 *
 *     const parar = iniciarEfectos(raiz);   // despues de pintar
 *     parar();                              // al desmontar o cambiar de idioma
 *
 * POR QUE NO ES UN SCRIPT SUELTO. Estos efectos modifican nodos que React
 * pinta (cambian el texto de las cifras, anaden clases, anaden elementos). Para
 * que eso no rompa nada, aqui se cumplen tres reglas:
 *
 *  1. Todo lo que se anade se anota y se QUITA en `parar` (elementos, escuchas,
 *     temporizadores, observadores), y todo lo que se cambia se RESTAURA (texto
 *     de los odometros, trazados del grafico, posicion del marcador).
 *     Sin esto, el modo estricto de React en desarrollo (que monta dos veces)
 *     dejaba las cifras en blanco.
 *  2. La landing se vuelve a montar entera al cambiar de idioma (`key` en
 *     Landing.tsx), asi que React nunca intenta reconciliar un texto que estos
 *     efectos ya reemplazaron.
 *  3. Con "reducir movimiento" activado no se hace nada: la pagina queda
 *     estatica y completa.
 *
 * Los selectores usan clases (.hero, .lpanel, .uline, .bar-row...) y no
 * atributos `style`, porque React reescribe el atributo `style` con otro
 * formato al pintar en cliente y los selectores por texto dejarian de coincidir.
 */

import { acumuladoDe, curvaSuave, dinero } from "../../lib/landing/datos";

const NS = "http://www.w3.org/2000/svg";

type Limpieza = () => void;

export function iniciarEfectos(raiz: HTMLElement): Limpieza {
  if (typeof window === "undefined") return () => {};
  if (window.matchMedia("(prefers-reduced-motion:reduce)").matches) return () => {};

  const limpiezas: Limpieza[] = [];
  const alParar = (f: Limpieza) => limpiezas.push(f);

  const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = raiz) =>
    r.querySelector<T>(s);
  const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = raiz) =>
    Array.from(r.querySelectorAll<T>(s));

  const hover = window.matchMedia("(hover:hover)").matches;

  const temporizadores = new Set<number>();
  const esperar = (f: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      temporizadores.delete(id);
      f();
    }, ms);
    temporizadores.add(id);
    return id;
  };
  alParar(() => {
    temporizadores.forEach((id) => clearTimeout(id));
    temporizadores.clear();
  });

  const escucha = (
    destino: Document | Window | Element,
    tipo: string,
    f: (e: Event) => void,
    opciones?: AddEventListenerOptions,
  ) => {
    destino.addEventListener(tipo, f, opciones);
    alParar(() => destino.removeEventListener(tipo, f, opciones));
  };

  /** Observador unico: cuando un elemento entra en pantalla, ejecuta su accion. */
  type Conmutable = Element & { _go?: Array<() => void> };
  const IO = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          IO.unobserve(e.target);
          (e.target as Conmutable)._go?.forEach((f) => f());
        }
      }),
    { rootMargin: "0px 0px -8% 0px" },
  );
  alParar(() => IO.disconnect());
  // Un mismo elemento puede tener varias acciones (p. ej. tarjetas y barras
  // en .dstats): se acumulan en lugar de pisarse.
  const vigilar = (el: Element | null | undefined, f: () => void) => {
    if (!el) return;
    const c = el as Conmutable;
    (c._go ??= []).push(f);
    IO.observe(el);
  };

  /** Hijos que entran uno tras otro (la clase se quita cuando acaba la entrada). */
  const escalonar = (padre: Element | null, sel: string, cls: string, ms: number) => {
    if (!padre) return;
    const hijos = $$(sel, padre);
    if (!hijos.length) return;
    hijos.forEach((c, i) => {
      c.classList.add(cls);
      c.style.setProperty("--i", String(i));
    });
    vigilar(padre, () => {
      requestAnimationFrame(() => hijos.forEach((c) => c.classList.add("in")));
      esperar(() => {
        hijos.forEach((c) => {
          c.classList.remove(cls, "in");
          c.style.removeProperty("--i");
        });
      }, 2800 + hijos.length * ms);
    });
  };

  // ---------- Barra de progreso de lectura ----------
  const barra = document.createElement("div");
  barra.id = "tm-prog";
  raiz.appendChild(barra);
  alParar(() => barra.remove());
  let pendiente = 0;
  escucha(
    window,
    "scroll",
    () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        const h = document.documentElement.scrollHeight - innerHeight;
        barra.style.transform = `scaleX(${h > 0 ? Math.min(scrollY / h, 1) : 0})`;
      });
    },
    { passive: true },
  );
  alParar(() => pendiente && cancelAnimationFrame(pendiente));

  // ---------- Hero: entrada orquestada + subrayado magenta ----------
  const textoHero = $(".hero.wrap > div > div:first-child");
  if (textoHero) {
    const hijos = [...Array.from(textoHero.children), textoHero.nextElementSibling].filter(
      Boolean,
    ) as HTMLElement[];
    hijos.forEach((c, i) => {
      c.classList.add("hin");
      c.style.setProperty("--i", String(i));
    });
    $$("h1 .uline", textoHero).pop()?.classList.add("ul");
  }

  // ---------- Tarjetas de cifras: barras que se llenan ----------
  $$(".dstats").forEach((g) => {
    const enHero = !!g.closest(".hero");
    $$(".dbar i", g).forEach((b, j) => {
      b.classList.add("gx");
      b.style.setProperty("--i", String(j));
    });
    if (!enHero) escalonar(g, ".dcard", "rv", 80);
    vigilar(g, () =>
      requestAnimationFrame(() => $$(".dbar i", g).forEach((b) => b.classList.add("in"))),
    );
  });

  // ---------- Titulares de cada seccion ----------
  $$("section.sec").forEach((s) => escalonar(s, ".eyebrow,.h2,.lead", "rv", 120));
  escalonar($("section.sec:not([id]) .wrap > div:nth-child(2)"), ":scope > div", "rv", 120);
  escalonar($("#como .wrap > div:last-child"), ":scope > .lpanel", "rv", 150);
  $$("#como .inner").forEach((w) => {
    const b = $$(".bar-row > span, .bar-col > span", w);
    b.forEach((e, i) => {
      e.classList.add(e.parentElement?.classList.contains("bar-col") ? "gy" : "gx");
      e.style.setProperty("--i", String(i));
    });
    vigilar(w, () => requestAnimationFrame(() => b.forEach((e) => e.classList.add("in"))));
  });

  // ---------- Calendario ----------
  const primerDia = $(".dday");
  if (primerDia?.parentElement) escalonar(primerDia.parentElement, ".dday,.dwk", "pop", 28);

  // ---------- Radar y puntaje ----------
  const rs = $("#gRad")?.closest("svg") as SVGElement | null | undefined;
  if (rs) {
    const partes = $$('polygon[fill^="url"],path[stroke-width="9"],path[stroke-width="6"]', rs);
    partes.forEach((e) => e.classList.add("rad"));
    const marcador = $("#producto .dsbar i");
    if (marcador) {
      const original = marcador.style.left;
      marcador.style.left = "0%";
      alParar(() => {
        marcador.style.left = original;
      });
      vigilar(rs.parentElement, () =>
        requestAnimationFrame(() => {
          partes.forEach((e) => e.classList.add("in"));
          marcador.style.left = original;
        }),
      );
    } else {
      vigilar(rs.parentElement, () =>
        requestAnimationFrame(() => partes.forEach((e) => e.classList.add("in"))),
      );
    }
  }

  // ---------- Otras vistas, importacion, preguntas, cierre ----------
  escalonar($("#producto .wrap > div:nth-child(5)"), ":scope > div", "rv", 120);
  escalonar($("#importar .wrap > div:first-child > div:last-child"), ":scope > div", "rv", 120);
  escalonar($("#importar .lpanel .inner"), ":scope > div", "rv", 100);
  escalonar($(".faq"), "details", "rv", 80);
  escalonar($("#empezar"), ".lpanel", "rv", 0);

  // ---------- Foco de luz que sigue al raton en tarjetas y paneles ----------
  if (hover) {
    escucha(
      document,
      "mousemove",
      (ev) => {
        const e = ev as MouseEvent;
        let t = (e.target as Element | null)?.closest?.(".lpanel,.dcard,.dpanel") as HTMLElement | null;
        while (t) {
          const r = t.getBoundingClientRect();
          t.style.setProperty("--mx", `${e.clientX - r.left}px`);
          t.style.setProperty("--my", `${e.clientY - r.top}px`);
          t = t.parentElement?.closest(".lpanel,.dcard,.dpanel") as HTMLElement | null;
        }
      },
      { passive: true },
    );
  }

  // =====================================================================
  // Odometros: cada digito es un rodillo
  // =====================================================================
  const H = 1.15;
  const DIG = "0123456789"
    .repeat(2)
    .split("")
    .map((d) => `<i>${d}</i>`)
    .join("");

  type Odo = { root: HTMLElement; cols: HTMLElement[]; pat: string };
  type ConOdo = HTMLElement & { _o?: Odo };
  const tocados = new Map<ConOdo, string>(); // elemento -> texto original
  alParar(() => {
    tocados.forEach((texto, el) => {
      el.textContent = texto;
      el.removeAttribute("aria-label");
      delete el._o;
      el.classList.remove("odf");
    });
    tocados.clear();
  });

  const construir = (el: ConOdo, txt: string) => {
    if (!tocados.has(el)) tocados.set(el, el.textContent ?? "");
    el.setAttribute("aria-label", txt);
    el.textContent = "";
    const root = document.createElement("span");
    root.className = "odo";
    root.setAttribute("aria-hidden", "true");
    const cols: HTMLElement[] = [];
    for (const ch of txt) {
      if (/\d/.test(ch)) {
        const c = document.createElement("span");
        c.className = "oc";
        const s = document.createElement("span");
        s.className = "os";
        s.innerHTML = DIG;
        c.appendChild(s);
        root.appendChild(c);
        cols.push(s);
      } else {
        const t = document.createElement("span");
        t.textContent = ch;
        t.style.whiteSpace = "pre";
        root.appendChild(t);
      }
    }
    el.appendChild(root);
    el._o = { root, cols, pat: txt.replace(/\d/g, "#") };
    void el.offsetWidth;
  };

  const rodar = (el: ConOdo, txt: string, retraso = 0) => {
    const pat = txt.replace(/\d/g, "#");
    let o = el._o;
    if (!o || el.firstChild !== o.root || o.pat !== pat) {
      construir(el, txt.replace(/\d/g, "0"));
      o = el._o;
    }
    if (!o) return;
    el.setAttribute("aria-label", txt);
    const ds = txt.match(/\d/g) ?? [];
    o.cols.forEach((s, i) => {
      s.style.transitionDelay = `${retraso + i * (el.classList.contains("odf") ? 25 : 70)}ms`;
      s.style.transform = `translateY(-${(10 + +ds[i]) * H}em)`;
    });
  };

  const preparar = (el: HTMLElement | null, retraso = 0) => {
    if (!el) return;
    const t = (el.textContent ?? "").trim();
    if (!/\d/.test(t)) return;
    construir(el, t.replace(/\d/g, "0"));
    vigilar(el, () => rodar(el, t, retraso));
  };

  $$(".dday .dbot,.dwk .dbot").forEach((e, i) => preparar(e, 200 + (i % 31) * 28));
  $$(".hero .dval")
    .slice(2)
    .forEach((e, i) => preparar(e, i * 150));
  $$("#producto .dval").forEach((e, i) => preparar(e, i * 90));
  $$(".dres b").forEach((e, i) => preparar(e, i * 120));
  preparar($("#producto .dscore"), 300);
  preparar($(".hero .dscore"), 600);

  // =====================================================================
  // Dashboard del hero en vivo
  // =====================================================================
  const panelHero = $(".hero .lpanel");
  const svg = panelHero ? ($('svg[role="img"]', panelHero) as SVGSVGElement | null) : null;
  if (panelHero && svg) {
    const linea = $<SVGPathElement>('path[stroke="#2FD8C8"][stroke-width="2.5"]', svg);
    const area = $<SVGPathElement>('path[fill^="url(#gFillA"]', svg);
    const dots = $$<SVGPathElement>('path[stroke-width="7.4"],path[stroke-width="5.2"]', svg);
    const caja = svg.closest(".dpanel") as HTMLElement | null;
    const stats = $(".hero .dstats");

    if (linea && area && dots.length && caja && stats) {
      // Se guardan los trazados originales para devolverlos al parar.
      const originales = [linea, area, ...dots].map((p) => [p, p.getAttribute("d") ?? ""] as const);
      alParar(() => originales.forEach(([p, d]) => p.setAttribute("d", d)));

      const pts = [...(dots[0].getAttribute("d") ?? "").matchAll(/M([\d.]+),([\d.]+)/g)].map(
        (m) => [+m[1], +m[2]] as [number, number],
      );
      const acum = (i: number) => acumuladoDe(pts[i][1]);
      const kv = $$(".dval", stats).slice(0, 2) as ConOdo[];
      kv.forEach((e) => e.classList.add("odf"));

      const cabeza = document.createElementNS(NS, "g");
      cabeza.setAttribute("class", "tmhead");
      cabeza.innerHTML = '<circle class="ring" r="5"/><circle class="core" r="4"/>';
      svg.appendChild(cabeza);
      alParar(() => cabeza.remove());

      const feed = document.createElement("div");
      feed.className = "tm-feed";
      caja.appendChild(feed);
      alParar(() => feed.remove());

      const tip = document.createElement("div");
      tip.className = "tm-tip";
      caja.appendChild(tip);
      alParar(() => tip.remove());

      const cruz = document.createElementNS(NS, "line");
      cruz.setAttribute("y1", "20");
      cruz.setAttribute("y2", "216");
      cruz.setAttribute("stroke", "rgba(47,216,200,.55)");
      cruz.setAttribute("stroke-dasharray", "3 3");
      (cruz as SVGElement).style.display = "none";
      svg.insertBefore(cruz, cabeza);
      alParar(() => cruz.remove());

      let k = 2;
      let visible = false;
      let encima = false;
      let reloj = 0;
      const SIMBOLOS = ["EURUSD", "XAUUSD", "GBPJPY", "NAS100", "USDJPY", "GBPUSD"];

      const fotograma = (n: number) => {
        const q = pts.slice(0, n);
        const d = curvaSuave(q, 0.4);
        const e = q[n - 1];
        linea.setAttribute("d", d);
        area.setAttribute("d", `${d} L${e[0].toFixed(1)},216 L${q[0][0]},216 Z`);
        const dd = q.map((p) => `M${p[0].toFixed(1)},${p[1].toFixed(1)} h0`).join(" ");
        dots.forEach((x) => x.setAttribute("d", dd));
        cabeza.setAttribute("transform", `translate(${e[0]},${e[1]})`);
      };
      const cifras = (i: number) => {
        rodar(kv[0], dinero(10000 + acum(i)));
        rodar(kv[1], dinero(acum(i)));
      };
      const operacion = (i: number) => {
        const v = acum(i) - (i ? acum(i - 1) : 0);
        const r = document.createElement("div");
        r.className = `tm-tr ${v >= 0 ? "tw" : "tl"}`;
        const b = document.createElement("b");
        b.textContent = (v >= 0 ? "+" : "") + dinero(v);
        const s = document.createElement("span");
        s.textContent = `${SIMBOLOS[i % 6]} ${i % 3 ? "BUY" : "SELL"}`;
        r.append(b, s);
        feed.appendChild(r);
        while (feed.children.length > 3) feed.firstChild?.remove();
      };
      const paso = () => {
        if (!document.contains(svg)) return;
        if (document.hidden || !visible || encima) {
          reloj = esperar(paso, 400);
          return;
        }
        if (k < pts.length) {
          k++;
          fotograma(k);
          operacion(k - 1);
          cifras(k - 1);
          reloj = esperar(paso, 950);
        } else {
          reloj = esperar(() => {
            k = 2;
            fotograma(2);
            feed.textContent = "";
            cifras(1);
            reloj = esperar(paso, 900);
          }, 5200);
        }
      };

      fotograma(2);
      kv.forEach((e, i) => construir(e, dinero(i === 0 ? 10000 : 0).replace(/\d/g, "0")));

      const vigia = new IntersectionObserver(
        (es) => {
          const antes = visible;
          visible = es[0].isIntersecting;
          if (visible && !antes && !reloj) {
            esperar(() => {
              cifras(1);
              reloj = esperar(paso, 500);
            }, 1100);
          }
        },
        { threshold: 0.25 },
      );
      vigia.observe(panelHero);
      alParar(() => vigia.disconnect());

      // Cruz con valores al pasar el raton por el grafico.
      escucha(svg, "mousemove", (ev) => {
        const e = ev as MouseEvent;
        const m = svg.getScreenCTM();
        if (!m) return;
        const q = svg.createSVGPoint();
        q.x = e.clientX;
        q.y = e.clientY;
        const p = q.matrixTransform(m.inverse());
        let b = 0;
        let bd = 1e9;
        for (let i = 0; i < k; i++) {
          const d = Math.abs(pts[i][0] - p.x);
          if (d < bd) {
            bd = d;
            b = i;
          }
        }
        if (p.x < 64 || p.y < 20 || p.y > 216) {
          encima = false;
          (cruz as SVGElement).style.display = "none";
          tip.classList.remove("on");
          return;
        }
        encima = true;
        const [x, y] = pts[b];
        const r = svg.getBoundingClientRect();
        const c = caja.getBoundingClientRect();
        const dl = acum(b) - (b ? acum(b - 1) : 0);
        cruz.setAttribute("x1", String(x));
        cruz.setAttribute("x2", String(x));
        (cruz as SVGElement).style.display = "";
        cabeza.setAttribute("transform", `translate(${x},${y})`);
        tip.innerHTML = "";
        const b1 = document.createElement("b");
        b1.textContent = dinero(acum(b));
        const s1 = document.createElement("span");
        s1.style.color = dl >= 0 ? "#2FD8B8" : "#FF4D6D";
        s1.textContent = (dl >= 0 ? "+" : "") + dinero(dl);
        tip.append(b1, s1);
        tip.style.left = `${r.left - c.left + (x / 640) * r.width}px`;
        tip.style.top = `${r.top - c.top + (y / 262) * r.height - 12}px`;
        tip.classList.add("on");
      });
      escucha(svg, "mouseleave", () => {
        encima = false;
        (cruz as SVGElement).style.display = "none";
        tip.classList.remove("on");
        cabeza.setAttribute("transform", `translate(${pts[k - 1][0]},${pts[k - 1][1]})`);
      });
    }
  }

  // =====================================================================
  // Fondo reactivo y cinta de simbolos
  // =====================================================================
  const top = $("#top");
  if (top && hover) {
    const g = document.createElement("div");
    g.id = "tm-grid";
    top.appendChild(g);
    alParar(() => g.remove());
    escucha(
      document,
      "mousemove",
      (ev) => {
        const e = ev as MouseEvent;
        g.style.setProperty("--gx", `${e.clientX}px`);
        g.style.setProperty("--gy", `${e.clientY + scrollY}px`);
      },
      { passive: true },
    );
  }

  const franja = $(".hero.wrap")?.nextElementSibling as HTMLElement | null | undefined;
  if (franja) {
    const antes = { position: franja.style.position, overflow: franja.style.overflow };
    franja.style.position = "relative";
    franja.style.overflow = "hidden";
    const w = $<HTMLElement>(".wrap", franja);
    const antesW = w?.style.position ?? "";
    if (w) w.style.position = "relative";
    const T = [
      ["EURUSD", "+0.42%"],
      ["XAUUSD", "−0.18%"],
      ["GBPJPY", "+1.07%"],
      ["NAS100", "+0.63%"],
      ["USDJPY", "−0.31%"],
      ["GBPUSD", "+0.25%"],
      ["US30", "+0.88%"],
      ["AUDUSD", "−0.12%"],
    ];
    const fila = T.map((a) => `<span>${a[0]} ${a[1]}</span>`).join("");
    const cinta = document.createElement("div");
    cinta.className = "tm-tape";
    cinta.setAttribute("aria-hidden", "true");
    cinta.innerHTML = `<div class="tm-trk">${fila}${fila}${fila}${fila}</div>`;
    franja.insertBefore(cinta, franja.firstChild);
    alParar(() => {
      cinta.remove();
      franja.style.position = antes.position;
      franja.style.overflow = antes.overflow;
      if (w) w.style.position = antesW;
    });
  }

  return () => {
    // En orden inverso: lo ultimo que se anadio es lo primero que se quita.
    for (let i = limpiezas.length - 1; i >= 0; i--) limpiezas[i]();
  };
}
