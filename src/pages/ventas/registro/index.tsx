// src/pages/ventas/registro/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { Qwitcher_Grypen } from "next/font/google";
import type { Venta } from "@/services/ventas";
import { getVentasByDateRange, updateVenta, deleteVenta } from "@/services/ventas";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

/* ===== Utils ===== */
function fmtMoney(n?: number) {
  const v = Number(n ?? 0);
  return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}
const pad2 = (x: number) => String(x).padStart(2, "0");

// Rango MUY amplio para traer todo
function fullRangeCO() {
  return {
    start: `2000-01-01T00:00:00-05:00`,
    end: `2100-12-31T23:59:59.999-05:00`,
  };
}

// Fecha local YYYY-MM-DD en Bogotá
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

/* ===== MiniCalendario (mismo estilo) ===== */
function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate();
}
function startWeekday(year: number, monthIdx: number) {
  // 0=Domingo ... 6=Sábado
  return new Date(year, monthIdx, 1).getDay();
}
function monthNameES(year: number, monthIdx: number) {
  const d = new Date(Date.UTC(year, monthIdx, 1));
  return new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "UTC" })
    .format(d)
    .replace(/^\p{Ll}/u, (c) => c.toUpperCase());
}
function toISODateInput(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

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
    onSelectDay(`${y}-${pad2(mIdx + 1)}-${pad2(d)}`);
    onClose();
  }
  function selectMonth(y: number, mIdx: number) {
    onSelectMonth(`${y}-${pad2(mIdx + 1)}`);
    onClose();
  }
  function selectToday() {
    const today = new Date();
    const ymd = toISODateInput(today);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDay(ymd);
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
      {/* Header: ahora es botón para seleccionar el MES completo */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="h-8 w-8 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 inline-flex items-center justify-center"
          title="Mes anterior"
        >
          ‹
        </button>

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
            c.day && viewYear === selY && viewMonth === selM - 1 && c.day === selD;

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

/* ===== Página ===== */
export default function RegistroVentasPage() {
  const me = getCurrentUser();
  const soyAdmin = isAdmin(me?.rol);

  // Data
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Búsqueda
  const [q, setQ] = useState("");

  // Filtros (mutuamente excluyentes en prioridad: day > month)
  const [month, setMonth] = useState<string>(""); // "YYYY-MM" o ""
  const [day, setDay] = useState<string>("");     // "YYYY-MM-DD" o ""

  // Calendario (único)
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

  // Paginación
  const [pageSize, setPageSize] = useState<number>(15);
  const [page, setPage] = useState<number>(1);

  // Columnas
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
        const ymd = localYMD_CO(v);
        return ymd || "—";
      },
    },
  ] as const;

  const columns = useMemo(
    () => (soyAdmin ? baseColumns : (baseColumns.slice() as any[]).filter((c) => c.key !== "usuario")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [soyAdmin]
  );

  // Cargar TODO
  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const { start, end } = fullRangeCO();
      const vs = await getVentasByDateRange(start, end);
      setVentas(Array.isArray(vs) ? vs : []);
      setPage(1);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudieron cargar las ventas.\n${e.message}`
          : "No se pudieron cargar las ventas. Verifica la API o CORS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Filtrado local (prioridad día > mes > texto)
  const filtered = useMemo(() => {
    let arr = ventas as any[];

    if (day) {
      arr = arr.filter((v) => localYMD_CO(v?.fecha) === day);
    } else if (month) {
      arr = arr.filter((v) => monthOf(v?.fecha) === month);
    }

    const qlc = q.trim().toLowerCase();
    if (!qlc) return arr;

    return arr.filter((v) => {
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
  }, [ventas, q, soyAdmin, day, month]);

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
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la venta.");
    } finally {
      try {
        await deleteVenta(row.id);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState<{ id?: number; precio: number | ""; observaciones: string }>({
    precio: "" as "",
    observaciones: "",
  });

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
      setOpenModal(false);
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo guardar la venta.\n${e?.message || "Error desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Ventas
          </h1>
        </div>

        {/* Acciones: búsqueda + calendario único + limpiar filtros + agregar */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_minmax(0,360px)_auto] sm:items-center">
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
                placeholder={
                  soyAdmin
                    ? "Buscar por producto, talla, usuario, #id u observaciones…"
                    : "Buscar por producto, talla, #id u observaciones…"
                }
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Calendario (único) + chips de filtro */}
          <div className="w-full">
            <div className="relative flex items-center gap-2 w-full max-w-[360px] mx-auto">
              <span className="text-sm text-[#c2b48d]">Fecha</span>

              <button
                ref={calBtnRef}
                type="button"
                onClick={() => setCalOpen((o) => !o)}
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none text-white/90 text-left flex items-center justify-between"
                title="Selecciona día o mes (clic en el título para mes)"
              >
                <span>
                  {day
                    ? `Día: ${day}`
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
                      setMonth("");   // prioridad al día
                      setPage(1);
                    }}
                    onSelectMonth={(ym) => {
                      setMonth(ym);
                      setDay("");     // prioridad al mes si no hay día
                      setPage(1);
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

        {/* Estado */}
        {loading && <div className="mb-3 text-sm text-white/70">Cargando ventas…</div>}
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

        {/* Paginación */}
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

      {/* Modal: editar (sin fecha) */}
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
