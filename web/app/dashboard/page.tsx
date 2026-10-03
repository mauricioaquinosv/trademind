"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CfDate, CfDateTime, CfSelect } from "../components/CfControls";
import SummaryView from "../components/SummaryView";
import AnalyticsView from "../components/AnalyticsView";

const API = "http://127.0.0.1:8000";

type Account = {
  id: string;
  name: string;
  initial_balance: number;
  currency: string;
  source: string;
};

type Trade = {
  id: string;
  account_id: string;
  position: string | null;
  symbol: string;
  direction: string; // 'long' | 'short'
  quantity: number;
  entry_price: number;
  exit_price: number;
  entry_time: string | null;
  exit_time: string | null;
  sl: number | null;
  tp: number | null;
  commission: number;
  swap: number;
  pnl_bruto: number;
  pnl_neto: number | null;
};

type ViewName = "dashboard" | "trades" | "accounts" | "analytics" | "import";

const TM_TYPE_OPTIONS = [
  { value: "buy", label: "Compra (buy)" },
  { value: "sell", label: "Venta (sell)" },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function nowLocalDateTimeValue() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ---- Columnas de la tabla de Trades (igual que TRADE_COLUMNS del HTML) ---- */
type ColKey =
  | "openTime" | "position" | "symbol" | "type" | "volume" | "openPrice"
  | "sl" | "tp" | "closeTime" | "closePrice" | "commission" | "swap" | "profit" | "pnl";

const TRADE_COLUMNS: { key: ColKey; label: string; money?: boolean }[] = [
  { key: "openTime", label: "Apertura" },
  { key: "position", label: "Posición" },
  { key: "symbol", label: "Símbolo" },
  { key: "type", label: "Tipo" },
  { key: "volume", label: "Volumen" },
  { key: "openPrice", label: "Precio apertura" },
  { key: "sl", label: "S/L" },
  { key: "tp", label: "T/P" },
  { key: "closeTime", label: "Cierre" },
  { key: "closePrice", label: "Precio cierre" },
  { key: "commission", label: "Comisión", money: true },
  { key: "swap", label: "Swap", money: true },
  { key: "profit", label: "Beneficio", money: true },
  { key: "pnl", label: "Neto", money: true },
];

function fmtMoneyFull(n: number | null | undefined) {
  const v = n || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dashOr<T>(v: T | null | undefined) {
  return v === undefined || v === null || v === ("" as unknown as T) ? "—" : v;
}

// Fila de la tabla, en las mismas claves que usa TRADE_COLUMNS (traducidas desde Trade del backend)
type Row = {
  id: string;
  openTime: string;
  position: string;
  symbol: string;
  type: string; // 'buy' | 'sell'
  volume: number;
  openPrice: number;
  sl: string | number;
  tp: string | number;
  closeTime: string;
  closePrice: number;
  commission: number;
  swap: number;
  profit: number;
  pnl: number;
  raw: Trade;
};

function tradeToRow(t: Trade): Row {
  const pnl = t.pnl_neto !== null && t.pnl_neto !== undefined ? t.pnl_neto : t.pnl_bruto + t.commission + t.swap;
  return {
    id: t.id,
    openTime: t.entry_time ? t.entry_time.replace("T", " ") : "—",
    position: t.position || "—",
    symbol: t.symbol,
    type: t.direction === "long" ? "buy" : "sell",
    volume: t.quantity,
    openPrice: t.entry_price,
    sl: t.sl ?? "—",
    tp: t.tp ?? "—",
    closeTime: t.exit_time ? t.exit_time.replace("T", " ") : "—",
    closePrice: t.exit_price,
    commission: t.commission,
    swap: t.swap,
    profit: t.pnl_bruto,
    pnl,
    raw: t,
  };
}

function loadColumnPrefs(): Record<ColKey, boolean> {
  const prefs = {} as Record<ColKey, boolean>;
  TRADE_COLUMNS.forEach((c) => (prefs[c.key] = true));
  if (typeof window === "undefined") return prefs;
  try {
    const raw = localStorage.getItem("trademind_columns");
    if (raw) {
      const saved = JSON.parse(raw);
      Object.keys(saved).forEach((k) => {
        if (k in prefs) prefs[k as ColKey] = !!saved[k];
      });
    }
  } catch {
    /* ignora */
  }
  return prefs;
}

function tradeDurationLabel(t: Row): string {
  if (t.openTime === "—" || t.closeTime === "—") return "—";
  const open = new Date(t.openTime.replace(" ", "T"));
  const close = new Date(t.closeTime.replace(" ", "T"));
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return "—";
  let ms = close.getTime() - open.getTime();
  if (ms < 0) ms = 0;
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${m}m ${pad(s)}s`;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export default function DashboardPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewName>("dashboard");

  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoaded, setTradesLoaded] = useState(false);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"choices" | "manualForm">("choices");
  const [manualName, setManualName] = useState("");
  const [manualBalance, setManualBalance] = useState("");
  const [manualError, setManualError] = useState("");

  // Modal "Nueva cuenta"
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accModalName, setAccModalName] = useState("");
  const [accModalBalance, setAccModalBalance] = useState("");
  const [accModalError, setAccModalError] = useState("");

  // Vista Importar
  const [importBalance, setImportBalance] = useState("");
  const [importBalanceError, setImportBalanceError] = useState("");
  const [importStatus, setImportStatus] = useState<{ text: string; kind: "ok" | "err" | "" }>({ text: "", kind: "" });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal "Agregar / Editar trade"
  const [tmOpen, setTmOpen] = useState(false);
  const [tmEditingId, setTmEditingId] = useState<string | null>(null);
  const [tmOpenDT, setTmOpenDT] = useState("");
  const [tmCloseDT, setTmCloseDT] = useState("");
  const [tmPosition, setTmPosition] = useState("");
  const [tmSymbol, setTmSymbol] = useState("");
  const [tmType, setTmType] = useState("buy");
  const [tmVolume, setTmVolume] = useState("");
  const [tmOpenPrice, setTmOpenPrice] = useState("");
  const [tmSl, setTmSl] = useState("");
  const [tmTp, setTmTp] = useState("");
  const [tmClosePrice, setTmClosePrice] = useState("");
  const [tmCommission, setTmCommission] = useState("");
  const [tmSwap, setTmSwap] = useState("");
  const [tmProfit, setTmProfit] = useState("");
  const [tmPnl, setTmPnl] = useState("");
  const [tmPnlTouched, setTmPnlTouched] = useState(false);
  const [tmError, setTmError] = useState("");

  // Vista Trades: filtros, columnas, paginación
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [columnPrefs, setColumnPrefs] = useState<Record<ColKey, boolean>>(() => loadColumnPrefs());
  const [pageSize, setPageSize] = useState<"10" | "20" | "50" | "all">("10");
  const [tradesPage, setTradesPage] = useState(1);

  // Panel de detalle
  const [detailTrade, setDetailTrade] = useState<Row | null>(null);

  // Modal de confirmación genérico
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    okLabel: string;
    onOk: (() => void) | null;
  }>({ open: false, title: "", message: "", okLabel: "Eliminar", onOk: null });

  function askConfirm(message: string, title: string, onOk: () => void, okLabel = "Eliminar") {
    setConfirm({ open: true, title, message, okLabel, onOk });
  }
  function closeConfirm() {
    setConfirm((c) => ({ ...c, open: false }));
  }

  const currentAccount = accounts.find((a) => a.id === currentAccountId) || null;

  async function authedFetch(path: string, options: RequestInit = {}) {
    const t = token || localStorage.getItem("token");
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${t}`,
      },
    });
  }

  async function loadAccounts() {
    const res = await authedFetch("/accounts/");
    if (!res.ok) {
      router.push("/login");
      return;
    }
    const data: Account[] = await res.json();
    setAccounts(data);

    if (data.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
      const saved = localStorage.getItem("trademind_current_account");
      const stillExists = data.find((a) => a.id === saved);
      setCurrentAccountId(stillExists ? saved : data[0].id);
    }
    setLoading(false);
  }

  async function loadTrades(accountId: string) {
    const res = await authedFetch(`/trades/?account_id=${accountId}`);
    if (!res.ok) return;
    const data: Trade[] = await res.json();
    setTrades(data);
    setTradesLoaded(true);
  }

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.push("/login");
      return;
    }
    setToken(t);
  }, []);

  // Cargar tema guardado
  useEffect(() => {
    const savedTheme = localStorage.getItem("trademind_theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  useEffect(() => {
    if (token) loadAccounts();
  }, [token]);

  useEffect(() => {
    if (currentAccountId) {
      setTradesLoaded(false);
      loadTrades(currentAccountId);
    } else {
      setTrades([]);
    }
  }, [currentAccountId]);

  useEffect(() => {
    if (view === "import") {
      setImportBalanceError("");
      setImportStatus({ text: "", kind: "" });
    }
  }, [view]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setTmOpen(false);
      setDetailTrade(null);
      closeConfirm();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function switchAccount(id: string) {
    setCurrentAccountId(id);
    localStorage.setItem("trademind_current_account", id);
    setView("dashboard");
  }

  async function createAccount(name: string, balance: number, source: "manual" | "csv") {
    const res = await authedFetch("/accounts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Mi cuenta", initial_balance: balance, currency: "USD", source }),
    });
    if (!res.ok) throw new Error("No se pudo crear la cuenta");
    const acc: Account = await res.json();
    setAccounts((prev) => [...prev, acc]);
    switchAccount(acc.id);
    return acc;
  }

  function handleChoiceImport() {
    setShowOnboarding(false);
    setView("import");
  }
  function handleChoiceManual() {
    setOnboardingStep("manualForm");
  }

  async function handleManualSubmit() {
    const balance = parseFloat(manualBalance);
    if (!manualBalance || isNaN(balance) || balance < 0) {
      setManualError("Ingresa un balance inicial válido (0 o mayor).");
      return;
    }
    try {
      await createAccount(manualName.trim() || "Mi cuenta", balance, "manual");
      setShowOnboarding(false);
    } catch {
      setManualError("Ocurrió un error creando la cuenta. Intenta de nuevo.");
    }
  }

  function openNewAccountModal() {
    setAccModalName("");
    setAccModalBalance("");
    setAccModalError("");
    setAccModalOpen(true);
  }
  function readAccModalForm(): { name: string; balance: number } | null {
    const balance = parseFloat(accModalBalance);
    if (!accModalBalance || isNaN(balance) || balance < 0) {
      setAccModalError("Ingresa un balance inicial válido (0 o mayor).");
      return null;
    }
    return { name: accModalName.trim() || "Mi cuenta", balance };
  }
  async function handleAccModalCreate() {
    const data = readAccModalForm();
    if (!data) return;
    await createAccount(data.name, data.balance, "manual");
    setAccModalOpen(false);
  }
  async function handleAccModalImportLink() {
    const data = readAccModalForm();
    if (!data) return;
    await createAccount(data.name, data.balance, "csv");
    setAccModalOpen(false);
    setView("import");
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    let accountId = currentAccountId;

    if (!accountId) {
      const balance = parseFloat(importBalance);
      if (!importBalance || isNaN(balance) || balance < 0) {
        setImportBalanceError("Ingresa un balance inicial válido (0 o mayor) antes de subir el archivo.");
        return;
      }
      setImportBalanceError("");
      try {
        const acc = await createAccount("Cuenta importada", balance, "csv");
        accountId = acc.id;
      } catch {
        setImportStatus({ text: "No se pudo crear la cuenta. Intenta de nuevo.", kind: "err" });
        return;
      }
    }

    setImportStatus({ text: "Leyendo archivo…", kind: "" });
    const formData = new FormData();
    formData.append("file", file);

    const res = await authedFetch(`/trades/upload?account_id=${accountId}`, { method: "POST", body: formData });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: "Error al procesar el archivo." }));
      setImportStatus({ text: body.detail || "Error al procesar el archivo.", kind: "err" });
      return;
    }

    const data = await res.json();
    setImportStatus({ text: `${data.trades_guardados} operación(es) cargadas correctamente.`, kind: "ok" });
    if (accountId === currentAccountId) loadTrades(accountId);
    setView("trades");
  }

  function tmResetForm() {
    setTmEditingId(null);
    setTmPosition("");
    setTmSymbol("");
    setTmType("buy");
    setTmVolume("");
    setTmOpenPrice("");
    setTmSl("");
    setTmTp("");
    setTmClosePrice("");
    setTmCommission("");
    setTmSwap("");
    setTmProfit("");
    setTmPnl("");
    setTmPnlTouched(false);
    setTmError("");
    const now = nowLocalDateTimeValue();
    setTmOpenDT(now);
    setTmCloseDT(now);
  }

  function openAddTradeModal() {
    tmResetForm();
    setTmOpen(true);
  }

  function openEditTradeModal(t: Trade) {
    setTmEditingId(t.id);
    setTmPosition(t.position || "");
    setTmSymbol(t.symbol);
    setTmType(t.direction === "long" ? "buy" : "sell");
    setTmVolume(String(t.quantity));
    setTmOpenDT(t.entry_time || nowLocalDateTimeValue());
    setTmOpenPrice(String(t.entry_price));
    setTmSl(t.sl !== null ? String(t.sl) : "");
    setTmTp(t.tp !== null ? String(t.tp) : "");
    setTmCloseDT(t.exit_time || nowLocalDateTimeValue());
    setTmClosePrice(String(t.exit_price));
    setTmCommission(String(t.commission));
    setTmSwap(String(t.swap));
    setTmProfit(String(t.pnl_bruto));
    if (t.pnl_neto !== null && t.pnl_neto !== undefined) {
      setTmPnl(String(t.pnl_neto));
      setTmPnlTouched(true);
    } else {
      setTmPnl("");
      setTmPnlTouched(false);
    }
    setTmError("");
    setTmOpen(true);
  }

  function recalcNeto(c: string, s: string, p: string) {
    if (tmPnlTouched) return;
    const total = (parseFloat(c) || 0) + (parseFloat(s) || 0) + (parseFloat(p) || 0);
    setTmPnl(total.toFixed(2));
  }

  async function handleTmSave() {
    const symbol = tmSymbol.trim().toUpperCase();
    if (!symbol) {
      setTmError("El símbolo es obligatorio.");
      return;
    }
    if (!tmOpenDT) {
      setTmError("La fecha de apertura es obligatoria.");
      return;
    }
    if (!currentAccountId) {
      setTmError("No hay una cuenta activa seleccionada.");
      return;
    }
    setTmError("");

    const num = (v: string) => (v === "" ? 0 : parseFloat(v) || 0);
    const closeVal = tmCloseDT || tmOpenDT;
    const position = tmPosition.trim() || (tmEditingId ? tmPosition : String(Date.now()).slice(-9));

    const body: Record<string, unknown> = {
      position,
      symbol,
      direction: tmType === "buy" ? "long" : "short",
      quantity: num(tmVolume),
      entry_price: num(tmOpenPrice),
      exit_price: num(tmClosePrice),
      entry_time: tmOpenDT,
      exit_time: closeVal,
      sl: num(tmSl) || null,
      tp: num(tmTp) || null,
      commission: num(tmCommission),
      swap: num(tmSwap),
      pnl_bruto: num(tmProfit),
      pnl_neto: tmPnlTouched ? num(tmPnl) : null,
    };

    let res: Response;
    if (tmEditingId) {
      res = await authedFetch(`/trades/${tmEditingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await authedFetch("/trades/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: currentAccountId, ...body }),
      });
    }

    if (!res.ok) {
      setTmError("No se pudo guardar el trade. Verifica los datos.");
      return;
    }

    setTmOpen(false);
    if (currentAccountId) loadTrades(currentAccountId);
  }

  async function handleDeleteTrade(t: Trade) {
    const parts = [t.symbol, t.entry_time || ""].filter(Boolean).join(" · ");
    askConfirm(
      `¿Seguro que quieres eliminar este trade${parts ? ` (${parts})` : ""}? Esta acción no se puede deshacer.`,
      "Eliminar trade",
      async () => {
        await authedFetch(`/trades/${t.id}`, { method: "DELETE" });
        closeConfirm();
        if (currentAccountId) loadTrades(currentAccountId);
      }
    );
  }

  async function handleDeleteAllTrades() {
    if (trades.length === 0) return;
    askConfirm(
      `¿Seguro que quieres eliminar TODAS las operaciones (${trades.length}) de esta cuenta? Esta acción no se puede deshacer.`,
      "Eliminar todas las operaciones",
      async () => {
        await Promise.all(trades.map((t) => authedFetch(`/trades/${t.id}`, { method: "DELETE" })));
        closeConfirm();
        if (currentAccountId) loadTrades(currentAccountId);
      }
    );
  }

  function toggleColumn(key: ColKey, checked: boolean) {
    setColumnPrefs((prev) => {
      const next = { ...prev, [key]: checked };
      try {
        localStorage.setItem("trademind_columns", JSON.stringify(next));
      } catch {
        /* ignora */
      }
      return next;
    });
  }

  function clearFilters() {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterType("");
    setFilterSymbol("");
    setPageSize("10");
    setTradesPage(1);
  }

  // ---- Filas visibles según filtros/paginación ----
  const allRows = useMemo(() => trades.map(tradeToRow), [trades]);

  const symbolOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.symbol));
    return [{ value: "", label: "Todos" }, ...Array.from(set).map((s) => ({ value: s, label: s }))];
  }, [allRows]);

  const filteredRows = useMemo(() => {
    return allRows
      .filter((r) => {
        if (filterType && r.type !== filterType) return false;
        if (filterSymbol && r.symbol !== filterSymbol) return false;
        const d = r.openTime.slice(0, 10);
        if (filterDateFrom && d && d < filterDateFrom) return false;
        if (filterDateTo && d && d > filterDateTo) return false;
        return true;
      })
      .sort((a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime());
  }, [allRows, filterType, filterSymbol, filterDateFrom, filterDateTo]);

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredRows.length / parseInt(pageSize, 10)));
  const safePage = Math.min(Math.max(tradesPage, 1), totalPages);
  const pageRows =
    pageSize === "all"
      ? filteredRows
      : filteredRows.slice((safePage - 1) * parseInt(pageSize, 10), safePage * parseInt(pageSize, 10));

  const visibleCols = TRADE_COLUMNS.filter((c) => columnPrefs[c.key]);

  if (loading) {
    return <div style={{ padding: 40, color: "#8E93A6", fontFamily: "sans-serif" }}>Cargando...</div>;
  }

  const importTitle = currentAccount
    ? currentAccount.source === "csv"
      ? "Importar reporte de MT5"
      : "Importar trades manualmente"
    : "Importar reporte de MT5";

  return (
    <>
      {/* ---------- ONBOARDING ---------- */}
      {showOnboarding && (
        <div id="onboarding" className="onboarding" style={{ display: "flex" }}>
          <div className="onboarding-wrap">
            <div className="onboarding-brand">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M20 4c-7 0-11 5-11 11 0 3 1 5 2 7-1 2-2 4-2 6 0 5 4 8 9 8V4z" fill="var(--pink)" />
                <path d="M20 4c7 0 11 5 11 11 0 3-1 5-2 7 1 2 2 4 2 6 0 5-4 8-9 8V4z" fill="var(--teal)" />
              </svg>
              <span>TradeMind</span>
            </div>
            <h1>Configura tu cuenta para comenzar</h1>
            <p>Elige cómo quieres empezar a ver tus estadísticas de trading.</p>

            {onboardingStep === "choices" && (
              <div className="onboarding-choices">
                <button type="button" className="onboarding-choice" onClick={handleChoiceImport}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 15V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3>Importar desde CSV/Excel</h3>
                  <p>Sube tu reporte de MT5 (.csv o .xlsx) y calculamos tus estadísticas automáticamente.</p>
                </button>
                <button type="button" className="onboarding-choice" onClick={handleChoiceManual}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <h3>Crear cuenta manual</h3>
                  <p>Define un balance inicial y empieza desde cero. Podrás importar tus operaciones después.</p>
                </button>
              </div>
            )}

            {onboardingStep === "manualForm" && (
              <div className="onboarding-form">
                <label htmlFor="manualAccName">Nombre de la cuenta</label>
                <input type="text" id="manualAccName" placeholder="Mi cuenta MT5" maxLength={60} value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <label htmlFor="manualAccBalance">Balance inicial</label>
                <input type="number" id="manualAccBalance" placeholder="10000" min={0} step="0.01" value={manualBalance} onChange={(e) => setManualBalance(e.target.value)} />
                <div className="onboarding-error">{manualError}</div>
                <div className="onboarding-form-actions">
                  <button type="button" className="pill" onClick={() => setOnboardingStep("choices")}>Atrás</button>
                  <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={handleManualSubmit}>
                    Crear cuenta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- APP SHELL ---------- */}
      {!showOnboarding && (
        <div id="appShell">
          <header>
            <div className="brand">
              <svg className="brand-icon" viewBox="0 0 40 40" fill="none">
                <path d="M20 4c-7 0-11 5-11 11 0 3 1 5 2 7-1 2-2 4-2 6 0 5 4 8 9 8V4z" fill="var(--pink)" />
                <path d="M20 4c7 0 11 5 11 11 0 3-1 5-2 7 1 2 2 4 2 6 0 5-4 8-9 8V4z" fill="var(--teal)" />
                <path d="M14 14l3 3-2 3 3 3-2 3" stroke="#05060B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M26 14l-3 3 2 3-3 3 2 3" stroke="#05060B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
              <div>
                <h1>TradeMind</h1>
                <small>Dashboard</small>
              </div>
            </div>
            <div className="hdr-mid">
              <button className="icon-btn" title="Moneda" style={{ width: "auto", padding: "0 9px" }}>
                $
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Filtros
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                Rango de fechas
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.6" /><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" strokeWidth="1.6" /></svg>
                <span id="datasourcePill">{currentAccount ? (currentAccount.source === "csv" ? "MT5 importado" : currentAccount.name) : "Sin cuenta"}</span>
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <span className="pill accent">✦ Preguntar a la IA</span>
            </div>
            <div className="hdr-right">
              <button className="pill" style={{ background: "#fff", color: "#0A0B12", borderColor: "#fff", fontWeight: 700 }}>Iniciar mi semana</button>
              {/* Toggle de tema. Ocupa el lugar del botón "Ajustes" del HTML original
                  (que no hacía nada) para no alterar el ancho de .hdr-right: el header
                  usa justify-content:space-between, así que cualquier botón extra
                  desplaza los botones centrales. */}
              <button
                className="icon-btn"
                title="Cambiar tema"
                onClick={() => {
                  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
                  document.documentElement.setAttribute("data-theme", next);
                  localStorage.setItem("trademind_theme", next);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="icon-btn" title="Cuenta">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" /><path d="M5 20c1.3-3.4 4-5 7-5s5.7 1.6 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
              </div>
          </header>

          <nav className="nav">
            <button className={view === "dashboard" ? "active" : ""} title="Resumen" onClick={() => setView("dashboard")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>
              <span>Resumen</span>
            </button>
            <button className={view === "trades" ? "active" : ""} title="Trades" onClick={() => setView("trades")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="7" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M6 3v4M6 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="12" y="7" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M14 2v5M14 15v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="18" y="8" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M20 5v3M20 14v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              <span>Trades</span>
            </button>
            <button className={view === "accounts" ? "active" : ""} title="Cuentas" onClick={() => setView("accounts")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="6" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.7" /><path d="M6 14.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <span>Cuentas</span>
            </button>
            <button className={view === "analytics" ? "active" : ""} title="Analytics" onClick={() => setView("analytics")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="10" y="6" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="16" y="9" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.7" /></svg>
              <span>Analytics</span>
            </button>
          </nav>

          <main>
            {/* ---- Vista Resumen ---- */}
            <div className={`view ${view === "dashboard" ? "active" : ""}`}>
              <SummaryView trades={trades} initialBalance={currentAccount ? currentAccount.initial_balance : null} />
            </div>

            {/* ---- Vista Trades ---- */}
            <div className={`view ${view === "trades" ? "active" : ""}`}>
              <div className="panel">
                <h2>
                  Historial de operaciones{" "}
                  <span>
                    {pageRows.length < filteredRows.length
                      ? `${pageRows.length} de ${filteredRows.length} operaciones`
                      : `${filteredRows.length} operaciones`}
                  </span>
                </h2>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, position: "relative", flexWrap: "wrap" }}>
                  <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={openAddTradeModal}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    Agregar trade
                  </button>
                  <button type="button" className="pill" onClick={() => setView("import")}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    Importar Manualmente
                  </button>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", marginLeft: "auto" }}>
                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setFiltersOpen((v) => !v)}>
                        <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        Filtros
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {filtersOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, zIndex: 20, minWidth: 250, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Fecha desde</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfDate value={filterDateFrom} onChange={setFilterDateFrom} />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Fecha hasta</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfDate value={filterDateTo} onChange={setFilterDateTo} />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Tipo</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfSelect
                              value={filterType}
                              onChange={setFilterType}
                              options={[{ value: "", label: "Todos" }, { value: "buy", label: "Compra" }, { value: "sell", label: "Venta" }]}
                            />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>Símbolo</div>
                          <div style={{ marginBottom: 12 }}>
                            <CfSelect value={filterSymbol} onChange={setFilterSymbol} options={symbolOptions} />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="pill" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setTradesPage(1); setFiltersOpen(false); }}>
                              Aplicar
                            </button>
                            <button type="button" className="pill" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterType(""); setFilterSymbol(""); setFiltersOpen(false); }}>
                              Limpiar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setPageSizeOpen((v) => !v)}>
                        Mostrar: {pageSize === "all" ? "Todos" : pageSize}
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {pageSizeOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 6, zIndex: 20, minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                          {(["10", "20", "50", "all"] as const).map((s) => (
                            <button key={s} type="button" className="pill" style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "transparent", marginBottom: 2 }}
                              onClick={() => { setPageSize(s); setTradesPage(1); setPageSizeOpen(false); }}>
                              {s === "all" ? "Todos" : `${s} Trades`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setColsOpen((v) => !v)}>
                        <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                        Columnas
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {colsOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, zIndex: 20, minWidth: 210, boxShadow: "0 8px 24px rgba(0,0,0,.5)", maxHeight: 320, overflowY: "auto" }}>
                          {TRADE_COLUMNS.map((c) => (
                            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 12.5, color: "var(--text)", cursor: "pointer" }}>
                              <input type="checkbox" checked={columnPrefs[c.key]} onChange={(e) => toggleColumn(c.key, e.target.checked)} />
                              {c.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="button" className="pill" title="Restablece filtros, cantidad mostrada y columnas" onClick={clearFilters}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      Limpiar filtros
                    </button>
                    <button type="button" className="pill" title="Elimina todas las operaciones de esta cuenta" style={{ color: "var(--red)", borderColor: "rgba(255,77,109,.35)" }} onClick={handleDeleteAllTrades}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0v12a2 2 0 002 2h4a2 2 0 002-2V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Eliminar trades
                    </button>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="trades-table">
                    <thead>
                      <tr>
                        {visibleCols.length ? visibleCols.map((c) => <th key={c.key}>{c.label}</th>) : <th>—</th>}
                        <th className="td-eye-col" />
                      </tr>
                    </thead>
                    <tbody>
                      {!tradesLoaded ? (
                        <tr><td colSpan={visibleCols.length + 1} style={{ padding: 20, color: "var(--muted)" }}>Cargando…</td></tr>
                      ) : pageRows.length === 0 ? (
                        <tr><td colSpan={visibleCols.length + 1} style={{ padding: 20, color: "var(--muted)" }}>No hay operaciones para mostrar.</td></tr>
                      ) : (
                        pageRows.map((r) => {
                          const color = r.pnl > 0 ? "var(--green)" : r.pnl < 0 ? "var(--red)" : "var(--muted)";
                          return (
                            <tr key={r.id}>
                              {visibleCols.map((c) => {
                                if (c.key === "type") {
                                  return (
                                    <td key={c.key}>
                                      <span className={`type-tag ${r.type === "sell" ? "sell" : "buy"}`}>{r.type}</span>
                                    </td>
                                  );
                                }
                                if (c.key === "pnl") {
                                  return (
                                    <td key={c.key} style={{ color, fontWeight: 600 }}>
                                      {fmtMoneyFull(r.pnl)}
                                    </td>
                                  );
                                }
                                if (c.money) {
                                  return <td key={c.key}>{fmtMoneyFull(r[c.key] as number)}</td>;
                                }
                                return <td key={c.key}>{dashOr(r[c.key] as string | number)}</td>;
                              })}
                              <td className="td-eye-col">
                                <span className="td-row-actions">
                                  <button type="button" className="eye-btn delete-btn" aria-label="Eliminar trade" onClick={() => handleDeleteTrade(r.raw)}>
                                    <DeleteIcon />
                                  </button>
                                  <button type="button" className="eye-btn pencil-btn" aria-label="Editar trade" onClick={() => openEditTradeModal(r.raw)}>
                                    <PencilIcon />
                                  </button>
                                  <button type="button" className="eye-btn" aria-label="Ver detalle" onClick={() => setDetailTrade(r)}>
                                    <EyeIcon />
                                  </button>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {pageSize !== "all" && totalPages > 1 && (
                  <div className="trades-pagination" style={{ display: "flex" }}>
                    <button type="button" className="tp-btn" disabled={safePage <= 1} onClick={() => setTradesPage((p) => p - 1)}>‹ Anterior</button>
                    <span>Página {safePage} de {totalPages}</span>
                    <button type="button" className="tp-btn" disabled={safePage >= totalPages} onClick={() => setTradesPage((p) => p + 1)}>Siguiente ›</button>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Vista Cuentas ---- */}
            <div className={`view ${view === "accounts" ? "active" : ""}`}>
              <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
                <h2>Cuentas <span>{accounts.length ? `${accounts.length} cuenta${accounts.length > 1 ? "s" : ""}` : ""}</span></h2>
                <p className="mini-note" style={{ marginBottom: 14, fontSize: "12.5px" }}>
                  Puedes llevar varias cuentas (por ejemplo, manual y MT5 importada) y cambiar entre ellas en cualquier momento.
                  Los trades de cada cuenta se guardan por separado.
                </p>
                <div className="acc-list">
                  {accounts.length === 0 && <div className="mini-note">Aún no tienes cuentas creadas.</div>}
                  {accounts.map((a) => {
                    const active = a.id === currentAccountId;
                    return (
                      <div className={`acc-item${active ? " active" : ""}`} key={a.id}>
                        <div>
                          <div className="acc-name">
                            {a.name}
                            {active && <span className="acc-badge">Actual</span>}
                          </div>
                          <div className="acc-sub">{a.source === "csv" ? "MT5 importado" : "Manual"} · Depósito inicial ${a.initial_balance.toFixed(2)}</div>
                        </div>
                        {!active && (
                          <button type="button" className="pill acc-switch-btn" onClick={() => switchAccount(a.id)}>Usar esta cuenta</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button className="pill" style={{ marginTop: 16, background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={openNewAccountModal}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  Nueva cuenta
                </button>
              </div>
            </div>

            {/* ---- Vista Analytics ---- */}
            <div className={`view ${view === "analytics" ? "active" : ""}`}>
              <AnalyticsView trades={trades} />
            </div>

            {/* ---- Vista Importar ---- */}
            <div className={`view ${view === "import" ? "active" : ""}`}>
              <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
                <h2>{importTitle}</h2>
                <p className="mini-note" style={{ marginBottom: 14, fontSize: "12.5px" }}>
                  Exporta tu &quot;Trade History Report&quot; desde MetaTrader 5 (botón derecho sobre el historial → Report →
                  Save as CSV o Guardar como .xlsx) y súbelo aquí. También puedes subir la plantilla de{" "}
                  <button
                    type="button"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = "/plantilla_trademind.xlsx";
                      a.download = "plantilla_trademind.xlsx";
                      a.click();
                    }}
                    style={{ color: "var(--teal)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
                  >
                    Importar Manualmente
                  </button>{" "}
                  ya llena: la detecto automáticamente y agrego esos trades a tu cuenta.
                </p>

                {!currentAccount && (
                  <div className="tm-field full" style={{ marginBottom: 14 }}>
                    <label htmlFor="importBalance">Balance inicial de la cuenta</label>
                    <input type="number" id="importBalance" placeholder="10000" min={0} step="0.01" value={importBalance} onChange={(e) => setImportBalance(e.target.value)} />
                    <div className="tm-error" style={{ marginTop: 6 }}>{importBalanceError}</div>
                  </div>
                )}

                <label
                  className={`upload-box${dragOver ? " drag" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                >
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  <p><b>Haz clic para elegir un archivo</b> o arrástralo aquí</p>
                  <p>Formato .csv, .xlsx o .xls</p>
                </label>
                <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} onChange={(e) => handleFile(e.target.files?.[0])} />
                {importStatus.text && <div className={`status ${importStatus.kind}`} style={{ marginTop: 12 }}>{importStatus.text}</div>}
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ---------- Panel de detalle del trade ---------- */}
      <div className={`td-overlay${detailTrade ? " open" : ""}`} onClick={() => setDetailTrade(null)} />
      <div className={`td-panel${detailTrade ? " open" : ""}`}>
        <div className="td-head">
          <h3>Detalle de la operación</h3>
          <button type="button" className="td-close" aria-label="Cerrar" onClick={() => setDetailTrade(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="td-body">
          {detailTrade && (
            <>
              <div className="td-section">
                <div className="td-section-title">Resumen</div>
                <div className="td-card td-grid">
                  <div className="td-field">
                    <div className="lbl">Símbolo</div>
                    <div className="val">
                      {detailTrade.symbol}
                      <span className={`type-tag ${detailTrade.type === "sell" ? "sell" : "buy"}`} style={{ marginLeft: 6 }}>{detailTrade.type}</span>
                    </div>
                  </div>
                  <div className="td-field"><div className="lbl">Volumen</div><div className="val">{dashOr(detailTrade.volume)}</div></div>
                  <div className="td-field"><div className="lbl">Precio apertura</div><div className="val">{dashOr(detailTrade.openPrice)}</div></div>
                  <div className="td-field"><div className="lbl">Precio cierre</div><div className="val">{dashOr(detailTrade.closePrice)}</div></div>
                  <div className="td-field"><div className="lbl">Apertura</div><div className="val">{detailTrade.openTime}</div></div>
                  <div className="td-field"><div className="lbl">Cierre</div><div className="val">{detailTrade.closeTime}</div></div>
                </div>
              </div>
              <div className="td-section">
                <div className="td-section-title">Resumen de P&amp;L</div>
                <div className="td-card">
                  <div className="td-row2"><span className="lbl">Beneficio</span><span className="val">{fmtMoneyFull(detailTrade.profit)}</span></div>
                  <div className="td-row2"><span className="lbl">Comisión</span><span className="val">{fmtMoneyFull(detailTrade.commission)}</span></div>
                  <div className="td-row2"><span className="lbl">Swap</span><span className="val">{fmtMoneyFull(detailTrade.swap)}</span></div>
                  <div className="td-divider" />
                  <div className="td-row2 td-net">
                    <span className="lbl">Neto</span>
                    <span className="val" style={{ color: detailTrade.pnl > 0 ? "var(--green)" : detailTrade.pnl < 0 ? "var(--red)" : "var(--muted)" }}>
                      {fmtMoneyFull(detailTrade.pnl)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="td-section">
                <div className="td-section-title">Detalles</div>
                <div className="td-card">
                  <div className="td-row2"><span className="lbl">Posición (Trade ID)</span><span className="val">{detailTrade.position}</span></div>
                  <div className="td-row2"><span className="lbl">Duración</span><span className="val">{tradeDurationLabel(detailTrade)}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- Modal "Nueva cuenta" ---------- */}
      <div className={`tm-overlay${accModalOpen ? " open" : ""}`}>
        <div className="tm-modal" style={{ maxWidth: 400 }}>
          <div className="tm-head">
            <h3>Nueva cuenta</h3>
            <button type="button" className="tm-close" aria-label="Cerrar" onClick={() => setAccModalOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-field full" style={{ marginBottom: 14 }}>
            <label htmlFor="accModalName">Nombre de la cuenta</label>
            <input type="text" id="accModalName" placeholder="Mi cuenta MT5" maxLength={60} value={accModalName} onChange={(e) => setAccModalName(e.target.value)} />
          </div>
          <div className="tm-field full">
            <label htmlFor="accModalBalance">Balance inicial</label>
            <input type="number" id="accModalBalance" placeholder="10000" min={0} step="0.01" value={accModalBalance} onChange={(e) => setAccModalBalance(e.target.value)} />
          </div>
          <div className="tm-error">{accModalError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={() => setAccModalOpen(false)}>Cancelar</button>
            <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700, flex: 2 }} onClick={handleAccModalCreate}>
              Crear cuenta
            </button>
          </div>
          <p className="mini-note" style={{ marginTop: 14, textAlign: "center" }}>
            ¿Quieres importarla desde MT5 en vez de crearla manual?{" "}
            <span style={{ color: "var(--teal)", cursor: "pointer", textDecoration: "underline" }} onClick={handleAccModalImportLink}>
              Importar CSV como cuenta nueva
            </span>
          </p>
        </div>
      </div>

      {/* ---------- Modal "Agregar / Editar trade" ---------- */}
      <div className={`tm-overlay${tmOpen ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setTmOpen(false); }}>
        <div className="tm-modal">
          <div className="tm-head">
            <h3>{tmEditingId ? "Editar trade" : "Agregar trade"}</h3>
            <button type="button" className="tm-close" aria-label="Cerrar" onClick={() => setTmOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-grid">
            <div className="tm-field"><label>Apertura</label><CfDateTime value={tmOpenDT} onChange={setTmOpenDT} /></div>
            <div className="tm-field"><label htmlFor="tmPosition">Posición</label><input type="text" id="tmPosition" placeholder="Auto" value={tmPosition} onChange={(e) => setTmPosition(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmSymbol">Símbolo</label><input type="text" id="tmSymbol" placeholder="EURUSD" value={tmSymbol} onChange={(e) => setTmSymbol(e.target.value)} /></div>
            <div className="tm-field"><label>Tipo</label><CfSelect value={tmType} onChange={setTmType} options={TM_TYPE_OPTIONS} /></div>
            <div className="tm-field"><label htmlFor="tmVolume">Volumen</label><input type="number" id="tmVolume" step="0.01" placeholder="0.10" value={tmVolume} onChange={(e) => setTmVolume(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmOpenPrice">Precio apertura</label><input type="number" id="tmOpenPrice" step="any" placeholder="0.00000" value={tmOpenPrice} onChange={(e) => setTmOpenPrice(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmSl">S/L</label><input type="number" id="tmSl" step="any" placeholder="0.00000" value={tmSl} onChange={(e) => setTmSl(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmTp">T/P</label><input type="number" id="tmTp" step="any" placeholder="0.00000" value={tmTp} onChange={(e) => setTmTp(e.target.value)} /></div>
            <div className="tm-field"><label>Cierre</label><CfDateTime value={tmCloseDT} onChange={setTmCloseDT} /></div>
            <div className="tm-field"><label htmlFor="tmClosePrice">Precio cierre</label><input type="number" id="tmClosePrice" step="any" placeholder="0.00000" value={tmClosePrice} onChange={(e) => setTmClosePrice(e.target.value)} /></div>
            <div className="tm-field">
              <label htmlFor="tmCommission">Comisión</label>
              <input type="number" id="tmCommission" step="0.01" placeholder="0.00" value={tmCommission} onChange={(e) => { setTmCommission(e.target.value); recalcNeto(e.target.value, tmSwap, tmProfit); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmSwap">Swap</label>
              <input type="number" id="tmSwap" step="0.01" placeholder="0.00" value={tmSwap} onChange={(e) => { setTmSwap(e.target.value); recalcNeto(tmCommission, e.target.value, tmProfit); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmProfit">Beneficio</label>
              <input type="number" id="tmProfit" step="0.01" placeholder="0.00" value={tmProfit} onChange={(e) => { setTmProfit(e.target.value); recalcNeto(tmCommission, tmSwap, e.target.value); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmPnl">Neto</label>
              <input type="number" id="tmPnl" step="0.01" placeholder="0.00" value={tmPnl} onChange={(e) => { setTmPnl(e.target.value); setTmPnlTouched(true); }} />
            </div>
          </div>
          <div className="tm-error">{tmError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={tmResetForm}>Limpiar</button>
            <button type="button" className="pill" onClick={() => setTmOpen(false)}>Cancelar</button>
            <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={handleTmSave}>
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Modal de confirmación genérico ---------- */}
      <div className={`tm-overlay${confirm.open ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
        <div className="tm-modal" style={{ maxWidth: 380 }}>
          <div className="tm-head"><h3>{confirm.title}</h3></div>
          <p className="mini-note" style={{ marginBottom: 16 }}>{confirm.message}</p>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={closeConfirm}>Cancelar</button>
            <button
              type="button"
              className="pill"
              style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)", fontWeight: 600 }}
              onClick={() => confirm.onOk && confirm.onOk()}
            >
              {confirm.okLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
