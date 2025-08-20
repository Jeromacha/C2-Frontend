// src/pages/Inventario/ropa/index.tsx
import AppLayout from "@/components/layout/AppLayout";
import Table2 from "@/components/ui/table2";
import Modal from "@/components/ui/Modal";
import { useEffect, useMemo, useRef, useState } from "react";
import { Qwitcher_Grypen } from "next/font/google";
import {
  Ropa,
  getRopa,
  createRopa,
  updateRopa,
  deleteRopa,
} from "@/services/ropa";
import { getCategoriasRopa, CategoriaRopa } from "@/services/categorias-ropa";
import { createTallaRopa, updateTallaRopa } from "@/services/tallas-ropa";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

// Tallas base y copas soportadas en UI
const SIZES = ["XS", "S", "M", "L"] as const;
const CUP_SIZES = [34, 36] as const; // base, pero ahora complementaremos con lo que venga de BD
type SizeKey = typeof SIZES[number];
type TallajeModo = "XS_L" | "UNICA" | "UNICA_COPA" | "XS_L_COPA";

const totalTallas = (r?: Ropa) =>
  (r?.tallas ?? []).reduce((acc, t) => acc + (Number(t.cantidad) || 0), 0);

// Normaliza cualquier texto de talla a la forma que usamos en UI/back:
function normalizeKey(raw: string): string {
  let k = (raw || "").trim().toUpperCase();
  k = k
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U");
  k = k.replace(/\s+/g, " ");
  k = k.replace(/\s*CUP\s*/g, " COPA ");
  k = k.replace(/ÚNICA|UNICA|U N I C A/g, "UNICA");

  const cupMatch = k.match(/COPA[\s:_-]*([0-9]+)/);
  if (cupMatch) {
    const num = cupMatch[1];
    if (/^UNICA(\b|$)/.test(k)) return `UNICA__COPA_${num}`;
    const sizeMatch = k.match(/\b(XS|S|M|L)\b/);
    if (sizeMatch) return `${sizeMatch[1]}__COPA_${num}`;
  }
  if (/^UNICA(\b|$)/.test(k)) return "UNICA";
  const sizeOnly = k.match(/^(XS|S|M|L)$/);
  if (sizeOnly) return sizeOnly[1];
  if (/^(UNICA|XS|S|M|L)(?:__COPA_\d+)?$/.test(k)) return k;
  return k;
}

function inferModoFromRow(row?: Ropa): TallajeModo {
  const list = (row?.tallas ?? []).map((t) => normalizeKey(String(t.talla)));
  const hasUnica = list.some((k) => k === "UNICA" || k.startsWith("UNICA__COPA_"));
  const hasCopa = list.some((k) => /__COPA_\d+/.test(k));
  const hasBase = list.some((k) => /^(XS|S|M|L)(?:__COPA_\d+)?$/.test(k));
  if (hasUnica && hasCopa) return "UNICA_COPA";
  if (hasUnica) return "UNICA";
  if (hasBase && hasCopa) return "XS_L_COPA";
  return "XS_L";
}

function extractCupsFromRow(row?: Ropa): number[] {
  const set = new Set<number>();
  (row?.tallas ?? []).forEach((t) => {
    const k = normalizeKey(String(t.talla));
    const m = k.match(/__COPA_(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n)) set.add(n);
    }
  });
  return Array.from(set);
}

export default function InventarioRopa() {
  // --- Estado remoto
  const [ropas, setRopas] = useState<Ropa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // categorías
  const [categorias, setCategorias] = useState<CategoriaRopa[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // Carga inicial
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [rs, cats] = await Promise.all([getRopa(), getCategoriasRopa()]);
        if (!alive) return;
        setRopas(rs ?? []);
        setCategorias(cats ?? []);
        setError("");
      } catch (e: any) {
        console.error("Error cargando ropa/categorías:", e?.response ?? e);
        setError("No se pudo cargar el inventario de ropa.");
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
  const [tallasTarget, setTallasTarget] = useState<Ropa | null>(null);

  // Modo de tallaje (afecta la UI del modal)
  const [tallajeMode, setTallajeMode] = useState<TallajeModo>("XS_L");

  // Copas dinámicas a partir de BD + base
  const [cups, setCups] = useState<number[]>(Array.from(CUP_SIZES));

  // Formulario de tallas
  const [tallasForm, setTallasForm] = useState<Record<string, number | "">>({});

  const openTallasModal = (row: Ropa) => {
    setTallasTarget(row);
    const mode = inferModoFromRow(row);
    setTallajeMode(mode);
    const discovered = extractCupsFromRow(row);
    const mergedCups = Array.from(new Set([...CUP_SIZES, ...discovered])).sort(
      (a, b) => a - b
    );
    setCups(mergedCups);
    const map: Record<string, number | ""> = {};
    if (mode === "XS_L") {
      SIZES.forEach((s) => (map[s] = ""));
    } else if (mode === "UNICA") {
      map["UNICA"] = "";
    } else if (mode === "UNICA_COPA") {
      mergedCups.forEach((c) => (map[`UNICA__COPA_${c}`] = ""));
    } else {
      SIZES.forEach((s) => mergedCups.forEach((c) => (map[`${s}__COPA_${c}`] = "")));
    }
    (row.tallas ?? []).forEach((t) => {
      const k = normalizeKey(String(t.talla));
      if (k in map) map[k] = Number(t.cantidad) || 0;
    });
    setTallasForm(map);
    setTallasModalOpen(true);
  };

  const columns = [
    { key: "nombre", label: "Nombre", className: "max-w-[220px] truncate" },
    { key: "color", label: "Color", className: "max-w-[160px] truncate" },
    {
      key: "tallas",
      label: "Tallas",
      className: "max-w-[160px] truncate",
      render: (_: any, row: Ropa) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openTallasModal(row);
          }}
          className="h-8 px-3 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 text-sm"
          title="Ver tallas"
        >
          Ver
        </button>
      ),
    },
    {
      key: "precio",
      label: "Precio",
      className: "max-w-[140px] truncate",
      render: (v: number) => `$${(v ?? 0).toLocaleString("es-CO")}`,
    },
    { key: "categoriaNombre", label: "Categoría", className: "max-w-[180px] truncate" },
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
        new Set(ropas.map((r) => (r.categoriaNombre || "").trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [ropas]
  );

  const filtered = useMemo(() => {
    const qlc = q.trim().toLowerCase();
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;

    return ropas.filter((r) => {
      const hayTexto =
        !qlc ||
        (r.nombre ?? "").toLowerCase().includes(qlc) ||
        (r.color ?? "").toLowerCase().includes(qlc) ||
        (r.categoriaNombre ?? "").toLowerCase().includes(qlc) ||
        (r.observaciones ?? "").toLowerCase().includes(qlc);

      const hayCat = !catFilter || r.categoriaNombre === catFilter;
      const hayMin = min === undefined || r.precio >= min;
      const hayMax = max === undefined || r.precio <= max;

      const total = totalTallas(r);
      const hayCantidad =
        qtyFilter === ""
          ? true
          : qtyFilter === "con"
          ? total > 0
          : total === 0;

      return hayTexto && hayCat && hayMin && hayMax && hayCantidad;
    });
  }, [ropas, q, catFilter, minPrice, maxPrice, qtyFilter]);

  // ID sintético para que Table2 pueda mapear acciones por fila
  const makeId = (r: Pick<Ropa, "nombre" | "color">) => `${r.nombre}__${r.color}`;
  const rowsConId = useMemo(
    () => filtered.map((r) => ({ ...r, id: makeId(r) })),
    [filtered]
  );

  const clearFilters = () => {
    setCatFilter("");
    setMinPrice("");
    setMaxPrice("");
    setQtyFilter("");
  };

  // --- Modal (crear/editar)
  const [openModal, setOpenModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    nombre: string;
    color: string;
    precio: number | "";
    categoriaNombre: string;
    observaciones: string | "";
    imagen_url: string;
  }>({
    nombre: "",
    color: "",
    precio: "" as "",
    categoriaNombre: "",
    observaciones: "",
    imagen_url: "",
  });

  function openCreate() {
    setEditMode(false);
    setForm({
      nombre: "",
      color: "",
      precio: "" as "",
      categoriaNombre: "",
      observaciones: "",
      imagen_url: "",
    });
    setOpenModal(true);
  }

  function openEdit(row: Ropa) {
    setEditMode(true);
    setForm({
      nombre: row.nombre ?? "",
      color: row.color ?? "",
      precio: (row.precio ?? 0) as number,
      categoriaNombre: row.categoriaNombre ?? "",
      observaciones: (row.observaciones ?? "") as string,
      imagen_url: (row as any)?.imagen_url ?? "",
    });
    setOpenModal(true);
  }

  async function onDelete(row: Ropa) {
    if (!confirm(`¿Eliminar prenda "${row.nombre}" (${row.color})?`)) return;
    try {
      setRopas((prev) =>
        prev.filter((r) => !(r.nombre === row.nombre && r.color === row.color))
      );
      await deleteRopa(row.nombre, row.color);
    } catch (e) {
      try {
        const data = await getRopa();
        setRopas(data);
      } catch {}
      alert("No se pudo eliminar la prenda.");
      console.error(e);
    }
  }

  // ===== FIX KEBAB: aceptar row completo o solo id =====
  function resolveRow(rowOrId: any): Ropa | undefined {
    if (!rowOrId) return undefined;
    if (typeof rowOrId === "string") {
      const found = ropas.find((r) => makeId(r) === rowOrId);
      return found;
    }
    // Si llega un objeto con nombre/color, úsalo tal cual
    if (rowOrId && typeof rowOrId === "object") {
      if (rowOrId.nombre && rowOrId.color) return rowOrId as Ropa;
      // si llega { id }, resolver
      if (rowOrId.id && typeof rowOrId.id === "string") {
        const found = ropas.find((r) => makeId(r) === rowOrId.id);
        return found;
      }
    }
    return undefined;
  }

  const handleEdit = (rowOrId: any) => {
    const row = resolveRow(rowOrId);
    if (!row) {
      alert("No se pudo identificar la prenda para editar.");
      return;
    }
    openEdit(row);
  };

  const handleDelete = (rowOrId: any) => {
    const row = resolveRow(rowOrId);
    if (!row) {
      alert("No se pudo identificar la prenda para eliminar.");
      return;
    }
    onDelete(row);
  };
  // ================================================

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      if (!form.nombre || !form.color) {
        alert("Nombre y color son obligatorios.");
        setSaving(false);
        return;
      }
      if (form.precio === "" || isNaN(Number(form.precio))) {
        alert("El precio es obligatorio.");
        setSaving(false);
        return;
      }

      const payload = {
        nombre: form.nombre,
        color: form.color,
        precio: Number(form.precio),
        categoriaNombre: form.categoriaNombre,
        observaciones: form.observaciones || "",
        imagen_url: String(form.imagen_url ?? ""),
      };

      if (editMode) {
        const updated = await updateRopa(form.nombre, form.color, {
          precio: payload.precio,
          categoriaNombre: payload.categoriaNombre,
          observaciones: payload.observaciones,
        });
        setRopas((prev) =>
          prev.map((r) =>
            r.nombre === updated.nombre && r.color === updated.color ? updated : r
          )
        );
      } else {
        if (ropas.some((r) => r.nombre === form.nombre && r.color === form.color)) {
          alert("Ya existe una prenda con ese nombre y color.");
          setSaving(false);
          return;
        }
        const created = await createRopa(payload);
        setRopas((prev) => [created, ...prev]);
      }
      setOpenModal(false);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.error("Error guardando prenda:", e?.response ?? e);
      alert(
        `No se pudo guardar. Respuesta del servidor${
          status ? ` (${status})` : ""
        }:\n${data ? JSON.stringify(data, null, 2) : e?.message || "Error desconocido"}`
      );
    } finally {
      setSaving(false);
    }
  }

  // ===== Guardado de tallas =====
  const [tallasSaving, setTallasSaving] = useState(false);

  async function saveTallas() {
    if (!tallasTarget) return;
    setTallasSaving(true);
    try {
      const existing = new Map<string, number>();
      (tallasTarget.tallas ?? []).forEach((t) => {
        const k = normalizeKey(String(t.talla));
        existing.set(k, Number(t.cantidad) || 0);
      });

      const ropa_nombre = tallasTarget.nombre;
      const ropa_color = tallasTarget.color;

      for (const k of Object.keys(tallasForm)) {
        const cantidad = tallasForm[k] === "" ? 0 : Number(tallasForm[k]);
        if (!Number.isFinite(cantidad) || cantidad < 0) continue;

        if (existing.has(k)) {
          const prev = existing.get(k)!;
          if (prev !== cantidad) {
            await updateTallaRopa(k, ropa_nombre, ropa_color, { cantidad } as any);
          }
        } else {
          if (cantidad > 0) {
            await createTallaRopa({
              talla: k,
              cantidad,
              // @ts-ignore
              ropa_nombre,
              // @ts-ignore
              ropa_color,
            } as any);
          }
        }
      }

      const newTallas = Object.entries(tallasForm)
        .map(([k, v]) => ({ talla: k, cantidad: v === "" ? 0 : Number(v) }))
        .filter((t) => (t.cantidad ?? 0) > 0);

      setRopas((prev) =>
        prev.map((r) =>
          r.nombre === tallasTarget.nombre && r.color === tallasTarget.color
            ? { ...r, tallas: newTallas as any }
            : r
        )
      );

      setTallasModalOpen(false);
    } catch (e: any) {
      console.error(e);
      const status = e?.response?.status;
      const data = e?.response?.data;
      alert(
        `No se pudieron guardar las tallas${status ? ` (HTTP ${status})` : ""}.\n` +
          (data ? JSON.stringify(data, null, 2) : e?.message || "")
      );
    } finally {
      setTallasSaving(false);
    }
  }

  function renderTallasInputs() {
    if (tallajeMode === "XS_L") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SIZES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-10 text-sm text-[#c2b48d]">{s}</span>
              <input
                type="number"
                min={0}
                value={(tallasForm as any)[s] === "" ? "" : (tallasForm as any)[s]}
                onChange={(e) =>
                  setTallasForm((m) => ({
                    ...m,
                    [s]: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                className="h-10 w-20 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
              />
            </div>
          ))}
        </div>
      );
    }

    if (tallajeMode === "UNICA") {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-16 text-sm text-[#c2b48d]">Única</span>
            <input
              type="number"
              min={0}
              value={(tallasForm as any)["UNICA"] === "" ? "" : (tallasForm as any)["UNICA"]}
              onChange={(e) =>
                setTallasForm((m) => ({
                  ...m,
                  UNICA: e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              className="h-10 w-24 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
            />
          </div>
        </div>
      );
    }

    if (tallajeMode === "UNICA_COPA") {
      return (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {cups.map((c) => {
            const k = `UNICA__COPA_${c}`;
            return (
              <div key={k} className="inline-flex items-center gap-2">
                <span className="whitespace-nowrap text-sm text-[#c2b48d]">Copa {c}</span>
                <input
                  type="number"
                  min={0}
                  value={(tallasForm as any)[k] === "" ? "" : (tallasForm as any)[k]}
                  onChange={(e) =>
                    setTallasForm((m) => ({
                      ...m,
                      [k]: e.target.value === "" ? "" : Number(e.target.value),
                    }))
                  }
                  className="h-9 w-[72px] rounded-md bg-black/60 border border-[#e0a200]/30 px-2 text-sm text-center outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="overflow-auto">
        <div className="inline-block">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `80px repeat(${cups.length}, 90px)`,
              columnGap: "8px",
              rowGap: "6px",
            }}
          >
            <div />
            {cups.map((c) => (
              <div
                key={`head-${c}`}
                className="px-1 py-1 text-xs text-[#c2b48d] text-center"
              >
                Copa {c}
              </div>
            ))}

            {SIZES.map((s) => (
              <div key={`row-${s}`} className="contents">
                <div className="px-1 py-1 text-sm text-[#c2b48d]">{s}</div>
                {cups.map((c) => {
                  const k = `${s}__COPA_${c}`;
                  return (
                    <div key={k} className="px-1 py-1 flex items-center justify-center">
                      <input
                        type="number"
                        min={0}
                        value={(tallasForm as any)[k] === "" ? "" : (tallasForm as any)[k]}
                        onChange={(e) =>
                          setTallasForm((m) => ({
                            ...m,
                            [k]: e.target.value === "" ? "" : Number(e.target.value),
                          }))
                        }
                        className="h-9 w-[68px] rounded-md bg-black/60 border border-[#e0a200]/30 px-2 text-sm text-center outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado */}
        <div className="mb-6 flex items-center justify-center">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}>
            Ropa
          </h1>
        </div>

        {/* Acciones superiores */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
          <div>
            <button
              onClick={openCreate}
              className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition"
            >
              Nueva prenda
            </button>
          </div>

          {/* Búsqueda */}
          <div className="sm:justify-self-center w-full">
            <div className="flex items-center gap-2 w-full max-w-[380px] mx-auto">
              <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, color, categoría u observaciones…"
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
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cantidad total */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm text-[#c2b48d] w-24 shrink-0">Cantidad</span>
                      <select
                        value={qtyFilter}
                        onChange={(e) => setQtyFilter(e.target.value as "" | "con" | "sin")}
                        className="h-10 flex-1 min-w-0 rounded-md bg-black/60 border border-[#e0a200]/30 px-2 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                      >
                        <option value="">Todas</option>
                        <option value="con">Con existencias (&gt; 0)</option>
                        <option value="sin">Sin existencias (= 0)</option>
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
        {loading && <div className="mb-3 text-sm text-white/70">Cargando ropa…</div>}
        {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
        {!loading && !error && (
          <div className="mb-2 text-sm text-white/70">
            {rowsConId.length} resultado{rowsConId.length !== 1 ? "s" : ""}{" "}
            {q || catFilter || minPrice || maxPrice || qtyFilter ? "(filtrado)" : ""}
          </div>
        )}

        {/* Tabla (wrapper evita que el kebab se corte) */}
        <div className="relative overflow-visible">
          <Table2
            rows={rowsConId as any}
            columns={columns as any}
            initialSortKey={"nombre"}
            showActions
            // >>> FIX KEBAB: usar handlers que aceptan row | id
            onEdit={handleEdit as any}
            onDelete={handleDelete as any}
            // Compat extra por si Table2 usa otros nombres
            {...({ onEditRow: handleEdit, onDeleteRow: handleDelete } as any)}
          />
        </div>
      </div>

      {/* Modal Crear/Editar Ropa */}
      <Modal
        open={openModal}
        onClose={() => setOpenModal(false)}
        title={editMode ? "Editar prenda" : "Añadir prenda"}
        actions={
          <>
            <button
              onClick={() => setOpenModal(false)}
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              form="ropa-form"
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              {editMode ? "Guardar cambios" : "Crear"}
            </button>
          </>
        }
      >
        <form id="ropa-form" onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nombre (PK parte 1) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              disabled={saving || editMode}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 disabled:opacity-60"
              required
            />
          </div>

          {/* Color (PK parte 2) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Color</label>
            <input
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              disabled={saving || editMode}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 disabled:opacity-60"
              required
            />
          </div>

          {/* Categoría (Select desde servicio) */}
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

          {/* Observaciones (opcional) */}
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

          {/* Imagen URL (opcional) */}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-sm text-[#c2b48d]">Imagen URL (opcional)</label>
            <input
              value={form.imagen_url}
              onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
              disabled={saving}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              placeholder="https://…"
            />
          </div>
        </form>
      </Modal>

      {/* Modal de Tallas */}
      <Modal
        open={tallasModalOpen}
        onClose={() => setTallasModalOpen(false)}
        title={tallasTarget ? `Tallas — ${tallasTarget!.nombre}` : "Tallas"}
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
        {/* Selector de modo */}
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="text-sm text-[#c2b48d] mr-2">Tipo de tallaje:</label>
          {[
            { v: "XS_L", txt: "XS–L" },
            { v: "UNICA", txt: "Única" },
            { v: "UNICA_COPA", txt: "Única + copa" },
            { v: "XS_L_COPA", txt: "XS–L + copa" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                setTallajeMode(opt.v as TallajeModo);
                setTallasForm((prev) => {
                  const next: Record<string, number | ""> = {};
                  if (opt.v === "XS_L") {
                    SIZES.forEach((s) => (next[s] = s in prev ? prev[s] : ""));
                  } else if (opt.v === "UNICA") {
                    next["UNICA"] = "UNICA" in prev ? prev["UNICA"] : "";
                  } else if (opt.v === "UNICA_COPA") {
                    cups.forEach((c) => {
                      const k = `UNICA__COPA_${c}`;
                      next[k] = k in prev ? prev[k] : "";
                    });
                  } else {
                    SIZES.forEach((s) =>
                      cups.forEach((c) => {
                        const k = `${s}__COPA_${c}`;
                        next[k] = k in prev ? prev[k] : "";
                      })
                    );
                  }
                  return next;
                });
              }}
              className={[
                "px-3 py-1 rounded-md border",
                tallajeMode === opt.v
                  ? "border-[#e0a200]/60 bg-[#e0a200]/20 text-[#e0a200]"
                  : "border-[#e0a200]/30 text-[#c2b48d] hover:bg-[#e0a200]/10",
              ].join(" ")}
            >
              {opt.txt}
            </button>
          ))}
        </div>

        {/* Inputs según modo */}
        {renderTallasInputs()}

        <p className="mt-3 text-xs text-white/60">
          Las combinaciones se guardan como claves de talla (p. ej. <code>UNICA__COPA_34</code> o{" "}
          <code>M__COPA_36</code>). Deja en blanco o 0 para indicar que no hay stock.
        </p>
      </Modal>
    </AppLayout>
  );
}
