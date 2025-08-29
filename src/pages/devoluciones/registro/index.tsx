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

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

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
    const [y] = selectedYMD.split("-").map(Number);
    return Number.isFinite(y) ? y : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = selectedYMD.split("-").map(Number);
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

  const [selY, selM, selD] = selectedYMD.split("-").map(Number);

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

export default function RegistroDevolucionesPage() {
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

  // Modal edición (solo observaciones si tu UpdateDevolucionDto lo permite; aquí lo mantenemos simple)
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ id?: number; observaciones?: string }>({});

  const columns = [
    {
      key: "recibido",
      label: "Recibido (devuelto)",
      className: "max-w-[280px] truncate",
      render: (_: any, r: any) => {
        const prod = r.producto_recibido ?? "—";
        const color = r.color_recibido ? `, ${r.color_recibido}` : "";
        const talla = r.talla_recibida ? `, Talla ${r.talla_recibida}` : "";
        return prod === "—" ? "—" : `${prod}${color}${talla}`;
      },
    },
    {
      key: "precio_recibido",
      label: "Precio recibido",
      className: "max-w-[130px] truncate",
      render: (v: number) => fmtMoney(v),
    },
    {
      key: "entregado",
      label: "Entregado",
      className: "max-w-[280px] truncate",
      render: (_: any, r: any) => {
        const prod = r.producto_entregado ?? "—";
        const color = r.color_entregado ? `, ${r.color_entregado}` : "";
        const talla = r.talla_entregada ? `, Talla ${r.talla_entregada}` : "";
        return prod === "—" ? "—" : `${prod}${color}${talla}`;
      },
    },
    {
      key: "precio_entregado",
      label: "Precio entregado",
      className: "max-w-[130px] truncate",
      render: (v: number) => fmtMoney(v),
    },
    {
      key: "diferencia_pago",
      label: "Diferencia",
      className: "max-w-[120px] truncate",
      render: (v: number) => fmtMoney(v),
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

  async function loadForDay(ymd: string) {
    try {
      setLoading(true);
      setError("");
      const { start, end } = dayBoundsCO(ymd);
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || undefined) : undefined;
      const data = await getDevolucionesByDateRange(start, end, token);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudieron cargar las devoluciones.");
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
    setForm({ id: row.id });
    setOpenModal(true);
  }

  async function onDeleteRow(row: any) {
    if (!row?.id) return;
    if (!confirm(`¿Eliminar devolución #${row.id}?`)) return;
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") || undefined) : undefined;
    try {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      await deleteDevolucion(row.id, token);
    } catch {
      alert("No se pudo eliminar la devolución.");
      await loadForDay(day);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.id) return;
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") || undefined) : undefined;
    try {
      setSaving(true);
      // Si tu UpdateDevolucionDto solo permite algunos campos, ajusta aquí.
      const updated = await updateDevolucion(form.id, {}, token);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setOpenModal(false);
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo guardar.\n${e?.message || "Error"}`);
    } finally {
      setSaving(false);
    }
  }

  // Búsqueda local
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    if (!qlc) return rows;
    return rows.filter((r: any) => {
      const campos = [
        r.producto_recibido,
        r.color_recibido,
        r.talla_recibida,
        r.producto_entregado,
        r.color_entregado,
        r.talla_entregada,
        r?.usuario?.nombre,
        r.id,
      ]
        .filter(Boolean)
        .map((x: any) => String(x).toLowerCase());
      return campos.some((c: string) => c.includes(qlc));
    });
  }, [rows, q]);

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
                placeholder="Buscar por producto, talla, usuario o #id…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Fecha (minicalendario) */}
          <div className="sm:justify-self-center w-full">
            <div className="relative flex items-center gap-2 w-full max-w-[320px] mx-auto">
              <span className="text-sm text-[#c2b48d]">Día</span>
              <button
                ref={calBtnRef}
                type="button"
                onClick={() => setCalOpen((o) => !o)}
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none text-white/90 text-left flex items-center justify-between"
              >
                <span>
                  {dayNameCO(day)} — {day}
                </span>
                <span className="material-symbols-outlined text-[#e0a200]">event</span>
              </button>
              {calOpen && (
                <div ref={calPopRef} className="absolute z-50 left-0 right-0 top-[44px] flex justify-center">
                  <MiniCalendar selectedYMD={day} onSelect={onPickDate} onClose={() => setCalOpen(false)} />
                </div>
              )}
            </div>
          </div>

          {/* Nueva devolución */}
          <div className="sm:justify-self-end">
            <Link
              href="/devoluciones/nueva"
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition inline-flex items-center"
            >
              Registrar devolución
            </Link>
          </div>
        </div>

        {loading && <div className="mb-3 text-sm text-white/70">Cargando devoluciones…</div>}
        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

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
          <div className="text-sm text-white/70">
            (Aquí no hay campos editables definidos; ajusta según tu <code>UpdateDevolucionDto</code>.)
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
