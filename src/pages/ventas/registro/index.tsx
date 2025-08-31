// src/pages/ventas/registro/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { Qwitcher_Grypen } from "next/font/google";
import type { Venta } from "@/services/ventas";
import { getVentasByDateRange, getGanancias, updateVenta, deleteVenta } from "@/services/ventas";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

function fmtMoney(n?: number) {
  const v = Number(n ?? 0);
  return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
function toISODateInput(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Rango del día en Bogotá -> devuelto en UTC (Z) para evitar corrimientos en la DB
function dayBoundsCO(ymd: string) {
    return {
    start: `${ymd}T00:00:00-05:00`,
    end:   `${ymd}T23:59:59.999-05:00`,
  };
}


function dayNameCO(ymd: string) {
  const dt = new Date(`${ymd}T12:00:00-05:00`); // mediodía para evitar bordes
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
  // 0=Domingo ... 6=Sábado (coincide con es-CO)
  return new Date(year, monthIdx, 1).getDay();
}

/**
 * MiniCalendario (popover)
 * - Sin librerías externas
 * - Navegación de mes
 * - Selección de fecha con un clic
 * - Cierra al seleccionar o al hacer clic fuera
 */
function MiniCalendar({
  selectedYMD,
  onSelect,
  onClose,
}: {
  selectedYMD: string;
  onSelect: (ymd: string) => void;
  onClose: () => void;
}) {
  // estado del mes visible
  const [viewYear, setViewYear] = useState<number>(() => {
    const [y] = selectedYMD.split("-").map((n) => Number(n));
    return Number.isFinite(y) ? y : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const [, m] = selectedYMD.split("-").map((n) => Number(n));
    return Number.isFinite(m) ? m - 1 : new Date().getMonth();
  });

  function prevMonth() {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }
  function nextMonth() {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }
  function selectYMD(y: number, mIdx: number, d: number) {
    const pad = (x: number) => String(x).padStart(2, "0");
    onSelect(`${y}-${pad(mIdx + 1)}-${pad(d)}`);
    onClose();
  }
  function selectToday() {
    const today = new Date();
    const ymd = toISODateInput(today);
    // Mover vista a hoy
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelect(ymd);
    onClose();
  }

  // construir grilla
  const dim = daysInMonth(viewYear, viewMonth);
  const start = startWeekday(viewYear, viewMonth); // 0..6 (Domingo primero)
  const cells: Array<{ day?: number }> = [];
  // huecos al inicio
  for (let i = 0; i < start; i++) cells.push({});
  for (let d = 1; d <= dim; d++) cells.push({ day: d });

  const [selY, selM, selD] = selectedYMD.split("-").map((n) => Number(n));

  return (
    <div className="w-[280px] rounded-md bg-black/80 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_10px_30px_rgba(255,234,7,0.12)] p-3">
      {/* Header con navegación */}
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

      {/* Cabecera días */}
      <div className="grid grid-cols-7 text-[11px] text-[#c2b48d] mb-1">
        {["D", "L", "M", "M", "J", "V", "S"].map((d) => (
          <div key={d} className="text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Días */}
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

      {/* Footer */}
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

export default function RegistroVentasPage() {
  const me = getCurrentUser();
  const soyAdmin = isAdmin(me?.rol);

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Día seleccionado (hoy por defecto)
  const [day, setDay] = useState<string>(toISODateInput(new Date()));

  // Popover calendario
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

  // Ganancias del día
  const [gananciasDia, setGananciasDia] = useState<number>(0);
  const [ganLoading, setGanLoading] = useState<boolean>(false);

  // Modal EDITAR (SIN fecha)
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ id?: number; precio: number | ""; observaciones: string }>({
    precio: "" as "",
    observaciones: "",
  });

  // Columnas base (incluye Usuario)
  const baseColumns = [
    {
      key: "producto",
      label: "Producto",
      className: "max-w-[220px] truncate",
      render: (_: any, row: any) =>
        row?.producto ?? row?.nombre_producto ?? <span className="text-white/50">—</span>,
    },
    {
      key: "talla",
      label: "Talla",
      className: "max-w-[120px] truncate",
      render: (v: any) => (v ? String(v) : <span className="text-white/50">—</span>),
    },
    {
      key: "precio",
      label: "Precio",
      className: "max-w-[120px] truncate",
      render: (v: number) => fmtMoney(v),
    },
    {
      key: "usuario",
      label: "Usuario",
      className: "max-w-[180px] truncate",
      render: (_: any, row: any) =>
        row?.usuario?.nombre ??
        row?.usuario_nombre ??
        (row?.usuario_id ? `#${row.usuario_id}` : <span className="text-white/50">—</span>),
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

  // Columnas finales según rol (si no es admin, ocultar "usuario")
  const columns = useMemo(
    () => (soyAdmin ? baseColumns : (baseColumns.slice() as any[]).filter((c) => c.key !== "usuario")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [soyAdmin]
  );

  async function loadForDay(ymd: string) {
    try {
      setLoading(true);
      setError("");
      const { start, end } = dayBoundsCO(ymd);
      const [vs, gan] = await Promise.all([getVentasByDateRange(start, end), getGanancias(start, end)]);
      setVentas(Array.isArray(vs) ? vs : []);
      setGananciasDia(Number(gan || 0));
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudieron cargar las ventas del día.\n${e.message}`
          : "No se pudieron cargar las ventas del día. Verifica la API o CORS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadForDay(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al seleccionar fecha en el minicalendario: aplica inmediatamente
  async function onPickDate(ymd: string) {
    setDay(ymd);
    setCalOpen(false);
    setGanLoading(true);
    await loadForDay(ymd);
    setGanLoading(false);
  }

  // Abrir modal de edición (SIN fecha)
  function openEdit(row: any) {
    setForm({
      id: row.id,
      precio: Number(row.precio ?? 0),
      observaciones: String(row.observaciones ?? ""),
    });
    setOpenModal(true);
  }

  async function onDeleteRow(row: any) {
    if (!row?.id) {
      alert("La venta no tiene id.");
      return;
    }
    if (!confirm(`¿Eliminar la venta #${row.id}?`)) return;
    try {
      setVentas((prev) => prev.filter((v: any) => v.id !== row.id));
      await deleteVenta(row.id);
      const { start, end } = dayBoundsCO(day);
      const gan = await getGanancias(start, end);
      setGananciasDia(Number(gan || 0));
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la venta.");
      try {
        const { start, end } = dayBoundsCO(day);
        const vs = await getVentasByDateRange(start, end);
        setVentas(Array.isArray(vs) ? vs : []);
      } catch {}
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !form.id) return;

    try {
      setSaving(true);

      const payload: any = {
        precio: form.precio === "" ? 0 : Number(form.precio),
        observaciones: form.observaciones || "",
      };

      const updated = await updateVenta(form.id, payload);
      setVentas((prev: any[]) => prev.map((v) => (v.id === updated.id ? updated : v)));

      const { start, end } = dayBoundsCO(day);
      const gan = await getGanancias(start, end);
      setGananciasDia(Number(gan || 0));
      setOpenModal(false);
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo guardar la venta.\n${e?.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  // Búsqueda rápida local (condicionada por rol)
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    if (!qlc) return ventas as any[];
    return (ventas as any[]).filter((v) => {
      const obs = String(v.observaciones ?? "").toLowerCase();
      const idTxt = String(v.id ?? "");
      const prod = String(v.producto ?? v.nombre_producto ?? "").toLowerCase();
      const talla = String(v.talla ?? "").toLowerCase();

      if (soyAdmin) {
        const user = String(v?.usuario?.nombre ?? v?.usuario_nombre ?? v?.usuario_id ?? "").toLowerCase();
        return (
          obs.includes(qlc) ||
          idTxt.includes(qlc) ||
          prod.includes(qlc) ||
          talla.includes(qlc) ||
          user.includes(qlc)
        );
      } else {
        return obs.includes(qlc) || idTxt.includes(qlc) || prod.includes(qlc) || talla.includes(qlc);
      }
    });
  }, [ventas, q, soyAdmin]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado */}
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Ventas
          </h1>
        </div>

        {/* Acciones superiores (buscador + fecha + botón agregar) */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
          {/* Buscar */}
          <div className="sm:justify-self-start w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px]">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  soyAdmin
                    ? "Buscar por producto, talla, usuario, #id u observaciones…"
                    : "Buscar por producto, talla, #id u observaciones…"
                }
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
                  className="absolute z-50 left-0 right-0 top-[44px] flex justify-center"
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

          {/* Agregar venta */}
          <div className="sm:justify-self-end">
            <Link
              href="/ventas/nueva"
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition inline-flex items-center"
              title="Agregar venta"
            >
              Agregar venta
            </Link>
          </div>
        </div>

        {/* Ganancias del día */}
        <div className="mb-4 grid grid-cols-1 gap-3">
          <div className="rounded-xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] p-4">
            <div className="text-sm text-[#c2b48d]">
              Ganancias del día — {dayNameCO(day)} ({day})
            </div>
            <div className="mt-1 text-2xl text-[#e0a200]">
              {ganLoading ? "Calculando…" : fmtMoney(gananciasDia)}
            </div>
          </div>
        </div>

        {/* Estado */}
        {loading && <div className="mb-3 text-sm text-white/70">Cargando ventas…</div>}
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

      {/* Modal: SOLO editar (sin fecha) */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title="Editar venta"
        actions={
          <>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              form="venta-form"
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Guardar cambios
            </button>
          </>
        }
      >
        <form id="venta-form" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Precio</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.precio === "" ? "" : form.precio}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  precio: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              disabled={saving}
              required
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
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
