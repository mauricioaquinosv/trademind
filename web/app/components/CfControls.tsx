"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { useI18n } from "../../lib/i18n/LocaleProvider";

/* Cierra el desplegable si se hace clic fuera de su contenedor.
   (Equivale al document.addEventListener('click') del HTML original.) */
function useOutsideClose(boxRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      const box = boxRef.current;
      if (box && !e.composedPath().includes(box)) onClose();
    }
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [boxRef, onClose]);
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* Los nombres de mes y de día se leen del diccionario de idioma dentro de cada
   componente (con useI18n), no desde aquí. Antes eran constantes fijas:
   MONTH_NAMES estaba en inglés y DOWS venía mezclado ("Su","Mo","Tu","We",
   "Th","Fr","Sa"), lo que se veía mal en una pantalla en español. */

/* Celdas del calendario de un mes (días del mes anterior/siguiente marcados como "other") */
function buildCells(viewDate: Date) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrev = new Date(y, m, 0).getDate();

  const cells: { label: number; date: string; other: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) cells.push({ label: daysInPrev - i, date: "", other: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ label: d, date: fmtDate(new Date(y, m, d)), other: false });
  const trailing = (7 - ((startDow + daysInMonth) % 7)) % 7;
  for (let d = 1; d <= trailing; d++) cells.push({ label: d, date: "", other: true });
  return cells;
}

const Chev = () => (
  <svg className="cf-chev" viewBox="0 0 10 6" fill="none">
    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/* ==================== CfSelect ==================== */
export type CfOption = { value: string; label: string };

export function CfSelect({
  options,
  value,
  onChange,
  placeholder,
  style,
}: {
  options: CfOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /* Permite replicar estilos inline del HTML original (p.ej. min-width:140px
     en los selectores de Analytics). */
  style?: CSSProperties;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useOutsideClose(boxRef, () => setOpen(false));

  const selected = options.find((o) => o.value === value);

  return (
    <div className="cf-select" ref={boxRef} style={style}>
      <button
        type="button"
        className={`cf-select-btn${open ? " open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="cf-select-label">{selected ? selected.label : (placeholder ?? t("common.select"))}</span>
        <Chev />
      </button>
      <div className="cf-select-list" style={{ display: open ? "block" : "none" }}>
        {options.map((o) => (
          <div
            key={o.value}
            className={`cf-select-opt${o.value === value ? " active" : ""}`}
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
          >
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== CfDate (solo fecha) ==================== */
function displayDate(d: Date) {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function CfDate({
  value,
  onChange,
  placeholder,
}: {
  value: string; // 'YYYY-MM-DD' o ''
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t, list } = useI18n();
  const MONTH_NAMES = list("months.full");
  const DOWS = list("dow.short");
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => (value ? new Date(`${value}T00:00:00`) : new Date()));
  const boxRef = useRef<HTMLDivElement>(null);
  useOutsideClose(boxRef, () => setOpen(false));

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const todayStr = fmtDate(new Date());
  const cells = buildCells(viewDate);

  return (
    <div className="cf-date" ref={boxRef}>
      <button
        type="button"
        className={`cf-date-btn${open ? " open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setViewDate(value ? new Date(`${value}T00:00:00`) : new Date());
            setOpen(true);
          }
        }}
      >
        <span className={`cf-date-label${value ? "" : " ph"}`}>
          {value ? displayDate(new Date(`${value}T00:00:00`)) : (placeholder ?? t("common.select"))}
        </span>
        <Chev />
      </button>
      {open && (
        <div className="cf-date-pop">
          <div className="cf-date-nav">
            <button type="button" onClick={() => setViewDate(new Date(y, m - 1, 1))}>‹</button>
            <span>{MONTH_NAMES[m]} {y}</span>
            <button type="button" onClick={() => setViewDate(new Date(y, m + 1, 1))}>›</button>
          </div>
          <div className="cf-date-grid">
            {DOWS.map((w) => (
              <div className="cf-date-dow" key={w}>{w}</div>
            ))}
            {cells.map((c, i) => {
              let cls = "cf-date-day";
              if (c.other) cls += " other";
              if (!c.other && c.date === todayStr) cls += " today";
              if (!c.other && c.date === value) cls += " selected";
              return (
                <div
                  key={i}
                  className={cls}
                  onClick={() => {
                    if (c.other) return;
                    onChange(c.date);
                    setOpen(false);
                  }}
                >
                  {c.label}
                </div>
              );
            })}
          </div>
          <div className="cf-date-foot">
            <span onClick={() => { onChange(""); setOpen(false); }}>Clear</span>
            <span onClick={() => { onChange(fmtDate(new Date())); setOpen(false); }}>Today</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== CfDateTime (fecha + hora + minutos + AM/PM) ====================
   Réplica de initCfDateTime(). El valor que entra y sale es un texto
   'YYYY-MM-DDTHH:MM:SS' (o '' si está vacío), igual que el input oculto del HTML. */
function toValue(d: Date) {
  return `${fmtDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function parseValue(v: string): Date | null {
  if (!v) return null;
  const d = new Date(String(v).trim().replace(/\./g, "-").replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
function displayLabel(d: Date) {
  const h24 = d.getHours();
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(h12)}:${pad(d.getMinutes())} ${ampm}`;
}

export function CfDateTime({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t, list } = useI18n();
  const MONTH_NAMES = list("months.full");
  const DOWS = list("dow.short");
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const boxRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useOutsideClose(boxRef, () => setOpen(false));

  const curDate = parseValue(value);

  function parts() {
    const d = curDate ?? new Date();
    return { h24: d.getHours(), m: d.getMinutes(), s: d.getSeconds() };
  }
  function base() {
    return curDate ?? viewDate;
  }
  function commit(d: Date) {
    onChange(toValue(d));
  }

  // Si el popup se sale por la derecha de la pantalla, se alinea al borde derecho del campo.
  useLayoutEffect(() => {
    if (!open || !popRef.current) return;
    const r = popRef.current.getBoundingClientRect();
    if (r.right > window.innerWidth - 8) {
      popRef.current.style.left = "auto";
      popRef.current.style.right = "0";
    }
  }, [open]);

  // Centra las columnas de hora/minuto/AM-PM en el valor seleccionado.
  useEffect(() => {
    if (!open || !popRef.current) return;
    popRef.current.querySelectorAll<HTMLElement>(".cf-dt-col").forEach((col) => {
      const sel = col.querySelector<HTMLElement>(".selected");
      if (sel) col.scrollTop = sel.offsetTop - col.clientHeight / 2 + sel.clientHeight / 2;
    });
  }, [open, value, viewDate]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const todayStr = fmtDate(new Date());
  const selStr = curDate ? fmtDate(curDate) : "";
  const cells = buildCells(viewDate);

  const p = parts();
  let h12 = p.h24 % 12;
  if (h12 === 0) h12 = 12;
  const ampm = p.h24 >= 12 ? "PM" : "AM";

  return (
    <div className="cf-date" ref={boxRef}>
      <button
        type="button"
        className={`cf-date-btn${open ? " open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            setViewDate(curDate ? new Date(curDate) : new Date());
            setOpen(true);
          }
        }}
      >
        <span className={`cf-date-label${curDate ? "" : " ph"}`}>
          {curDate ? displayLabel(curDate) : (placeholder ?? t("common.select"))}
        </span>
        <Chev />
      </button>

      {open && (
        <div className="cf-date-pop cf-dt-pop" ref={popRef}>
          <div className="cf-dt-body">
            <div className="cf-dt-cal">
              <div className="cf-date-nav">
                <button type="button" onClick={() => setViewDate(new Date(y, m - 1, 1))}>‹</button>
                <span>{MONTH_NAMES[m]} {y}</span>
                <button type="button" onClick={() => setViewDate(new Date(y, m + 1, 1))}>›</button>
              </div>
              <div className="cf-date-grid">
                {DOWS.map((w) => (
                  <div className="cf-date-dow" key={w}>{w}</div>
                ))}
                {cells.map((c, i) => {
                  let cls = "cf-date-day";
                  if (c.other) cls += " other";
                  if (!c.other && c.date === todayStr) cls += " today";
                  if (!c.other && c.date === selStr) cls += " selected";
                  return (
                    <div
                      key={i}
                      className={cls}
                      onClick={() => {
                        if (c.other) return;
                        const [Y, M, D] = c.date.split("-").map(Number);
                        commit(new Date(Y, M - 1, D, p.h24, p.m, p.s || 0));
                      }}
                    >
                      {c.label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cf-dt-time">
              <div className="cf-dt-timecol">
                <div className="cf-dt-collabel">Hr</div>
                <div className="cf-dt-col">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <div
                      key={h}
                      className={`cf-dt-opt${h === h12 ? " selected" : ""}`}
                      onClick={() => {
                        let h24 = h % 12;
                        if (ampm === "PM") h24 += 12;
                        const b = base();
                        commit(new Date(b.getFullYear(), b.getMonth(), b.getDate(), h24, p.m, 0));
                      }}
                    >
                      {pad(h)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="cf-dt-timecol">
                <div className="cf-dt-collabel">Min</div>
                <div className="cf-dt-col">
                  {Array.from({ length: 60 }, (_, i) => i).map((mm) => (
                    <div
                      key={mm}
                      className={`cf-dt-opt${mm === p.m ? " selected" : ""}`}
                      onClick={() => {
                        const b = base();
                        commit(new Date(b.getFullYear(), b.getMonth(), b.getDate(), p.h24, mm, 0));
                      }}
                    >
                      {pad(mm)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="cf-dt-timecol">
                <div className="cf-dt-collabel">&nbsp;</div>
                <div className="cf-dt-col">
                  {["AM", "PM"].map((ap) => (
                    <div
                      key={ap}
                      className={`cf-dt-opt${ap === ampm ? " selected" : ""}`}
                      onClick={() => {
                        let h24 = h12 % 12;
                        if (ap === "PM") h24 += 12;
                        const b = base();
                        commit(new Date(b.getFullYear(), b.getMonth(), b.getDate(), h24, p.m, 0));
                      }}
                    >
                      {ap}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="cf-date-foot">
            <span onClick={() => { onChange(""); setOpen(false); }}>Limpiar</span>
            <span
              onClick={() => {
                const now = new Date();
                commit(now);
                setViewDate(new Date(now));
              }}
            >
              Ahora
            </span>
            <span onClick={() => setOpen(false)}>Aplicar</span>
          </div>
        </div>
      )}
    </div>
  );
}
