// src/pages/devoluciones/registro/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { Qwitcher_Grypen } from "next/font/google";
import type { Devolucion } from "@/services/devoluciones";
import {
  getDevolucionesByDateRange,
  updateDevolucion,
  deleteDevolucion,
} from "@/services/devoluciones";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

// ===== Utils =====
function fmtMoney(n?: number) {
  const v = Number(n ?? 0);
  return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
function toISODateInput(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function dayBoundsCO(ymd: string) {
  return {
    start: `${ymd}T00:00:00-05:00`,
    end: `${ymd}T23:59:59.999-05:00`,
  };
}
function dayNameCO(ymd: string) {
  const dt = new Date(`${ymd}T12:00:00-05:00`);
  const formatter = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
  });
  const name = formatter.format(dt);
  return name.charAt(0).toUpperCase() + name.slice(1);
}
function monthNameES(year: number, monthIdx: number) {
  const d = new Date(Date.UTC(year, monthIdx, 1));
  return new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" })
    .format(d)
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}
function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate();
}
function startWeekday(year: number, monthIdx: number) {
  return new Date(year, monthIdx, 1).getDay();
}

// ✅ NUEVO: rango amplio para traer TODO sin depender de un día
function fullRangeCO() {
  return {
    start: `2000-01-01T00:00:00-05:00`,
    end: `2100-12-31T23:59:59.999-05:00`,
  };
}

// ✅ NUEVO: helpers para filtrar localmente por día/mes en horario Bogotá
function localYMD_CO(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (!d || isNaN(d.getTime())) return "";
  const yyyy = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", year: "numeric" }).format(d);
  const mm = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", month: "2-digit" }).format(d);
  const dd = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "2-digit" }).format(d);
  return `${yyyy}-${mm}-${dd}`;
}
function monthOf(isoOrDate: string | Date): string {
  const ymd = localYMD_CO(isoOrDate);
  return ymd ? ymd.slice(0, 7) : "";
}

// Catálogos para resolver nombres si recibimos id
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

// ===== Mini calendario =====
// (mismo estilo; ahora el título del calendario es “clickable” para seleccionar el MES)
function MiniCalendar({
  selectedYMD,
  onSelectDay,
  onSelectMonth,
  onClose,
}: {
  selectedYMD: string;
  onSelectDay: (ymd: string) => void;
  onSelectMonth: (ym: string) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState<number>(() => {
    const [y] = selectedYMD.split("-").map((n) => Number(n));
    return Number.isFinite(y) ? y : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = selectedYMD.split("-").map((n) => Number(n));
    return Number.isFinite(m) ? m - 1 : new Date().getMonth();
  });

  function prevMonth() {
    setViewMonth((m) => (m === 0 ? (setViewYear((y) => y - 1), 11) : m - 1));
  }
  function nextMonth() {
    setViewMonth((m) => (m === 11 ? (setViewYear((y) => y + 1), 0) : m + 1));
  }
  function selectYMD(y: number, mIdx: number, d: number) {
    const pad = (x: number) => String(x).padStart(2, "0");
    onSelectDay(`${y}-${pad(mIdx + 1)}-${pad(d)}`);
    onClose();
  }
  function selectMonth(y: number, mIdx: number) {
    const pad = (x: number) => String(x).padStart(2, "0");
    onSelectMonth(`${y}-${pad(mIdx + 1)}`);
    onClose();
  }
  function selectToday() {
    const today = new Date();
    onSelectDay(toISODateInput(today));
    onClose();
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const start = startWeekday(viewYear, viewMonth);
  const cells: Array<{ day?: number }> = [];
  for (let i = 0; i < start; i++) cells.push({});
  for (let d = 1; d <= dim; d++) cells.push({ day: d });

  const [selY, selM, selD] = selectedYMD.split("-").map((n) => Number(n));

  return (
    <div className="w-[280px] rounded-md bg-black/80 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_10px_30px_rgba(255,234,7,0.12)] p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="h-8 w-8 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 inline-flex items-center justify-center"
          title="Mes anterior"
        >
          ‹
        </button>
        {/* ✅ Título clickable para seleccionar TODO el mes */}
        <button
          onClick={() => selectMonth(viewYear, viewMonth)}
          className="text-sm text-[#e0a200] font-medium px-2 py-1 rounded hover:bg-[#e0a200]/10 border border-transparent hover:border-[#e0a200]/30"
          title="Mostrar todo el mes"
        >
          {monthNameES(viewYear, viewMonth)} {viewYear}
        </button>
        <button
          onClick={nextMonth}
          className="h-8 w-8 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 inline-flex items-center justify-center"
          title="Mes siguiente"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-[11px] text-[#c2b48d] mb-1">
        {["D", "L", "M", "M", "J", "V", "S"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const isSelected =
            c.day &&
            viewYear === selY &&
            viewMonth === selM - 1 &&
            c.day === selD;

          return (
            <button
              key={i}
              disabled={!c.day}
              onClick={() => c.day && selectYMD(viewYear, viewMonth, c.day)}
              className={[
                "h-8 rounded-md text-sm",
                !c.day
                  ? "opacity-0 cursor-default"
                  : isSelected
                  ? "bg-[#e0a200]/30 text-[#e0a200] border border-[#e0a200]/50"
                  : "text-white/90 hover:bg-[#e0a200]/10 border border-transparent",
              ].join(" ")}
            >
              {c.day || ""}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={selectToday}
          className="px-3 h-8 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10"
        >
          Hoy
        </button>
        <button
          onClick={onClose}
          className="px-3 h-8 rounded-md border border-white/20 text-white hover:bg-white/10"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ===== Helpers para columnas =====
function isBolsoItemLabel(label: string) {
  const s = (label || "").toLowerCase();
  return s.includes("bolso") || s.includes("tote") || s.includes("única");
}

// divide por ; , / | · y respeta espacios
function splitList(str?: string) {
  if (!str) return [];
  return String(str)
    .split(/[;,/|·]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isNumericId(s: string) {
  return /^\d+$/.test(s.trim());
}

/**
 * Construye los textos para la columna "Entregado" emparejando por índice:
 * - Zapato: producto_entregado = id numérico -> resuelve nombre/color; muestra "— Talla X"
 * - Ropa:   producto_entregado = nombre       -> usa color_entregado global; "— Talla X"
 * - Bolso:  producto_entregado = id string   -> resuelve nombre/color; oculta Talla Única
 */
function buildEntregadosView(
  row: any,
  lookupZapato: (id?: string) => string | undefined,
  lookupBolso: (id?: string) => string | undefined
): string[] {
  const items = splitList(row.producto_entregado);
  const tallas = splitList(row.talla_entregada);
  const colorRopaGlobal = (row.color_entregado || "").toString().trim();

  const usePerItem = tallas.length === items.length && items.length > 0;
  const getTalla = (idx: number) =>
    (usePerItem ? tallas[idx] : row.talla_entregada || "").toString().trim();

  return items.map((raw, i) => {
    const producto = raw.toString().trim();
    const talla = getTalla(i);

    // Zapato → id numérico
    if (isNumericId(producto)) {
      const name = lookupZapato(producto) || `#${producto}`;
      return talla && talla.toLowerCase() !== "única" ? `${name} — Talla ${talla}` : name;
    }

    // Bolso → intentar id exacto (no numérico), si existe en catálogo
    const bolsoName = lookupBolso(producto);
    if (bolsoName) {
      // oculta “Talla Única”
      return bolsoName;
    }

    // Ropa → nombre, usa color_entregado global
    const base = colorRopaGlobal ? `${producto} — ${colorRopaGlobal}` : producto;
    if (talla && talla.toLowerCase() !== "única" && talla.toLowerCase() !== "varios") {
      return `${base} — Talla ${talla}`;
    }
    return base;
  });
}

/**
 * Extrae "Nombre" y "Talla" para RECIBIDO (visual), ocultando talla si es Única/bolso.
 */
function formatItemWithTalla(
  rawItem: string,
  perItemTalla?: string,
  tallaGlobal?: string
) {
  const item = rawItem.trim();

  // si ya viene la talla en texto:
  const reDash = /(.*?)[\s–—-]+Talla\s*([^\s).;]+)/i;
  const reParen = /(.*)\(\s*Talla\s*([^)]+)\s*\)\s*$/i;

  let name = item;
  let talla: string | undefined;

  const m1 = item.match(reDash);
  if (m1) {
    name = m1[1].trim();
    talla = (m1[2] || "").trim();
  } else {
    const m2 = item.match(reParen);
    if (m2) {
      name = m2[1].trim();
      talla = (m2[2] || "").trim();
    }
  }

  // preferir talla por índice si no había
  if (!talla && perItemTalla) talla = perItemTalla.trim();

  // si aún no, usar talla global válida
  if (!talla) {
    const tg = (tallaGlobal || "").trim().toLowerCase();
    if (tg && tg !== "varios" && tg !== "única") talla = tallaGlobal;
  }

  // Ocultar si bolso o Única
  const hide =
    !talla ||
    talla.toLowerCase() === "única" ||
    isBolsoItemLabel(`${name} ${talla}`);

  return hide ? name : `${name} — Talla ${talla}`;
}

// ===== Página =====
export default function RegistroDevolucionesPage() {
  const me = getCurrentUser();
  const soyAdmin = isAdmin(me?.rol);

  const [rows, setRows] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Cambios: filtros y paginación
  // - day y month son filtros locales (prioridad: day > month)
  const [day, setDay] = useState<string>("");      // "YYYY-MM-DD" o ""
  const [month, setMonth] = useState<string>("");  // "YYYY-MM" o ""

  // Popover calendario (uno solo)
  const [calOpen, setCalOpen] = useState(false);
  const calBtnRef = useRef<HTMLButtonElement | null>(null);
  const calPopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!calOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        calPopRef.current &&
        !calPopRef.current.contains(t) &&
        calBtnRef.current &&
        !calBtnRef.current.contains(t)
      ) {
        setCalOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [calOpen]);

  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ id?: number; observaciones: string }>({
    observaciones: "",
  });

  // Catálogo de zapatos para resolver nombre si producto_recibido / entregado es id
  type ZapatoItem = { id: number; nombre: string; color: string };
  const [zapatos, setZapatos] = useState<ZapatoItem[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const zap = await fetch(apiUrl("/zapatos")).then((r) => (r.ok ? r.json() : []));
        if (!alive) return;
        setZapatos(Array.isArray(zap) ? zap : []);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function lookupZapatoNameById(idStr?: string) {
    if (!idStr) return undefined;
    const id = Number(idStr);
    if (!Number.isFinite(id)) return undefined;
    const z = zapatos.find((x) => Number(x.id) === id);
    return z ? `${z.nombre}${z.color ? ` — ${z.color}` : ""}` : undefined;
  }

  // Catálogo de bolsos
  type BolsoItem = { id: string; nombre: string; color?: string };
  const [bolsos, setBolsos] = useState<BolsoItem[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetch(apiUrl("/bolsos")).then((r) => (r.ok ? r.json() : []));
        if (!alive) return;
        setBolsos(Array.isArray(list) ? list : []);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function lookupBolsoNameById(id?: string) {
    if (!id) return undefined;
    const b = bolsos.find((x) => String(x.id) === String(id));
    return b ? `${b.nombre}${b.color ? ` — ${b.color}` : ""}` : undefined;
  }

  // Expanded rows (lista de entregados)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggleExpanded = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // ===== Columnas (sin cambios visuales/estructura) =====
  const baseColumns = [
    {
      key: "entregado",
      label: "Entregado",
      className: "max-w-[420px] truncate",
      render: (_: any, r: any) => {
        const items = buildEntregadosView(r, lookupZapatoNameById, lookupBolsoNameById);
        if (items.length === 0) return "—";
        const isOpen = !!expanded[r.id];
        if (!isOpen) {
          const first = items[0];
          const rest = items.length - 1;
          const tooLong = first.length > 48 || items.length > 1;
          if (!tooLong) return first;
          return (
            <span className="inline-flex items-center gap-2">
              <span className="truncate">
                {first}
                {rest > 0 ? ` … (+${rest})` : ""}
              </span>
              <button
                type="button"
                onClick={() => toggleExpanded(r.id)}
                className="text-xs px-2 h-7 rounded-md border border-white/20 text-white hover:bg-white/10"
              >
                Mostrar todos
              </button>
            </span>
          );
        }
        return (
          <div className="space-y-1">
            <ul className="list-disc ml-5">
              {items.map((it, i) => (
                <li key={i} className="whitespace-normal">
                  {it}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => toggleExpanded(r.id)}
              className="mt-1 text-xs px-2 h-7 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Ocultar
            </button>
          </div>
        );
      },
    },
    {
      key: "recibido",
      label: "Recibido (devuelto)",
      className: "max-w-[320px] truncate",
      render: (_: any, r: any) => {
        let prod = r.producto_recibido ?? r.producto ?? r.nombre_producto ?? "";
        const talla = String(r.talla_recibida ?? r.talla ?? "").trim();
        const isZapId = /^\d+$/.test(String(prod));

        if ((!prod || isZapId) && (r.tipo === "zapato" || isZapId)) {
          const name = lookupZapatoNameById(String(prod));
          if (name) prod = name;
        }

        if (!prod) return "—";
        const hideTalla = !talla || talla.toLowerCase() === "única" || isBolsoItemLabel(`${prod} ${talla}`);
        return hideTalla ? prod : `${prod} — Talla ${talla}`;
      },
    },
    {
      key: "diferencia_pago",
      label: "Diferencia",
      className: "max-w-[160px] truncate",
      render: (v: number) => (v != null ? fmtMoney(v) : "—"),
    },
    {
      key: "usuario",
      label: "Usuario",
      className: "max-w-[160px] truncate",
      render: (_: any, r: any) =>
        r?.usuario?.nombre ?? r?.usuario_nombre ?? (r?.usuario_id ? `#${r.usuario_id}` : "—"),
    },
    {
      key: "fecha",
      label: "Fecha",
      className: "max-w-[140px] truncate",
      render: (v: string) => {
        const dt = v ? new Date(v) : null;
        if (!dt || isNaN(dt.getTime())) return "—";
        return dt.toLocaleDateString("es-CO", { timeZone: "America/Bogota" });
      },
    },
  ] as const;

  const columns = soyAdmin ? baseColumns : [...baseColumns].filter((c) => c.key !== "usuario");

  // ===== Data load =====
  // En lugar de cargar por día, cargamos TODO y filtramos localmente
  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const { start, end } = fullRangeCO();
      const data = await getDevolucionesByDateRange(start, end);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudieron cargar las devoluciones.\n${e.message}`
          : "No se pudieron cargar las devoluciones. Verifica la API o CORS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda local
  const [q, setQ] = useState("");

  // ✅ NUEVO: paginación local
  const [pageSize, setPageSize] = useState<number>(15);
  const [page, setPage] = useState<number>(1);

  // ✅ NUEVO: filtrado local por día (si hay) o por mes (si no hay día)
  const filtered = useMemo(() => {
    let arr = rows as any[];

    if (day) {
      arr = arr.filter((r) => localYMD_CO(r?.fecha) === day);
    } else if (month) {
      arr = arr.filter((r) => monthOf(r?.fecha) === month);
    }

    const qlc = q.trim().toLowerCase();
    if (!qlc) return arr;

    return arr.filter((r) => {
      const campos = [
        r.producto_recibido ?? r.producto ?? r.nombre_producto ?? "",
        r.color_recibido ?? r.color ?? "",
        r.talla_recibida ?? r.talla ?? "",
        r.producto_entregado ?? "",
        r.color_entregado ?? "",
        r.talla_entregada ?? "",
        r?.usuario?.nombre ?? r?.usuario_nombre ?? r?.usuario_id ?? "",
        r.id ?? "",
        r.observaciones ?? "",
      ]
        .filter(Boolean)
        .map((x: any) => String(x).toLowerCase());

      return campos.some((c: string) => c.includes(qlc));
    });
  }, [rows, q, day, month]);

  // Paginación
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  // Acciones
  function openEdit(row: any) {
    setForm({
      id: row.id,
      observaciones: String(row.observaciones ?? ""),
    });
    setOpenModal(true);
  }

  async function onDeleteRow(row: any) {
    if (!row?.id) {
      alert("La devolución no tiene id.");
      return;
    }
    if (!confirm(`¿Eliminar la devolución #${row.id}?`)) return;
    try {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      await deleteDevolucion(row.id);
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la devolución.");
      try {
        // Antes recargábamos por día; ahora recargamos TODO para mantener consistencia
        await loadAll();
      } catch {}
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.id) return;

    try {
      setSaving(true);
      const payload: any = { observaciones: form.observaciones || "" };
      const updated = await updateDevolucion(form.id, payload);
      setRows((prev: any[]) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setOpenModal(false);
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo guardar.\n${e?.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  // ===== Render =====
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Devoluciones
          </h1>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(0,320px)_auto] sm:items-center">
          {/* Buscar */}
          <div className="sm:justify-self-start w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px]">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por producto, talla, usuario, #id u observaciones…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Fecha: un solo calendario (día o mes con clic en el título) */}
          <div className="sm:justify-self-center w-full">
            <div className="relative flex items-center gap-2 w-full max-w-[320px] mx-auto">
              <span className="text-sm text-[#c2b48d]">Fecha</span>
              <button
                ref={calBtnRef}
                type="button"
                onClick={() => setCalOpen((o) => !o)}
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none text-white/90 text-left flex items-center justify-between"
                title="Selecciona un día o haz clic en el título para filtrar por mes"
              >
                <span>
                  {day
                    ? `Día: ${dayNameCO(day)} — ${day}`
                    : month
                    ? `Mes: ${month}`
                    : "Todos"}
                </span>
                <span className="material-symbols-outlined text-[#e0a200]">event</span>
              </button>
              {calOpen && (
                <div
                  ref={calPopRef}
                  className="absolute z-50 left-0 right-0 top-[44px] flex justify-center"
                >
                  <MiniCalendar
                    selectedYMD={day || toISODateInput(new Date())}
                    onSelectDay={(ymd) => {
                      setDay(ymd);
                      setMonth("");
                      setPage(1);
                      setCalOpen(false);
                    }}
                    onSelectMonth={(ym) => {
                      setMonth(ym);
                      setDay("");
                      setPage(1);
                      setCalOpen(false);
                    }}
                    onClose={() => setCalOpen(false)}
                  />
                </div>
              )}

              {(day || month) && (
                <button
                  onClick={() => {
                    setDay("");
                    setMonth("");
                    setPage(1);
                  }}
                  className="h-10 px-2 rounded-md border border-white/20 text-white hover:bg-white/10"
                  title="Limpiar filtros"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Agregar devolución */}
          <div className="sm:justify-self-end">
            <Link
              href="/devoluciones/nueva"
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition inline-flex items-center"
              title="Registrar devolución"
            >
              Registrar devolución
            </Link>
          </div>
        </div>

        {/* Estado */}
        {loading && <div className="mb-3 text-sm text-white/70">Cargando devoluciones…</div>}
        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

        {/* Tabla (paginada) */}
        <div className="relative overflow-visible">
          <Table2
            rows={pageRows as any}
            columns={columns as any}
            initialSortKey={"fecha"}
            showActions
            onEdit={(row: any) => openEdit(row)}
            onDelete={(row: any) => onDeleteRow(row)}
          />
        </div>

        {/* Controles de paginación */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-[#c2b48d]">
            Mostrando {pageRows.length} de {total} registros
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#c2b48d]">Por página</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPageSize(n);
                setPage(1);
              }}
              className="h-9 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none text-white/90"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="h-9 px-3 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-white/80">
              Página {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="h-9 px-3 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal: editar observaciones */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Editar devolución"
        actions={
          <>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              form="dev-form"
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Guardar
            </button>
          </>
        }
      >
        <form id="dev-form" onSubmit={onSubmit} className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Observaciones (opcional)</label>
            <input
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="(Opcional)"
            />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
