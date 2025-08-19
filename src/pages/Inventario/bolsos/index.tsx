// src/pages/inventario/bolsos/index.tsx
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { useEffect, useMemo, useState } from "react";
import { Qwitcher_Grypen } from "next/font/google";
import {
  Bolso as BolsoRow,
  getBolsos,
  createBolso,
  updateBolso,
  deleteBolso,
} from "@/services/bolsos";

const qwitcher = Qwitcher_Grypen({
  weight: ["700"],
  subsets: ["latin"],
});

export default function InventarioBolsos() {
  // --- Data/estado remoto
  const [bolsos, setBolsos] = useState<BolsoRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Carga inicial
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getBolsos();
        if (!alive) return;
        setBolsos(data);
        setError("");
      } catch (e: any) {
        setError("No se pudo cargar el inventario de bolsos.");
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Columnas de la tabla
  const columns = [
    { key: "id", label: "ID", className: "max-w-[140px] truncate" },
    { key: "nombre", label: "Nombre", className: "max-w-[200px] truncate" },
    { key: "color", label: "Color", className: "max-w-[140px] truncate" },
    {
      key: "precio",
      label: "Precio",
      className: "max-w-[160px] truncate",
      render: (v: number) => `$${(v ?? 0).toLocaleString("es-CO")}`,
    },
    { key: "observaciones", label: "Observaciones", className: "max-w-[260px] truncate" },
    { key: "cantidad", label: "Cantidad", className: "max-w-[120px] truncate" },
  ] as const;

  // --- Búsqueda + Filtros
  const [q, setQ] = useState("");
  const [colorFilter, setColorFilter] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [qtyFilter, setQtyFilter] = useState<"" | "con" | "sin">("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (colorFilter) n++;
    if (minPrice) n++;
    if (maxPrice) n++;
    if (qtyFilter) n++;
    return n;
  }, [colorFilter, minPrice, maxPrice, qtyFilter]);

  const distinctColors = useMemo(
    () =>
      Array.from(new Set(bolsos.map((b) => (b.color || "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "es", { sensitivity: "base" })
      ),
    [bolsos]
  );

  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;

    return bolsos.filter((b) => {
      const hayTexto =
        !qlc ||
        String(b.id).toLowerCase().includes(qlc) ||
        (b.nombre ?? "").toLowerCase().includes(qlc) ||
        (b.color ?? "").toLowerCase().includes(qlc) ||
        (b.observaciones ?? "").toLowerCase().includes(qlc);

      const hayColor = !colorFilter || b.color === colorFilter;
      const hayMin = min === undefined || b.precio >= min;
      const hayMax = max === undefined || b.precio <= max;

      const hayCantidad =
        qtyFilter === ""
          ? true
          : qtyFilter === "con"
          ? b.cantidad > 0
          : b.cantidad === 0;

      return hayTexto && hayColor && hayMin && hayMax && hayCantidad;
    });
  }, [bolsos, q, colorFilter, minPrice, maxPrice, qtyFilter]);

  const clearFilters = () => {
    setColorFilter("");
    setMinPrice("");
    setMaxPrice("");
    setQtyFilter("");
  };

  // --- Modal (crear/editar)
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BolsoRow>({
    id: "" as string,
    nombre: "",
    color: "",
    precio: 0,
    observaciones: "",
    cantidad: 0,
  });

  function openCreate() {
    setEditMode(false);
    setForm({ id: "" as string, nombre: "", color: "", precio: 0, observaciones: "", cantidad: 0 });
    setOpenModal(true);
  }

  function openEdit(row: BolsoRow) {
    setEditMode(true);
    setForm({ ...row });
    setOpenModal(true);
  }

  async function onDelete(row: BolsoRow) {
    if (!confirm(`¿Eliminar bolso "${row.nombre}" (${row.id})?`)) return;
    try {
      // Optimista
      setBolsos((prev) => prev.filter((b) => b.id !== row.id));
      await deleteBolso(String(row.id));
    } catch (e) {
      // Revertir si falla (recargar)
      try {
        const data = await getBolsos();
        setBolsos(data);
      } catch {}
      alert("No se pudo eliminar el bolso.");
      console.error(e);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (editMode) {
        // PATCH /bolsos/:id
        const updated = await updateBolso(String(form.id), {
          nombre: form.nombre,
          color: form.color,
          precio: form.precio,
          observaciones: form.observaciones ?? "",
          cantidad: form.cantidad,
        });

        // Actualiza la colección base (no 'filtered')
        setBolsos((prev) =>
          prev.map((b) => (String(b.id) === String(updated.id) ? updated : b))
        );
      } else {
        if (!form.id) {
          alert("El ID es obligatorio");
          setSaving(false);
          return;
        }
        if (bolsos.some((b) => String(b.id) === String(form.id))) {
          alert("Ya existe un bolso con ese ID");
          setSaving(false);
          return;
        }
        const created = await createBolso({
          id: String(form.id),
          nombre: form.nombre,
          color: form.color,
          precio: form.precio,
          observaciones: form.observaciones ?? "",
          cantidad: form.cantidad,
        });
        setBolsos((prev) => [created, ...prev]);
      }
      setOpenModal(false);
    } catch (e) {
      alert("No se pudo guardar. Revisa que el backend esté accesible y los datos sean válidos.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado con Qwitcher Grypen */}
        <div className="mb-6 flex items-center justify-center">
          <h1
            className={`${qwitcher.className} text-[#e0a200] text-4xl sm:text-8xl leading-none text-center`}
          >
            Bolsos
          </h1>
        </div>

        {/* Acciones superiores */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
          {/* Nuevo */}
          <div>
            <button
              onClick={openCreate}
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition"
            >
              Nuevo bolso
            </button>
          </div>

          {/* Búsqueda */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px] mx-auto">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por ID, nombre, color u observaciones…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Botón Filtros */}
          <div className="sm:justify-self-end">
            <div className="relative inline-block">
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition flex items-center gap-2"
                aria-expanded={filtersOpen}
                aria-controls="filters-popover"
              >
                <span className="material-symbols-outlined">tune</span>
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-[#e0a200]/20 text-[#e0a200] text-xs">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <div
                  id="filters-popover"
                  className="absolute right-0 mt-2 z-30 w-[min(92vw,480px)] sm:w-[480px]
                             bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30
                             shadow-[0_2px_10px_rgba(255,234,7,0.08)] rounded-md p-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Color */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#c2b48d] w-20">Color</span>
                      <select
                        value={colorFilter}
                        onChange={(e) => setColorFilter(e.target.value)}
                        className="h-10 flex-1 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      >
                        <option value="">Todos</option>
                        {distinctColors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#c2b48d] w-20">Cantidad</span>
                      <select
                        value={qtyFilter}
                        onChange={(e) => setQtyFilter(e.target.value as "" | "con" | "sin")}
                        className="h-10 flex-1 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      >
                        <option value="">Todos</option>
                        <option value="con">Con existencias (&gt; 0)</option>
                        <option value="sin">Sin existencias (= 0)</option>
                      </select>
                    </div>

                    {/* Precio */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#c2b48d] w-20">Precio</span>
                      <input
                        type="number"
                        min={0}
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        placeholder="min"
                        className="h-10 w-28 flex-none rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
                      />
                      <span className="text-[#c2b48d]">—</span>
                      <input
                        type="number"
                        min={0}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        placeholder="max"
                        className="h-10 w-28 flex-none rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={clearFilters}
                      className="h-10 px-3 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
                    >
                      Limpiar
                    </button>
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="h-10 px-4 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 transition"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estado */}
        {loading && (
          <div className="mb-3 text-sm text-white/70">Cargando bolsos…</div>
        )}
        {error && (
          <div className="mb-3 text-sm text-red-400">{error}</div>
        )}
        {!loading && !error && (
          <div className="mb-2 text-sm text-white/70">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} {q || colorFilter || minPrice || maxPrice || qtyFilter ? "(filtrado)" : ""}
          </div>
        )}

        {/* Tabla con acciones */}
        <Table2
          rows={filtered}
          columns={columns as any}
          initialSortKey={"nombre"}
          showActions
          onEdit={openEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editMode ? "Editar bolso" : "Añadir bolso"}
        actions={
          <>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              form="bolso-form"
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              {editMode ? "Guardar cambios" : "Crear"}
            </button>
          </>
        }
      >
        <form id="bolso-form" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">ID</label>
            <input
              value={String(form.id ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              disabled={editMode || saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 disabled:opacity-60"
              placeholder="BOLSO123"
              required={!editMode}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Color</label>
            <input
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Precio</label>
            <input
              type="number"
              step="0.01"
              value={form.precio}
              onChange={(e) => setForm((f) => ({ ...f, precio: Number(e.target.value) }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-[#c2b48d]">Observaciones</label>
            <input
              value={form.observaciones ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="(Opcional)"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Cantidad</label>
            <input
              type="number"
              value={form.cantidad}
              onChange={(e) => setForm((f) => ({ ...f, cantidad: Number(e.target.value) }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            />
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
