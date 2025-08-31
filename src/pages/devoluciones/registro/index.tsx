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

// Catálogos para resolver nombres si recibimos id
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

// ===== Mini calendario =====
function MiniCalendar({
  selectedYMD,
  onSelect,
  onClose,
}: {
  selectedYMD: string;
  onSelect: (ymd: string) => void;
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
    onSelect(`${y}-${pad(mIdx + 1)}-${pad(d)}`);
    onClose();
  }
  function selectToday() {
    const today = new Date();
    onSelect(toISODateInput(today));
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
        <div className="text-sm text-[#e0a200] font-medium">
          {monthNameES(viewYear, viewMonth)} {viewYear}
        </div>
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
  const [day, setDay] = useState<string>(toISODateInput(new Date()));

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

  // ✅ NUEVO: catálogo de bolsos para resolver id → nombre/color
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

  // ===== Columnas =====
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
        // Mostrar NOMBRE + (color) + talla del recibido.
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

  // 👉 columnas finales según rol (sin useMemo para no “congelar” renderers)
  const columns = soyAdmin ? baseColumns : [...baseColumns].filter((c) => c.key !== "usuario");

  // ===== Data load =====
  async function loadForDay(ymd: string) {
    try {
      setLoading(true);
      setError("");
      const { start, end } = dayBoundsCO(ymd);
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
    loadForDay(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPickDate(ymd: string) {
    setDay(ymd);
    setCalOpen(false);
    await loadForDay(ymd);
  }

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
        const { start, end } = dayBoundsCO(day);
        const data = await getDevolucionesByDateRange(start, end);
        setRows(Array.isArray(data) ? data : []);
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

  // ===== Búsqueda local =====
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    if (!qlc) return rows as any[];

    return (rows as any[]).filter((r) => {
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
  }, [rows, q]);

  // ===== Render =====
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Devoluciones
          </h1>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
          {/* Buscar */}
          <div className="sm:justify-self-start w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px]">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por producto, talla, usuario, #id u observaciones…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Fecha */}
          <div className="sm:justify-self-center w-full">
            <div className="relative flex items-center gap-2 w-full max-w-[320px] mx-auto">
              <span className="text-sm text-[#c2b48d]">Día</span>
              <button
                ref={calBtnRef}
                type="button"
                onClick={() => setCalOpen((o) => !o)}
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none text-white/90 text-left flex items-center justify-between"
                title="Selecciona una fecha"
              >
                <span>
                  {dayNameCO(day)} — {day}
                </span>
                <span className="material-symbols-outlined text-[#e0a200]">event</span>
              </button>
              {calOpen && (
                <div
                  ref={calPopRef}
                  className="absolute z-50 left-0 right-0 top={44px} flex justify-center"
                >
                  <MiniCalendar
                    selectedYMD={day}
                    onSelect={onPickDate}
                    onClose={() => setCalOpen(false)}
                  />
                </div>
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

        {/* Tabla */}
        <div className="relative overflow-visible">
          <Table2
            rows={filtered as any}
            columns={columns as any}
            initialSortKey={"fecha"}
            showActions
            onEdit={(row: any) => openEdit(row)}
            onDelete={(row: any) => onDeleteRow(row)}
          />
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
