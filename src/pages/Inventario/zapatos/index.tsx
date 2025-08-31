// src/pages/Inventario/zapatos/index.tsx
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { useEffect, useMemo, useRef, useState } from "react";
import { Qwitcher_Grypen } from "next/font/google";
import {
  Zapato,
  getZapatos,
  createZapato,
  updateZapato,
  deleteZapato,
} from "@/services/zapatos";
import { createTalla, updateTalla } from "@/services/tallas";
import { getCategorias, Categoria } from "@/services/categorias";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

// util: total de tallas
const totalTallas = (z?: Zapato) =>
  (z?.tallas ?? []).reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

// lista típica de tallas
const COMMON_SIZES = [35, 35.5, 36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41];

export default function InventarioZapatos() {
  // --- Data/estado remoto
  const [zapatos, setZapatos] = useState<Zapato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // categorías para el select
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // Carga inicial de zapatos y categorías
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [zs, cats] = await Promise.all([getZapatos(), getCategorias()]);
        if (!alive) return;
        setZapatos(zs ?? []);
        setCategorias(cats ?? []);
        setError("");
      } catch (e: any) {
        const status = e?.response?.status;
        const data = e?.response?.data;
        setError(
          `No se pudo cargar el inventario de zapatos${
            status ? ` (HTTP ${status})` : ""
          }${data ? `: ${JSON.stringify(data)}` : ""}.`
        );
        console.error("Error cargando zapatos/categorías:", e?.response ?? e);
      } finally {
        if (alive) {
          setLoading(false);
          setCatsLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // --- Columnas
  const [tallasModalOpen, setTallasModalOpen] = useState(false);
  const [tallasTarget, setTallasTarget] = useState<Zapato | null>(null);

  const openTallasModal = (row: Zapato) => {
    setTallasTarget(row);
    const map: Record<string, number | ""> = {};
    COMMON_SIZES.forEach((s) => (map[String(s)] = ""));
    (row.tallas ?? []).forEach((t) => {
      map[String(t.talla)] = Number(t.cantidad) || 0;
    });
    setTallasForm(map);
    setTallasModalOpen(true);
  };

  const columns = [
    { key: "id", label: "ID", className: "max-w-[120px] truncate" },
    { key: "categoriaNombre", label: "Categoría", className: "max-w-[180px] truncate" },
    { key: "nombre", label: "Nombre", className: "max-w-[220px] truncate" },
    {
      key: "tallas",
      label: "Tallas",
      className: "max-w-[160px] truncate",
      render: (_: any, row: Zapato) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openTallasModal(row);
          }}
          className="h-8 px-3 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 text-sm"
          >
            Ver
          </button>
        ),
    },
    {
      key: "cantidadTotal",
      label: "Cantidad total",
      className: "max-w-[140px] truncate",
      render: (_: any, row: Zapato) => totalTallas(row),
    },
    {
      key: "precio",
      label: "Precio",
      className: "max-w-[160px] truncate",
      render: (v: number) => `$${(v ?? 0).toLocaleString("es-CO")}`,
    },
    { key: "observaciones", label: "Observaciones", className: "max-w-[260px] truncate" },
  ] as const;

  // --- Búsqueda + Filtros
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [qtyFilter, setQtyFilter] = useState<"" | "con" | "sin">("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtersBtnRef = useRef<HTMLButtonElement | null>(null);
  const filtersPopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filtersPopRef.current &&
        !filtersPopRef.current.contains(target) &&
        filtersBtnRef.current &&
        !filtersBtnRef.current.contains(target)
      ) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filtersOpen]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (catFilter) n++;
    if (minPrice) n++;
    if (maxPrice) n++;
    if (qtyFilter) n++;
    return n;
  }, [catFilter, minPrice, maxPrice, qtyFilter]);

  const distinctCats = useMemo(
    () =>
      Array.from(
        new Set(zapatos.map((z) => (z.categoriaNombre || "").trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [zapatos]
  );

  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;

    return zapatos.filter((z) => {
      const hayTexto =
        !qlc ||
        String(z.id).toLowerCase().includes(qlc) ||
        (z.nombre ?? "").toLowerCase().includes(qlc) ||
        (z.categoriaNombre ?? "").toLowerCase().includes(qlc) ||
        (z.observaciones ?? "").toLowerCase().includes(qlc);

      const hayCat = !catFilter || z.categoriaNombre === catFilter;
      const hayMin = min === undefined || z.precio >= min;
      const hayMax = max === undefined || z.precio <= max;

      const total = totalTallas(z);
      const hayCantidad = qtyFilter === "" ? true : qtyFilter === "con" ? total > 0 : total === 0;

      return hayTexto && hayCat && hayMin && hayMax && hayCantidad;
    });
  }, [zapatos, q, catFilter, minPrice, maxPrice, qtyFilter]);

  const clearFilters = () => {
    setCatFilter("");
    setMinPrice("");
    setMaxPrice("");
    setQtyFilter("");
  };

  // ===== Compatibilidad con Table2 (aceptar row o id) =====
  function resolveRow(rowOrId: any): Zapato | undefined {
    if (!rowOrId) return undefined;
    if (typeof rowOrId === "number") {
      return zapatos.find((z) => z.id === rowOrId);
    }
    if (typeof rowOrId === "string") {
      const num = Number(rowOrId);
      if (!Number.isNaN(num)) return zapatos.find((z) => z.id === num);
    }
    if (typeof rowOrId === "object") {
      if ("id" in rowOrId) {
        const num = Number((rowOrId as any).id);
        if (!Number.isNaN(num)) return zapatos.find((z) => z.id === num) || (rowOrId as Zapato);
      }
      return rowOrId as Zapato;
    }
    return undefined;
  }

  const handleEdit = (rowOrId: any) => {
    const row = resolveRow(rowOrId);
    if (!row) {
      alert("No se pudo identificar el zapato para editar.");
      return;
    }
    openEdit(row);
  };

  const handleDelete = (rowOrId: any) => {
    const row = resolveRow(rowOrId);
    if (!row) {
      alert("No se pudo identificar el zapato para eliminar.");
      return;
    }
    onDelete(row);
  };
  // =======================================================

  // --- Modal (crear/editar) de zapato
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    id: number | "";
    nombre: string;
    ubicacion: string;   // opcional a nivel de negocio, pero enviaremos "" si no se llena
    imagen_url: string;  // idem
    precio: number | "";
    categoriaNombre: string;
    observaciones: string | "";
  }>({
    id: "" as "",
    nombre: "",
    ubicacion: "",
    imagen_url: "",
    precio: "" as "",
    categoriaNombre: "",
    observaciones: "",
  });

  function openCreate() {
    setEditMode(false);
    setForm({
      id: "" as "",
      nombre: "",
      ubicacion: "",
      imagen_url: "",
      precio: "" as "",
      categoriaNombre: "",
      observaciones: "",
    });
    setOpenModal(true);
  }

  function openEdit(row: Zapato) {
    setEditMode(true);
    setForm({
      id: row.id,
      nombre: row.nombre ?? "",
      ubicacion: (row as any)?.ubicacion ?? "",
      imagen_url: (row as any)?.imagen_url ?? "",
      precio: (row.precio ?? 0) as number,
      categoriaNombre: row.categoriaNombre ?? "",
      observaciones: (row.observaciones ?? "") as string,
    });
    setOpenModal(true);
  }

  async function onDelete(row: Zapato) {
    if (!confirm(`¿Eliminar zapato "${row.nombre}" (ID ${row.id})?`)) return;
    try {
      setZapatos((prev) => prev.filter((z) => z.id !== row.id));
      await deleteZapato(Number(row.id));
    } catch (e) {
      try {
        const data = await getZapatos();
        setZapatos(data);
      } catch {}
      alert("No se pudo eliminar el zapato.");
      console.error(e);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      // ID requerido
      if (form.id === "" || isNaN(Number(form.id))) {
        alert("El ID numérico es obligatorio.");
        setSaving(false);
        return;
      }
      if (!form.nombre.trim()) {
        alert("El nombre es obligatorio.");
        setSaving(false);
        return;
      }
      if (form.precio === "" || isNaN(Number(form.precio))) {
        alert("El precio es obligatorio.");
        setSaving(false);
        return;
      }
      if (!form.categoriaNombre.trim()) {
        alert("Selecciona una categoría.");
        setSaving(false);
        return;
      }
      if (zapatos.some((z) => z.id === Number(form.id)) && !editMode) {
        alert("Ya existe un zapato con ese ID.");
        setSaving(false);
        return;
      }

      // 🚩 CAMBIO CLAVE: enviar SIEMPRE las claves opcionales con "" si vienen vacías
      const payloadCreateOrPutBase = {
        nombre: form.nombre.trim(),
        precio: Number(form.precio),
        categoriaNombre: form.categoriaNombre,
        ubicacion: (form.ubicacion ?? "").trim(),          // <- "" si no se diligencia
        imagen_url: (form.imagen_url ?? "").trim(),        // <- "" si no se diligencia
        ...(form.observaciones !== undefined
          ? { observaciones: (form.observaciones ?? "").trim() }
          : {}),
      };

      if (editMode) {
        const updated = await updateZapato(Number(form.id), payloadCreateOrPutBase);
        setZapatos((prev) => prev.map((z) => (z.id === updated.id ? updated : z)));
      } else {
        const created = await createZapato({
          id: Number(form.id),
          ...payloadCreateOrPutBase,
        });
        setZapatos((prev) => [created, ...prev]);
      }

      setOpenModal(false);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.error("Error guardando zapato:", e?.response ?? e);
      alert(
        `No se pudo guardar. Respuesta del servidor${
          status ? ` (${status})` : ""
        }:\n${data ? JSON.stringify(data, null, 2) : e?.message || "Error desconocido"}`
      );
    } finally {
      setSaving(false);
    }
  }

  // ===== Modal de Tallas =====
  const [tallasSaving, setTallasSaving] = useState(false);
  const [tallasForm, setTallasForm] = useState<Record<string, number | "">>({});

  async function saveTallas() {
    if (!tallasTarget) return;
    setTallasSaving(true);
    try {
      const existing = new Map<number, number>();
      (tallasTarget.tallas ?? []).forEach((t) =>
        existing.set(Number(t.talla), Number(t.cantidad) || 0)
      );

      for (const k of Object.keys(tallasForm)) {
        const talla = Number(k);
        const val = tallasForm[k];
        const cantidad = val === "" ? 0 : Number(val);
        if (Number.isNaN(talla) || Number.isNaN(cantidad) || cantidad < 0) continue;

        if (existing.has(talla)) {
          const prev = existing.get(talla)!;
          if (prev !== cantidad) {
            await updateTalla(talla, Number(tallasTarget.id), { cantidad });
          }
        } else {
          if (cantidad > 0) {
            await createTalla({ talla, cantidad, zapato_id: Number(tallasTarget.id) });
          }
        }
      }

      const newTallas = Object.entries(tallasForm)
        .map(([k, v]) => ({ talla: Number(k), cantidad: v === "" ? 0 : Number(v) }))
        .filter((t) => (t.cantidad ?? 0) > 0)
        .sort((a, b) => a.talla - b.talla);

      setZapatos((prev) =>
        prev.map((z) => (z.id === tallasTarget.id ? { ...z, tallas: newTallas as any } : z))
      );

      setTallasModalOpen(false);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.error("Error guardando tallas de zapato:", e?.response ?? e);
      alert(
        `No se pudieron guardar las tallas${
          status ? ` (HTTP ${status})` : ""
        }.\n${data ? JSON.stringify(data, null, 2) : e?.message || ""}`
      );
    } finally {
      setTallasSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado */}
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Zapatos
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
              Nuevo zapato
            </button>
          </div>

          {/* Búsqueda */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px] mx-auto">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por ID, nombre, categoría u observaciones…"
                className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
              />
            </div>
          </div>

          {/* Botón Filtros */}
          <div className="sm:justify-self-end">
            <div className="relative inline-block">
              <button
                ref={filtersBtnRef}
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
                  ref={filtersPopRef}
                  id="filters-popover"
                  className="
                    fixed left-1/2 -translate-x-1/2 top-[88px]
                    sm:absolute sm:top-auto sm:right-0 sm:left-auto sm:translate-x-0 sm:mt-2
                    z-50
                    w-[min(96vw,480px)] sm:w-[480px]
                    max-h-[80vh] overflow-auto
                    bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30
                    shadow-[0_2px_10px_rgba(255,234,7,0.08)] rounded-md p-3
                  "
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Categoría */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-[#c2b48d] w-24 shrink-0">Categoría</span>
                      <select
                        value={catFilter}
                        onChange={(e) => setCatFilter(e.target.value)}
                        className="h-10 flex-1 min-w-0 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      >
                        <option value="">Todas</option>
                        {distinctCats.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-[#c2b48d] w-24 shrink-0">Cantidad</span>
                      <select
                      value={qtyFilter}
                      onChange={(e) => setQtyFilter(e.target.value as "" | "con" | "sin")}
                      className="h-10 flex-1 min-w-0 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      >
                      <option value="">Todas</option>
                      <option value="con">Con stock</option>
                      <option value="sin">Sin stock</option>
                      </select>
                    </div>


                    {/* Precio */}
                    <div className="flex flex-wrap items-center gap-2 min-w-0 sm:col-span-2">
                      <span className="text-sm text-[#c2b48d] w-24 shrink-0">Precio</span>
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

                      <div className="ml-auto w-full sm:w-auto flex gap-2 justify-end">
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Estado */}
        {loading && <div className="mb-3 text-sm text-white/70">Cargando zapatos…</div>}
        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="mb-2 text-sm text-white/70">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}{" "}
            {q || catFilter || minPrice || maxPrice || qtyFilter ? "(filtrado)" : ""}
          </div>
        )}

        {/* Tabla con acciones */}
        <div className="relative overflow-visible">
          <Table2
            rows={filtered as any}
            columns={columns as any}
            initialSortKey={"nombre"}
            showActions
            onEdit={handleEdit as any}
            onDelete={handleDelete as any}
            {...({ onEditRow: handleEdit, onDeleteRow: handleDelete } as any)}
          />
        </div>
      </div>

      {/* Modal Crear/Editar Zapato */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editMode ? "Editar zapato" : "Añadir zapato"}
        actions={
          <>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              form="zapato-form"
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              {editMode ? "Guardar cambios" : "Crear"}
            </button>
          </>
        }
      >
        <form id="zapato-form" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ID (obligatorio) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">ID</label>
            <input
              value={form.id === "" ? "" : String(form.id)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  id: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              disabled={editMode || saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 disabled:opacity-60"
              placeholder="101"
              required={!editMode}
              type="number"
            />
          </div>

          {/* Nombre */}
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

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Categoría</label>
            <select
              value={form.categoriaNombre}
              onChange={(e) => setForm((f) => ({ ...f, categoriaNombre: e.target.value }))}
              disabled={saving || catsLoading}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            >
              <option value="" disabled>
                {catsLoading ? "Cargando categorías..." : "Selecciona una categoría"}
              </option>
              {categorias.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Precio</label>
            <input
              type="number"
              step="0.01"
              value={form.precio === "" ? "" : form.precio}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  precio: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              required
            />
          </div>

          {/* Ubicación (opcional → mandamos "" si vacío) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Ubicación (opcional)</label>
            <input
              value={form.ubicacion}
              onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="Estantería A-1…"
            />
          </div>

          {/* Imagen URL (opcional → mandamos "" si vacío) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Imagen URL (opcional)</label>
            <input
              value={form.imagen_url}
              onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="https://…"
            />
          </div>

          {/* Observaciones (opcional → mandamos "" si vacío) */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-[#c2b48d]">Observaciones (opcional)</label>
            <input
              value={form.observaciones ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="(Opcional)"
            />
          </div>
        </form>
      </Modal>

      {/* Modal de Tallas */}
      <Modal
        open={tallasModalOpen}
        onClose={() => setTallasModalOpen(false)}
        title={tallasTarget ? `Tallas — ${tallasTarget.nombre}` : "Tallas"}
        actions={
          <>
            <button
              onClick={() => setTallasModalOpen(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={saveTallas}
              disabled={tallasSaving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Guardar tallas
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COMMON_SIZES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-14 text-sm text-[#c2b48d]">{s}</span>
              <input
                type="number"
                min={0}
                value={tallasForm[String(s)] === "" ? "" : tallasForm[String(s)]}
                onChange={(e) =>
                  setTallasForm((m) => ({
                    ...m,
                    [String(s)]: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="h-10 w-20 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/60">Deja en blanco o 0 para indicar que no hay stock de esa talla.</p>
      </Modal>
    </AppLayout>
  );
}
