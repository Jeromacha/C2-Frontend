// src/pages/ingresos/registro/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import { Qwitcher_Grypen } from "next/font/google";
import type { EntradaMercancia } from "@/services/entradas";
import { getEntradasByDateRange, deleteEntrada } from "@/services/entradas";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

/* ===== Utils de fecha ===== */
function toISODateInput(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
// Rango amplio para traer TODO
function fullRangeCO() {
  return { start: `2000-01-01T00:00:00-05:00`, end: `2100-12-31T23:59:59.999-05:00` };
}
// YYYY-MM-DD local Bogotá (para filtrar localmente)
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
function dayNameCO(ymd: string) {
  const dt = new Date(`${ymd}T12:00:00-05:00`);
  const formatter = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long" });
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
  return new Date(year, monthIdx, 1).getDay(); // 0=Dom
}

/* ===== Mini calendario (único: día o mes clic en título) ===== */
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
    onSelectDay(toISODateInput(new Date()));
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
          const isSelected = c.day && viewYear === selY && viewMonth === selM - 1 && c.day === selD;
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

/* ===== Helpers para “Usuario” y “Detalle” ===== */

// Igual que ventas: probar varias llaves comunes y nunca mostrar #id.
function userNameFromRow(row: any): string | undefined {
  return (
    row?.usuario?.nombre ??
    row?.usuario_nombre ??
    row?.usuarioNombre ??
    row?.nombre_usuario ??
    row?.user?.name ??
    row?.user_name ??
    undefined
  );
}

export default function RegistroIngresosPage() {
  const me = getCurrentUser();
  const soyAdmin = isAdmin(me?.rol);

  // Catálogos para renderizar nombres/colores por id (detalle)
  const [zapatos, setZapatos] = useState<any[]>([]);
  const [bolsos, setBolsos] = useState<any[]>([]);

  const [entradas, setEntradas] = useState<EntradaMercancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtros (prioridad: day > month)
  const [day, setDay] = useState<string>("");     // "YYYY-MM-DD" o ""
  const [month, setMonth] = useState<string>(""); // "YYYY-MM" o ""

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

  // Helpers API
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
  const apiUrl = (p: string) => (API_BASE ? `${API_BASE}${p}` : p);

  // Cargar catálogos (zapatos, bolsos)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [z, b] = await Promise.all([
          fetch(apiUrl("/zapatos")).then((r) => (r.ok ? r.json() : [])),
          fetch(apiUrl("/bolsos")).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!alive) return;
        setZapatos(Array.isArray(z) ? z : []);
        setBolsos(Array.isArray(b) ? b : []);
      } catch {
        /* silencioso */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Cargar TODO
  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      const { start, end } = fullRangeCO();
      const rows = await getEntradasByDateRange(start, end);
      setEntradas(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudieron cargar los ingresos.\n${e.message}`
          : "No se pudieron cargar los ingresos. Verifica la API o CORS."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mapas rápidos para productos
  const zapatoMap = useMemo(() => {
    const m = new Map<number, any>();
    for (const z of zapatos) if (z?.id != null) m.set(Number(z.id), z);
    return m;
  }, [zapatos]);
  const bolsoMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const b of bolsos) if (b?.id != null) m.set(String(b.id), b);
    return m;
  }, [bolsos]);

  // Render "Detalle" según tipo
  function renderDetalle(row: any) {
    const tipo = String(row?.tipo || "").toLowerCase();
    if (tipo === "zapato") {
      const z = zapatoMap.get(Number(row?.zapato_id));
      const base =
        z ? `${z.nombre ?? "Zapato"}${z.color ? ` — ${z.color}` : ""}` : `Zapato #${row?.zapato_id ?? "?"}`;
      const talla = row?.talla ? ` — Talla ${row.talla}` : "";
      return `${base}${talla}`;
    }
    if (tipo === "ropa") {
      const nombre = row?.ropa_nombre ?? "Prenda";
      const color = row?.ropa_color ? ` — ${row.ropa_color}` : "";
      const talla = row?.talla ? ` — Talla ${row.talla}` : "";
      return `${nombre}${color}${talla}`;
    }
    if (tipo === "bolso") {
      const b = bolsoMap.get(String(row?.bolso_id));
      return b ? `${b.nombre ?? "Bolso"}${b.color ? ` — ${b.color}` : ""}` : `Bolso #${row?.bolso_id ?? "?"}`;
    }
    return "—";
  }

  // Columnas base (sin cambios en render)
  const baseColumns = [
    {
      key: "detalle",
      label: "Detalle",
      className: "max-w-[280px] truncate",
      render: (_: any, row: any) => renderDetalle(row),
    },
    {
      key: "cantidad",
      label: "Cantidad",
      className: "max-w-[100px] truncate",
      render: (v: number) => Number(v ?? 0),
    },
    {
      key: "usuario",
      label: "Usuario",
      className: "max-w-[200px] truncate",
      render: (_: any, row: any) => {
        const name = userNameFromRow(row);
        return name ? name : <span className="text-white/50">—</span>;
      },
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
    {
      key: "tipo",
      label: "Tipo",
      className: "max-w-[120px] truncate",
      render: (_: any, row: any) => String(row?.tipo ?? "—").toUpperCase(),
    },
  ] as const;

  // Ocultar "Usuario" si NO es admin
  const columns = soyAdmin ? baseColumns : baseColumns.slice().filter((c) => c.key !== "usuario");

  // Búsqueda rápida local
  const [q, setQ] = useState("");

  // Paginación local
  const [pageSize, setPageSize] = useState<number>(15);
  const [page, setPage] = useState<number>(1);

  // Filtrado local: día (si hay) o mes; luego texto
  const filtered = useMemo(() => {
    let arr = entradas as any[];

    if (day) {
      arr = arr.filter((row) => localYMD_CO(row?.fecha) === day);
    } else if (month) {
      arr = arr.filter((row) => monthOf(row?.fecha) === month);
    }

    const qlc = q.trim().toLowerCase();
    if (!qlc) return arr;

    return arr.filter((row) => {
      const detalle = renderDetalle(row).toLowerCase();
      const idTxt = String(row?.id ?? "");
      const tipo = String(row?.tipo ?? "").toLowerCase();
      const talla = String(row?.talla ?? "").toLowerCase();
      const userName = String(userNameFromRow(row) ?? "").toLowerCase();
      return (
        detalle.includes(qlc) ||
        userName.includes(qlc) ||
        idTxt.includes(qlc) ||
        tipo.includes(qlc) ||
        talla.includes(qlc)
      );
    });
  }, [entradas, q, day, month, zapatoMap, bolsoMap]);

  // Paginación
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filtered.slice(startIdx, startIdx + pageSize);

  // Eliminar fila
  async function onDeleteRow(row: any) {
    if (!row?.id) {
      alert("El ingreso no tiene id.");
      return;
    }
    if (!confirm(`¿Eliminar el ingreso #${row.id}?`)) return;
    try {
      setEntradas((prev) => prev.filter((r: any) => r.id !== row.id));
      await deleteEntrada(row.id);
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el ingreso.");
      try {
        await loadAll();
      } catch {}
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado */}
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Ingresos
          </h1>
        </div>

        {/* Acciones superiores */}
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
                placeholder="Buscar por detalle, talla, usuario…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Fecha (un solo calendario: día o mes clic en título) */}
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
                  {day ? `Día: ${dayNameCO(day)} — ${day}` : month ? `Mes: ${month}` : "Todos"}
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

          {/* Agregar ingreso */}
          <div className="sm:justify-self-end">
            <Link
              href="/ingresos/nueva"
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition inline-flex items-center"
              title="Agregar ingreso"
            >
              Agregar ingreso
            </Link>
          </div>
        </div>

        {/* Estado */}
        {loading && <div className="mb-3 text-sm text-white/70">Cargando ingresos…</div>}
        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

        {/* Tabla (paginada) */}
        <div className="relative overflow-visible">
          <Table2
            rows={pageRows as any}
            columns={columns as any}
            initialSortKey={"fecha"}
            showActions
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
    </AppLayout>
  );
}
