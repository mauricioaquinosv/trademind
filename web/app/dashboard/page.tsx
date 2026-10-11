"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CfDate, CfDateTime, CfSelect } from "../components/CfControls";
import SummaryView from "../components/SummaryView";
import AnalyticsView from "../components/AnalyticsView";
import AvisoImportacion from "../components/AvisoImportacion";
import { useI18n } from "../../lib/i18n/LocaleProvider";
import { errorDeApi } from "../../lib/i18n/apiErrors";
import LanguageSwitcher from "../../lib/i18n/LanguageSwitcher";
import type { TranslationKey } from "../../lib/i18n/config";

const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

type Account = {
  id: string;
  name: string;
  initial_balance: number;
  currency: string;
  source: string;
  /* Cuantas operaciones tiene. Lo envia el backend: aquÃ­ solo tenemos cargadas
     las operaciones de la cuenta activa, asÃ­ que contarlas en el cliente
     darÃ­a 0 para cualquier otra cuenta. */
  trade_count: number;
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

/* Se construye dentro del componente para poder traducir "Compra"/"Venta". */
function typeTradeOptions(t: (k: TranslationKey) => string) {
  return [
    { value: "buy", label: `${t("common.buy")} (buy)` },
    { value: "sell", label: `${t("common.sell")} (sell)` },
  ];
}

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

/* Las columnas guardan la CLAVE de traducciÃ³n, no el texto. El texto se
   resuelve dentro del componente con t(c.labelKey), porque una constante de
   mÃ³dulo no puede usar el hook de idioma. */
const TRADE_COLUMNS: { key: ColKey; labelKey: TranslationKey; money?: boolean }[] = [
  { key: "openTime", labelKey: "col.openTime" },
  { key: "position", labelKey: "col.position" },
  { key: "symbol", labelKey: "col.symbol" },
  { key: "type", labelKey: "col.type" },
  { key: "volume", labelKey: "col.volume" },
  { key: "openPrice", labelKey: "col.openPrice" },
  { key: "sl", labelKey: "col.sl" },
  { key: "tp", labelKey: "col.tp" },
  { key: "closeTime", labelKey: "col.closeTime" },
  { key: "closePrice", labelKey: "col.closePrice" },
  { key: "commission", labelKey: "col.commission", money: true },
  { key: "swap", labelKey: "col.swap", money: true },
  { key: "profit", labelKey: "col.profit", money: true },
  { key: "pnl", labelKey: "col.pnl", money: true },
];

function fmtMoneyFull(n: number | null | undefined) {
  const v = n || 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return sign + "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dashOr<T>(v: T | null | undefined) {
  return v === undefined || v === null || v === ("" as unknown as T) ? "â€”" : v;
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
    openTime: t.entry_time ? t.entry_time.replace("T", " ") : "â€”",
    position: t.position || "â€”",
    symbol: t.symbol,
    type: t.direction === "long" ? "buy" : "sell",
    volume: t.quantity,
    openPrice: t.entry_price,
    sl: t.sl ?? "â€”",
    tp: t.tp ?? "â€”",
    closeTime: t.exit_time ? t.exit_time.replace("T", " ") : "â€”",
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
  if (t.openTime === "â€”" || t.closeTime === "â€”") return "â€”";
  const open = new Date(t.openTime.replace(" ", "T"));
  const close = new Date(t.closeTime.replace(" ", "T"));
  if (isNaN(open.getTime()) || isNaN(close.getTime())) return "â€”";
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
  const { t } = useI18n();

  /* Columnas de la tabla con el texto ya resuelto al idioma actual. */
  const tradeColumns = useMemo(
    () => TRADE_COLUMNS.map((c) => ({ ...c, label: t(c.labelKey) })),
    [t],
  );

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
  /* Las operaciones que el backend no ha podido importar, tal cual vienen.
     Se guarda SIN traducir y se traduce al pintar, para que el aviso cambie de
     idioma si el usuario lo cambia mientras esta abierto. `null` = no hay
     aviso. Se guarda tambien cuantas se importaron y cuantas habia en el
     archivo, para poder decir "498 de 502" en el titular. */
  const [aviso, setAviso] = useState<{
    rechazos: unknown;
    repetidas: unknown;
    guardadas: number;
    leidas: number | null;
    archivoIdentico: boolean;
  } | null>(null);
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

  // Vista Trades: filtros, columnas, paginaciÃ³n
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  /* Menu del icono de usuario. Va en el icono de la cabecera porque era el
     unico hueco que quedaba libre sin mover el ancho de .hdr-right (ver el
     comentario del boton de tema, mas abajo). */
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  /* El email con el que se ha entrado. Antes solo se guardaba el token, y con
     el token no se puede saber que cuenta esta abierta: por eso hace falta
     guardarlo aparte al iniciar sesion. */
  const [emailSesion, setEmailSesion] = useState("");
  /* El ultimo archivo subido, en memoria. Lo necesita "borrar todo y volver a
     importar". */
  const [ultimoArchivo, setUltimoArchivo] = useState<File | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSymbol, setFilterSymbol] = useState("");
  const [columnPrefs, setColumnPrefs] = useState<Record<ColKey, boolean>>(() => loadColumnPrefs());
  const [pageSize, setPageSize] = useState<"10" | "20" | "50" | "all">("10");
  const [tradesPage, setTradesPage] = useState(1);

  // Panel de detalle
  const [detailTrade, setDetailTrade] = useState<Row | null>(null);

  // Modal de confirmaciÃ³n genÃ©rico
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    okLabel: string;
    onOk: (() => void) | null;
  }>({ open: false, title: "", message: "", okLabel: "", onOk: null });

  function askConfirm(message: string, title: string, onOk: () => void, okLabel?: string) {
    setConfirm({ open: true, title, message, okLabel: okLabel ?? t("common.delete"), onOk });
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

  /* ---------------------------------------------------------- */
  /* Sesion                                                      */
  /* ---------------------------------------------------------- */

  /* El email se lee al montar, no en cada render: leerlo cada vez
     seria trabajo innecesario, y guardarlo en un estado es lo que permite
     que aparezca en el menu. */
  useEffect(() => {
    setEmailSesion(localStorage.getItem("trademind_email") ?? "");
  }, []);

  /* El menu se cierra con Escape, como el resto de modales. Sin esto, en un
     ordenador compartido el menu se queda abierto al pasar al raton por
     encima, y el siguiente que lo use ve el boton de cerrar sesion. */
  useEffect(() => {
    if (!userMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [userMenuOpen]);

  /* Cerrar sesion es BORRAR la llave de este navegador. No hay nada que
     llamar al backend: el token es lo unico que autoriza, y mientras siga
     en localStorage la sesion sigue viva.

     Se borra tambien la cuenta activa. Si no, al volver a entrar, el
     dashboard se saltaria el onboarding y abriria una cuenta de otro
     usuario anterior. */
  function cerrarSesion() {
    setUserMenuOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("trademind_email");
    localStorage.removeItem("trademind_current_account");
    setToken(null);
    setEmailSesion("");
    setCurrentAccountId(null);
    router.push("/login");
  }

  function switchAccount(id: string) {
    setCurrentAccountId(id);
    localStorage.setItem("trademind_current_account", id);
    setView("dashboard");
  }

  async function createAccount(name: string, balance: number, source: "manual" | "csv") {
    const res = await authedFetch("/accounts/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || t("accounts.myAccount"), initial_balance: balance, currency: "USD", source }),
    });
    if (!res.ok) throw new Error(t("errors.accountCreateFailed"));
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
      setManualError(t("errors.invalidBalance"));
      return;
    }
    try {
      await createAccount(manualName.trim() || t("accounts.myAccount"), balance, "manual");
      setShowOnboarding(false);
    } catch {
      setManualError(t("errors.accountCreateError"));
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
      setAccModalError(t("errors.invalidBalance"));
      return null;
    }
    return { name: accModalName.trim() || t("accounts.myAccount"), balance };
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

  /* Borrar todo y volver a importar.
   *
   * Solo llega aqui cuando el backend ha dicho que el archivo es identico al que
   * ya habia, o sea que no se ha guardado nada nuevo. Por eso se puede ofrecer
   * sin miedo: lo que se borra se vuelve a poner igual.
   *
   * Aun asi se pide confirmacion, porque borra operaciones que el usuario puede
   * haber editado a mano (pnl_neto es editable). El aviso de por si es
   * descartable con la X; esto no. */
  function reemplazarTodo() {
    if (!ultimoArchivo) return;
    setConfirm({
      open: true,
      title: t("import.replaceAll"),
      message: t("import.replaceAllConfirm"),
      okLabel: t("import.replaceAll"),
      onOk: () => { void borrarTodoYVolverAImportar(); },
    });
  }

  async function borrarTodoYVolverAImportar() {
    if (!currentAccountId || !ultimoArchivo) return;
    /* El archivo se conserva en memoria porque, sin el, el boton no tendria nada
       que volver a subir: el <input type="file"> ya no lo tiene, el usuario no
       lo vuelve a elegir. */
    await authedFetch(`/trades?account_id=${currentAccountId}&todas=1`, { method: "DELETE" });
    await handleFile(ultimoArchivo);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    let accountId = currentAccountId;
    /* El aviso de la subida anterior se cierra al empezar otra: si no, se
       queda con las 4 operaciones del archivo viejo mientras el nuevo se sube. */
    setAviso(null);
    /* Se recuerda el archivo por si luego hay que volver a importarlo: el input
       de ficheros ya no lo tiene. */
    setUltimoArchivo(file);

    if (!accountId) {
      const balance = parseFloat(importBalance);
      if (!importBalance || isNaN(balance) || balance < 0) {
        setImportBalanceError(t("errors.invalidBalanceBeforeUpload"));
        return;
      }
      setImportBalanceError("");
      try {
        const acc = await createAccount(t("accounts.imported"), balance, "csv");
        accountId = acc.id;
      } catch {
        setImportStatus({ text: t("errors.accountCreateFailed"), kind: "err" });
        return;
      }
    }

    setImportStatus({ text: t("common.readingFile"), kind: "" });
    const formData = new FormData();
    formData.append("file", file);

    const res = await authedFetch(`/trades/upload?account_id=${accountId}`, { method: "POST", body: formData });

    if (!res.ok) {
      /* El backend manda un codigo, no un texto: se traduce aqui. Si la
         respuesta no es JSON (el backend cae y devuelve HTML), `.catch` deja
         `null` y sale el mensaje generico. */
      const cuerpo = await res.json().catch(() => null);
      setImportStatus({
        text: errorDeApi(cuerpo, t, t("errors.fileProcessing")),
        kind: "err",
      });
      return;
    }

    const data = await res.json();
    /* Si el backend ha dejado algo fuera, se guarda la lista para pintarla en
       el aviso. El mensaje de "N cargadas" NO se pone en `importStatus` cuando
       hay rechazos: dira solo las buenas y el usuario creera que se han
       importado todas. El aviso ya dice "498 de 502". */
    const hayRechazos = Array.isArray(data.rechazos) && data.rechazos.length > 0;
    const hayRepetidas = Array.isArray(data.ya_importadas) && data.ya_importadas.length > 0;
    setAviso(
      hayRechazos || hayRepetidas
        ? {
            rechazos: data.rechazos,
            repetidas: data.ya_importadas,
            guardadas: data.trades_guardados,
            // El backend solo manda `trades_leidos` cuando hay algo que avisar.
            // Si un dia dejara de mandarlo, se calcula con lo que hay.
            leidas: typeof data.trades_leidos === "number" ? data.trades_leidos : null,
            archivoIdentico: data.archivo_identico === true,
          }
        : null,
    );
    setImportStatus({
      text: hayRechazos
        ? t("import.why", { n: data.rechazos.length })
        : t("import.success", { n: data.trades_guardados }),
      kind: hayRechazos ? "" : "ok",
    });
    if (accountId === currentAccountId) loadTrades(accountId);
    setView("trades");
  }

  // Modal de ediciÃ³n de cuenta
  const [accEditId, setAccEditId] = useState<string | null>(null);
  const [accEditName, setAccEditName] = useState("");
  const [accEditBalance, setAccEditBalance] = useState("");
  const [accEditError, setAccEditError] = useState("");

  // Modal de borrado de cuenta
  const [accDeleteId, setAccDeleteId] = useState<string | null>(null);
  const [accDeleteError, setAccDeleteError] = useState("");
  const [accNotice, setAccNotice] = useState("");

  const accEditOpen = accEditId !== null;
  const accDeleteOpen = accDeleteId !== null;
  const accEnEdicion = accEditId ? accounts.find((a) => a.id === accEditId) ?? null : null;
  const accEnBorrado = accDeleteId ? accounts.find((a) => a.id === accDeleteId) ?? null : null;
  /* Sale de account.trade_count, no de la lista de trades del cliente: esa
     solo tiene la cuenta activa, y con ella el contador daba siempre 0. */
  const tradesDeAccEnBorrado = accEnBorrado?.trade_count ?? 0;

  function openAccEdit(id: string) {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    setAccEditId(id);
    setAccEditName(acc.name);
    setAccEditBalance(String(acc.initial_balance));
    setAccEditError("");
  }

  async function handleAccEditSave() {
    if (!accEditId) return;
    const balance = parseFloat(accEditBalance);
    if (!accEditName.trim()) {
      setAccEditError(t("errors.nameRequired"));
      return;
    }
    if (accEditBalance === "" || isNaN(balance) || balance < 0) {
      setAccEditError(t("errors.invalidBalance"));
      return;
    }
    try {
      const res = await authedFetch(`/accounts/${accEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: accEditName.trim(), initial_balance: balance }),
      });
      if (!res.ok) throw new Error("fallo");

      const idBorrada = accEditId;
      const actualizada: Account = await res.json();
      // Conservar el contador: la respuesta de PUT lo trae, pero si el backend
      // no lo devolviera se perderia y la cuenta pareceria vacia al borrarla.
      setAccounts((prev) =>
        prev.map((a) => (a.id === actualizada.id ? { ...actualizada, trade_count: actualizada.trade_count ?? a.trade_count } : a)),
      );
      setAccEditId(null);
      setAccNotice(t("accounts.wasUpdated"));
    } catch {
      setAccEditError(t("errors.accountUpdateFailed"));
    }
  }

  function openAccDelete(id: string) {
    setAccDeleteId(id);
    setAccDeleteError("");
  }

  async function handleAccDelete() {
    if (!accDeleteId) return;
    try {
      /* Se borra con las operaciones y ya. El modal de arriba ES la
         confirmacion: pedir una casilla ademas era un cerrojo de mas.
         delete_trades=true sigue siendo obligatorio en el backend (ahi si es
         una proteccion real, porque cualquiera puede llamar a la API), pero
         desde la interfaz se acepta con un clic. */
      const res = await authedFetch(`/accounts/${accDeleteId}?delete_trades=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        /* El 409 de borrar una cuenta con operaciones trae account_has_trades
           y el numero, que es justo lo que el usuario necesita para decidir. */
        const cuerpo = await res.json().catch(() => null);
        setAccDeleteError(errorDeApi(cuerpo, t, t("errors.accountDeleteFailed")));
        return;
      }

      const idBorrada = accDeleteId;
      const eraActiva = idBorrada === currentAccountId;
      const nb = accEnBorrado?.name ?? "";
      setAccounts((prev) => prev.filter((a) => a.id !== idBorrada));
      setAccDeleteId(null);

      if (eraActiva) {
        // La cuenta activa ya no existe: hay que cambiar a otra o crear una.
        setCurrentAccountId(null);
        localStorage.removeItem("trademind_current_account");
        setTrades([]);
        setTradesLoaded(false);
        setView("accounts");
        setShowOnboarding(accounts.length <= 1);
        setAccNotice(`${t("accounts.wasDeleted")} ${nb}`.trim());
      } else {
        setAccNotice(t("accounts.wasDeleted"));
      }
    } catch {
      setAccDeleteError(t("errors.accountDeleteFailed"));
    }
  }

  /* Descarga la plantilla de Excel. El archivo vive en web/public/, asi que
     Next lo sirve como estatico y no hace falta ninguna ruta en el backend. */
  function descargarPlantilla() {
    const a = document.createElement("a");
    a.href = "/plantilla_trademind.xlsx";
    a.download = "plantilla_trademind.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
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
      setTmError(t("errors.symbolRequired"));
      return;
    }
    if (!tmOpenDT) {
      setTmError(t("errors.openDateRequired"));
      return;
    }
    if (!currentAccountId) {
      setTmError(t("errors.noActiveAccount"));
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
      setTmError(t("errors.tradeSaveFailed"));
      return;
    }

    setTmOpen(false);
    if (currentAccountId) loadTrades(currentAccountId);
  }

  async function handleDeleteTrade(trade: Trade) {
    const parts = [trade.symbol, trade.entry_time || ""].filter(Boolean).join(" Â· ");
    askConfirm(
      t("trades.deleteConfirm", { details: parts ? ` (${parts})` : "" }),
      t("trades.deleteTitle"),
      async () => {
        await authedFetch(`/trades/${trade.id}`, { method: "DELETE" });
        closeConfirm();
        if (currentAccountId) loadTrades(currentAccountId);
      }
    );
  }

  async function handleDeleteAllTrades() {
    if (trades.length === 0) return;
    askConfirm(
      t("trades.deleteAllConfirm", { n: trades.length }),
      t("trades.deleteAll"),
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

  // ---- Filas visibles segÃºn filtros/paginaciÃ³n ----
  const allRows = useMemo(() => trades.map(tradeToRow), [trades]);

  const symbolOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.symbol));
    return [{ value: "", label: t("common.all") }, ...Array.from(set).map((s) => ({ value: s, label: s }))];
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

  const visibleCols = tradeColumns.filter((c) => columnPrefs[c.key]);

  if (loading) {
    /* Sin `fontFamily` en linea: es un <div>, la regla global de <button> no le
       llega, y ese "sans-serif" era un resto que lo dejaba fuera de la
       tipografia de la app. Al quitarlo hereda Space Grotesk del body. */
    return <div style={{ padding: 40, color: "#8E93A6" }}>{t("common.loading")}</div>;
  }

  const importTitle = currentAccount
    ? currentAccount.source === "csv"
      ? t("import.mt5")
      : t("import.manual")
    : t("import.mt5");

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
            <h1>{t("onboarding.configure")}</h1>
            <p>{t("onboarding.choose")}</p>

            {onboardingStep === "choices" && (
              <div className="onboarding-choices">
                <button type="button" className="onboarding-choice" onClick={handleChoiceImport}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 15V4M8 8l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3>{t("onboarding.importTitle")}</h3>
                  <p>{t("onboarding.importDesc")}</p>
                </button>
                <button type="button" className="onboarding-choice" onClick={handleChoiceManual}>
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <h3>{t("onboarding.manualTitle")}</h3>
                  <p>{t("onboarding.manualDesc")}</p>
                </button>
              </div>
            )}

            {onboardingStep === "manualForm" && (
              <div className="onboarding-form">
                <label htmlFor="manualAccName">{t("accounts.nameLabel")}</label>
                <input type="text" id="manualAccName" placeholder={t("accounts.myAccountMT5")} maxLength={60} value={manualName} onChange={(e) => setManualName(e.target.value)} />
                <label htmlFor="manualAccBalance">{t("accounts.balanceLabel")}</label>
                <input type="number" id="manualAccBalance" placeholder="10000" min={0} step="0.01" value={manualBalance} onChange={(e) => setManualBalance(e.target.value)} />
                <div className="onboarding-error">{manualError}</div>
                <div className="onboarding-form-actions">
                  <button type="button" className="pill" onClick={() => setOnboardingStep("choices")}>{t("onboarding.back")}</button>
                  <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={handleManualSubmit}>
                    {t("accounts.create")}
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
                <small>{t("header.dashboard")}</small>
              </div>
            </div>
            <div className="hdr-mid">
              <button className="icon-btn" title={t("header.currency")} style={{ width: "auto", padding: "0 9px" }}>
                $
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                {t("header.filters")}
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                {t("header.dateRange")}
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <button className="pill">
                <svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="8" ry="3" stroke="currentColor" strokeWidth="1.6" /><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" stroke="currentColor" strokeWidth="1.6" /></svg>
                <span id="datasourcePill">{currentAccount ? (currentAccount.source === "csv" ? t("datasource.mt5") : currentAccount.name) : t("datasource.none")}</span>
                <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
              </button>
              <span className="pill accent">âœ¦ {t("header.askAI")}</span>
            </div>
            <div className="hdr-right">
              <button className="pill" style={{ background: "#fff", color: "#0A0B12", borderColor: "#fff", fontWeight: 700 }}>{t("import.startWeek")}</button>
              {/* Selector de idioma ES/EN. Va a la izquierda del resto para que los
                  botones de la derecha conserven su posiciÃ³n respecto al HTML. */}
              <LanguageSwitcher />
              {/* Toggle de tema. Ocupa el lugar del botÃ³n "Ajustes" del HTML original
                  (que no hacÃ­a nada) para no alterar el ancho de .hdr-right: el header
                  usa justify-content:space-between, asÃ­ que cualquier botÃ³n extra
                  desplaza los botones centrales. */}
              <button
                className="icon-btn"
                title={t("header.changeTheme")}
                onClick={() => {
                  const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
                  document.documentElement.setAttribute("data-theme", next);
                  localStorage.setItem("trademind_theme", next);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {/* Menu del icono de usuario: el email con el que se ha entrado y
                  el boton de cerrar sesion. El contenedor necesita position:relative
                  porque el menu se coloca con top/bottom en coordenadas absolutas. */}
              <div style={{ position: "relative", display: "flex" }}>
                <button
                  className="icon-btn"
                  title={t("accounts.headerAccount")}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  onClick={() => setUserMenuOpen((v) => !v)}
                >
                  <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.6" /><path d="M5 20c1.3-3.4 4-5 7-5s5.7 1.6 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute", top: 40, right: 0, background: "var(--panel-solid)",
                      border: "1px solid var(--line)", borderRadius: 12, padding: 6, zIndex: 30,
                      minWidth: 240, boxShadow: "0 12px 32px rgba(0,0,0,.6)",
                    }}
                  >
                    {/* El email va con fontSize chico y sin cortar: se leen
                        seguidos varios, y un "..." en un email no sirve de nada. */}
                    <div
                      style={{
                        padding: "9px 10px", fontSize: 12, color: "var(--muted)",
                        borderBottom: "1px solid var(--line)", marginBottom: 6,
                        wordBreak: "break-all",
                      }}
                    >
                      {emailSesion || t("accounts.headerAccount")}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={cerrarSesion}
                      className="pill"
                      style={{
                        width: "100%", justifyContent: "flex-start", border: "none",
                        background: "transparent", color: "var(--red)",
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" width="16" height="16" aria-hidden="true">
                        <path d="M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {t("header.logout")}
                    </button>
                  </div>
                )}
              </div>
              </div>
          </header>

          <nav className="nav">
            <button className={view === "dashboard" ? "active" : ""} title={t("nav.summary")} onClick={() => setView("dashboard")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>
              <span>{t("nav.summary")}</span>
            </button>
            <button className={view === "trades" ? "active" : ""} title={t("nav.trades")} onClick={() => setView("trades")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="7" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M6 3v4M6 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="12" y="7" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M14 2v5M14 15v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><rect x="18" y="8" width="4" height="6" rx="1" stroke="currentColor" strokeWidth="1.6" /><path d="M20 5v3M20 14v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              <span>{t("nav.trades")}</span>
            </button>
            <button className={view === "accounts" ? "active" : ""} title={t("nav.accounts")} onClick={() => setView("accounts")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="6" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.7" /><path d="M6 14.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              <span>{t("nav.accounts")}</span>
            </button>
            <button className={view === "analytics" ? "active" : ""} title={t("nav.analytics")} onClick={() => setView("analytics")}>
              <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="12" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="10" y="6" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="16" y="9" width="4" height="11" rx="1" stroke="currentColor" strokeWidth="1.7" /></svg>
              <span>{t("nav.analytics")}</span>
            </button>
          </nav>

          {/* Aviso de operaciones no importadas. Va FUERA de las vistas: al
              terminar la subida el codigo salta a la vista de trades, asi que
              aqui dentro no se veria nunca. */}
          {aviso && (
            <AvisoImportacion
              rechazos={aviso.rechazos}
              repetidas={aviso.repetidas}
              guardadas={aviso.guardadas}
              leidas={aviso.leidas}
              archivoIdentico={aviso.archivoIdentico}
              onClose={() => setAviso(null)}
              onReplaceAll={reemplazarTodo}
            />
          )}

          <main>
            {/* ---- Vista Resumen ---- */}
            <div className={`view ${view === "dashboard" ? "active" : ""}`}>
              <SummaryView trades={trades} initialBalance={currentAccount ? currentAccount.initial_balance : null} />
            </div>

            {/* ---- Vista Trades ---- */}
            <div className={`view ${view === "trades" ? "active" : ""}`}>
              <div className="panel">
                <h2>
                  {t("trades.title")}{" "}
                  <span>
                    {pageRows.length < filteredRows.length
                      ? t("trades.countOf", { shown: pageRows.length, total: filteredRows.length })
                      : t("trades.count", { n: filteredRows.length })}
                  </span>
                </h2>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10, position: "relative", flexWrap: "wrap" }}>
                  <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={openAddTradeModal}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    {t("trades.add")}
                  </button>
                  <button type="button" className="pill" onClick={() => setView("import")}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                    {t("trades.importManual")}
                  </button>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", marginLeft: "auto" }}>
                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setFiltersOpen((v) => !v)}>
                        <svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16M7 12h10M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {t("header.filters")}
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {filtersOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 14, zIndex: 20, minWidth: 250, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{t("trades.dateFrom")}</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfDate value={filterDateFrom} onChange={setFilterDateFrom} />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{t("trades.dateTo")}</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfDate value={filterDateTo} onChange={setFilterDateTo} />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{t("col.type")}</div>
                          <div style={{ marginBottom: 10 }}>
                            <CfSelect
                              value={filterType}
                              onChange={setFilterType}
                              options={[
                                { value: "", label: t("common.all") },
                                { value: "buy", label: t("common.buy") },
                                { value: "sell", label: t("common.sell") },
                              ]}
                            />
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>{t("col.symbol")}</div>
                          <div style={{ marginBottom: 12 }}>
                            <CfSelect value={filterSymbol} onChange={setFilterSymbol} options={symbolOptions} />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button type="button" className="pill" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setTradesPage(1); setFiltersOpen(false); }}>
                              {t("trades.apply")}
                            </button>
                            <button type="button" className="pill" style={{ flex: 1, justifyContent: "center" }} onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterType(""); setFilterSymbol(""); setFiltersOpen(false); }}>
                              {t("trades.clear")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setPageSizeOpen((v) => !v)}>
                        {t("trades.pageSize")}: {pageSize === "all" ? t("trades.pageSizeAll") : pageSize}
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {pageSizeOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 6, zIndex: 20, minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,.5)" }}>
                          {(["10", "20", "50", "all"] as const).map((s) => (
                            <button key={s} type="button" className="pill" style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "transparent", marginBottom: 2 }}
                              onClick={() => { setPageSize(s); setTradesPage(1); setPageSizeOpen(false); }}>
                              {s === "all" ? t("trades.pageSizeAll") : t("trades.pageSizeN", { n: s })}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ position: "relative" }}>
                      <button type="button" className="pill" onClick={() => setColsOpen((v) => !v)}>
                        <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                        {t("trades.columns")}
                        <svg className="chev" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" /></svg>
                      </button>
                      {colsOpen && (
                        <div className="dropdown-menu" style={{ display: "block", position: "absolute", top: 38, right: 0, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, zIndex: 20, minWidth: 210, boxShadow: "0 8px 24px rgba(0,0,0,.5)", maxHeight: 320, overflowY: "auto" }}>
                          {tradeColumns.map((c) => (
                            <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 12.5, color: "var(--text)", cursor: "pointer" }}>
                              <input type="checkbox" checked={columnPrefs[c.key]} onChange={(e) => toggleColumn(c.key, e.target.checked)} />
                              {c.label}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <button type="button" className="pill" title={t("trades.resetView")} onClick={clearFilters}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      {t("trades.clearFilters")}
                    </button>
                    <button type="button" className="pill" title={t("trades.deleteAllWarn")} style={{ color: "var(--red)", borderColor: "rgba(255,77,109,.35)" }} onClick={handleDeleteAllTrades}>
                      <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0v12a2 2 0 002 2h4a2 2 0 002-2V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {t("trades.deleteTradesBtn")}
                    </button>
                  </div>
                </div>

                <div className="table-scroll">
                  <table className="trades-table">
                    <thead>
                      <tr>
                        {visibleCols.length ? visibleCols.map((c) => <th key={c.key}>{c.label}</th>) : <th>â€”</th>}
                        <th className="td-eye-col" />
                      </tr>
                    </thead>
                    <tbody>
                      {!tradesLoaded ? (
                        <tr><td colSpan={visibleCols.length + 1} style={{ padding: 20, color: "var(--muted)" }}>{t("common.loading")}</td></tr>
                      ) : pageRows.length === 0 ? (
                        <tr><td colSpan={visibleCols.length + 1} style={{ padding: 20, color: "var(--muted)" }}>{t("trades.empty")}</td></tr>
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
                                  <button type="button" className="eye-btn delete-btn" aria-label={t("trades.deleteTitle")} onClick={() => handleDeleteTrade(r.raw)}>
                                    <DeleteIcon />
                                  </button>
                                  <button type="button" className="eye-btn pencil-btn" aria-label={t("trades.editTitle")} onClick={() => openEditTradeModal(r.raw)}>
                                    <PencilIcon />
                                  </button>
                                  <button type="button" className="eye-btn" aria-label={t("trades.viewDetail")} onClick={() => setDetailTrade(r)}>
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
                    <button type="button" className="tp-btn" disabled={safePage <= 1} onClick={() => setTradesPage((p) => p - 1)}>{t("trades.prev")}</button>
                    <span>{t("trades.pageOf", { page: safePage, total: totalPages })}</span>
                    <button type="button" className="tp-btn" disabled={safePage >= totalPages} onClick={() => setTradesPage((p) => p + 1)}>{t("trades.next")}</button>
                  </div>
                )}
              </div>
            </div>

            {/* ---- Vista Cuentas ---- */}
            <div className={`view ${view === "accounts" ? "active" : ""}`}>
              <div className="panel" style={{ maxWidth: 640, margin: "0 auto" }}>
                <h2>{t("accounts.title")} <span>{accounts.length ? t("accounts.count", { n: accounts.length }) : ""}</span></h2>
                <p className="mini-note" style={{ marginBottom: 14, fontSize: "12.5px" }}>
                  {t("accounts.hint")}
                </p>
                {accNotice && (
                  <div className="status ok" style={{ marginBottom: 12 }}>{accNotice}</div>
                )}
                <div className="acc-list">
                  {accounts.length === 0 && <div className="mini-note">{t("accounts.empty")}</div>}
                  {accounts.map((a) => {
                    const active = a.id === currentAccountId;
                    return (
                      <div className={`acc-item${active ? " active" : ""}`} key={a.id}>
                        <div>
                          <div className="acc-name">
                            {a.name}
                            {active && <span className="acc-badge">{t("accounts.current")}</span>}
                          </div>
                          <div className="acc-sub">{a.source === "csv" ? t("datasource.mt5") : t("datasource.manual")} Â· {t("accounts.initialDeposit", { amount: a.initial_balance.toFixed(2) })}</div>
                          {a.trade_count > 0 && (
                            <div className="mini-note" style={{ marginTop: 4 }}>
                              {t("accounts.tradesCount", { n: a.trade_count })}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          {!active && (
                            <button type="button" className="pill acc-switch-btn" onClick={() => switchAccount(a.id)}>{t("accounts.useThis")}</button>
                          )}
                          <button
                            type="button"
                            className="icon-btn"
                            title={t("accounts.edit")}
                            aria-label={`${t("accounts.edit")}: ${a.name}`}
                            onClick={() => openAccEdit(a.id)}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            title={t("accounts.delete")}
                            aria-label={`${t("accounts.delete")}: ${a.name}`}
                            style={{ color: "var(--red)" }}
                            onClick={() => openAccDelete(a.id)}
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="pill" style={{ marginTop: 16, background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={openNewAccountModal}>
                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  {t("accounts.new")}
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
                  {t("import.hint")}
                </p>

                {!currentAccount && (
                  <div className="tm-field full" style={{ marginBottom: 14 }}>
                    <label htmlFor="importBalance">{t("import.balanceForAccount")}</label>
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
                  <p><b>{t("import.dropHere")}</b></p>
                  <p>{t("import.formats")}</p>
                </label>
                <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} onChange={(e) => handleFile(e.target.files?.[0])} />

                {/* BotÃ³n de descarga de la plantilla. Antes solo habÃ­a un enlace
                    de texto metido dentro de un pÃ¡rrafo, muy fÃ¡cil de no ver. */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                  <button type="button" className="pill" onClick={descargarPlantilla}>
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12M12 15l-4-4M12 15l4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    {t("import.downloadTemplate")}
                  </button>
                  <span className="mini-note">{t("import.hintTemplateNote")}</span>
                </div>

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
          <h3>{t("trades.detailTitle")}</h3>
          <button type="button" className="td-close" aria-label={t("trades.close")} onClick={() => setDetailTrade(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="td-body">
          {detailTrade && (
            <>
              <div className="td-section">
                <div className="td-section-title">{t("trades.detailSummary")}</div>
                <div className="td-card td-grid">
                  <div className="td-field">
                    <div className="lbl">{t("field.symbol")}</div>
                    <div className="val">
                      {detailTrade.symbol}
                      <span className={`type-tag ${detailTrade.type === "sell" ? "sell" : "buy"}`} style={{ marginLeft: 6 }}>{detailTrade.type}</span>
                    </div>
                  </div>
                  <div className="td-field"><div className="lbl">{t("field.volume")}</div><div className="val">{dashOr(detailTrade.volume)}</div></div>
                  <div className="td-field"><div className="lbl">{t("field.openPrice")}</div><div className="val">{dashOr(detailTrade.openPrice)}</div></div>
                  <div className="td-field"><div className="lbl">{t("field.closePrice")}</div><div className="val">{dashOr(detailTrade.closePrice)}</div></div>
                  <div className="td-field"><div className="lbl">{t("trades.detailOpen")}</div><div className="val">{detailTrade.openTime}</div></div>
                  <div className="td-field"><div className="lbl">{t("trades.detailClose")}</div><div className="val">{detailTrade.closeTime}</div></div>
                </div>
              </div>
              <div className="td-section">
                <div className="td-section-title">{t("trades.detailPnl")}</div>
                <div className="td-card">
                  <div className="td-row2"><span className="lbl">{t("field.profit")}</span><span className="val">{fmtMoneyFull(detailTrade.profit)}</span></div>
                  <div className="td-row2"><span className="lbl">{t("field.commission")}</span><span className="val">{fmtMoneyFull(detailTrade.commission)}</span></div>
                  <div className="td-row2"><span className="lbl">{t("field.swap")}</span><span className="val">{fmtMoneyFull(detailTrade.swap)}</span></div>
                  <div className="td-divider" />
                  <div className="td-row2 td-net">
                    <span className="lbl">{t("field.pnl")}</span>
                    <span className="val" style={{ color: detailTrade.pnl > 0 ? "var(--green)" : detailTrade.pnl < 0 ? "var(--red)" : "var(--muted)" }}>
                      {fmtMoneyFull(detailTrade.pnl)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="td-section">
                <div className="td-section-title">{t("trades.detailDetails")}</div>
                <div className="td-card">
                  <div className="td-row2"><span className="lbl">{t("trades.detailPositionId")}</span><span className="val">{detailTrade.position}</span></div>
                  <div className="td-row2"><span className="lbl">{t("trades.detailDuration")}</span><span className="val">{tradeDurationLabel(detailTrade)}</span></div>
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
            <h3>{t("accounts.new")}</h3>
            <button type="button" className="tm-close" aria-label={t("trades.close")} onClick={() => setAccModalOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-field full" style={{ marginBottom: 14 }}>
            <label htmlFor="accModalName">{t("accounts.nameLabel")}</label>
            <input type="text" id="accModalName" placeholder={t("accounts.myAccountMT5")} maxLength={60} value={accModalName} onChange={(e) => setAccModalName(e.target.value)} />
          </div>
          <div className="tm-field full">
            <label htmlFor="accModalBalance">{t("accounts.balanceLabel")}</label>
            <input type="number" id="accModalBalance" placeholder="10000" min={0} step="0.01" value={accModalBalance} onChange={(e) => setAccModalBalance(e.target.value)} />
          </div>
          <div className="tm-error">{accModalError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={() => setAccModalOpen(false)}>{t("common.cancel")}</button>
            <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700, flex: 2 }} onClick={handleAccModalCreate}>
              {t("accounts.create")}
            </button>
          </div>
          <p className="mini-note" style={{ marginTop: 14, textAlign: "center" }}>
            {t("accounts.importInstead")}{" "}
            <span style={{ color: "var(--teal)", cursor: "pointer", textDecoration: "underline" }} onClick={handleAccModalImportLink}>
              {t("accounts.importInsteadLink")}
            </span>
          </p>
        </div>
      </div>

      {/* ---------- Modal "Agregar / Editar trade" ---------- */}
      <div className={`tm-overlay${tmOpen ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) setTmOpen(false); }}>
        <div className="tm-modal">
          <div className="tm-head">
            <h3>{tmEditingId ? t("trades.editTitle") : t("trades.addTitle")}</h3>
            <button type="button" className="tm-close" aria-label={t("trades.close")} onClick={() => setTmOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-grid">
            <div className="tm-field"><label>{t("col.openTime")}</label><CfDateTime value={tmOpenDT} onChange={setTmOpenDT} /></div>
            <div className="tm-field"><label htmlFor="tmPosition">{t("field.position")}</label><input type="text" id="tmPosition" placeholder={t("field.auto")} value={tmPosition} onChange={(e) => setTmPosition(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmSymbol">{t("field.symbol")}</label><input type="text" id="tmSymbol" placeholder="EURUSD" value={tmSymbol} onChange={(e) => setTmSymbol(e.target.value)} /></div>
            <div className="tm-field"><label>{t("col.type")}</label><CfSelect value={tmType} onChange={setTmType} options={typeTradeOptions(t)} /></div>
            <div className="tm-field"><label htmlFor="tmVolume">{t("field.volume")}</label><input type="number" id="tmVolume" step="0.01" placeholder="0.10" value={tmVolume} onChange={(e) => setTmVolume(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmOpenPrice">{t("field.openPrice")}</label><input type="number" id="tmOpenPrice" step="any" placeholder="0.00000" value={tmOpenPrice} onChange={(e) => setTmOpenPrice(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmSl">{t("col.sl")}</label><input type="number" id="tmSl" step="any" placeholder="0.00000" value={tmSl} onChange={(e) => setTmSl(e.target.value)} /></div>
            <div className="tm-field"><label htmlFor="tmTp">{t("col.tp")}</label><input type="number" id="tmTp" step="any" placeholder="0.00000" value={tmTp} onChange={(e) => setTmTp(e.target.value)} /></div>
            <div className="tm-field"><label>{t("col.closeTime")}</label><CfDateTime value={tmCloseDT} onChange={setTmCloseDT} /></div>
            <div className="tm-field"><label htmlFor="tmClosePrice">{t("field.closePrice")}</label><input type="number" id="tmClosePrice" step="any" placeholder="0.00000" value={tmClosePrice} onChange={(e) => setTmClosePrice(e.target.value)} /></div>
            <div className="tm-field">
              <label htmlFor="tmCommission">{t("field.commission")}</label>
              <input type="number" id="tmCommission" step="0.01" placeholder="0.00" value={tmCommission} onChange={(e) => { setTmCommission(e.target.value); recalcNeto(e.target.value, tmSwap, tmProfit); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmSwap">{t("field.swap")}</label>
              <input type="number" id="tmSwap" step="0.01" placeholder="0.00" value={tmSwap} onChange={(e) => { setTmSwap(e.target.value); recalcNeto(tmCommission, e.target.value, tmProfit); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmProfit">{t("field.profit")}</label>
              <input type="number" id="tmProfit" step="0.01" placeholder="0.00" value={tmProfit} onChange={(e) => { setTmProfit(e.target.value); recalcNeto(tmCommission, tmSwap, e.target.value); }} />
            </div>
            <div className="tm-field">
              <label htmlFor="tmPnl">{t("field.pnl")}</label>
              <input type="number" id="tmPnl" step="0.01" placeholder="0.00" value={tmPnl} onChange={(e) => { setTmPnl(e.target.value); setTmPnlTouched(true); }} />
            </div>
          </div>
          <div className="tm-error">{tmError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={tmResetForm}>{t("trades.clear")}</button>
            <button type="button" className="pill" onClick={() => setTmOpen(false)}>{t("common.cancel")}</button>
            <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700 }} onClick={handleTmSave}>
              {t("common.save")}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Modal "Editar cuenta" ---------- */}
      <div className={`tm-overlay${accEditOpen ? " open" : ""}`}>
        <div className="tm-modal" style={{ maxWidth: 400 }}>
          <div className="tm-head">
            <h3>{t("accounts.editTitle")}</h3>
            <button type="button" className="tm-close" aria-label={t("trades.close")} onClick={() => setAccEditId(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-field full" style={{ marginBottom: 14 }}>
            <label htmlFor="accEditName">{t("accounts.nameLabel")}</label>
            <input type="text" id="accEditName" maxLength={60} value={accEditName} onChange={(e) => setAccEditName(e.target.value)} />
          </div>
          <div className="tm-field full">
            <label htmlFor="accEditBalance">{t("accounts.balanceLabel")}</label>
            <input type="number" id="accEditBalance" min={0} step="0.01" value={accEditBalance} onChange={(e) => setAccEditBalance(e.target.value)} />
          </div>
          <div className="tm-error">{accEditError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={() => setAccEditId(null)}>{t("common.cancel")}</button>
            <button type="button" className="pill" style={{ background: "var(--teal)", color: "#05060B", borderColor: "var(--teal)", fontWeight: 700, flex: 2 }} onClick={handleAccEditSave}>
              {t("accounts.saveChanges")}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Modal "Eliminar cuenta" ---------- */}
      <div className={`tm-overlay${accDeleteOpen ? " open" : ""}`}>
        <div className="tm-modal" style={{ maxWidth: 420 }}>
          <div className="tm-head">
            <h3>{t("accounts.delete")}</h3>
            <button type="button" className="tm-close" aria-label={t("trades.close")} onClick={() => setAccDeleteId(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="tm-body-text">
            <p style={{ marginBottom: 10 }}>
              {t("accounts.deleteConfirm")} <b>{accEnBorrado?.name}</b>?
            </p>

            {/* Aviso informative, no un cerrojo: el modal ya es la
                confirmacion y con un clic en el boton rojo se borra. */}
            {tradesDeAccEnBorrado > 0 && (
              <p
                className="mini-note"
                style={{ color: "var(--red)", marginTop: 0 }}
              >
                {t("accounts.deleteHasTrades", { n: tradesDeAccEnBorrado })}
              </p>
            )}

            <p className="mini-note">{t("accounts.deleteWarn")}</p>
          </div>
          <div className="tm-error">{accDeleteError}</div>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={() => setAccDeleteId(null)}>{t("common.cancel")}</button>
            <button
              type="button"
              className="pill"
              style={{ background: "var(--red)", color: "#fff", borderColor: "var(--red)", fontWeight: 700, flex: 2 }}
              onClick={handleAccDelete}
            >
              {t("accounts.delete")}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Modal de confirmaciÃ³n genÃ©rico ---------- */}
      <div className={`tm-overlay${confirm.open ? " open" : ""}`} onClick={(e) => { if (e.target === e.currentTarget) closeConfirm(); }}>
        <div className="tm-modal" style={{ maxWidth: 380 }}>
          <div className="tm-head"><h3>{confirm.title}</h3></div>
          <p className="mini-note" style={{ marginBottom: 16 }}>{confirm.message}</p>
          <div className="tm-actions">
            <button type="button" className="pill" onClick={closeConfirm}>{t("common.cancel")}</button>
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
