import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { createEntrada, TipoProducto } from "@/services/entradas";

type RopaItem = {
  nombre: string;
  color: string;
  precio: number;
  tallas?: Array<{ talla: string; cantidad: number }>;
};
type ZapatoItem = {
  id: number;
  nombre: string;
  color: string;
  precio: number;
  tallas?: Array<{ talla: string | number; cantidad: number }>;
};
type BolsoItem = {
  id: string;
  nombre: string;
  color?: string;
  precio: number;
};

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

function getUsuarioIdAuto(): number | undefined {
  if (typeof window === "undefined") return undefined;
  const token = window.localStorage.getItem("access_token");
  if (token) {
    try {
      const [, payloadB64] = token.split(".");
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
        const maybe = payload?.userId ?? payload?.userid ?? payload?.id ?? payload?.sub ?? undefined;
        if (maybe && !isNaN(Number(maybe))) return Number(maybe);
      }
    } catch {}
  }
  const v = window.localStorage.getItem("usuario_id");
  if (v && !isNaN(Number(v))) return Number(v);
  return undefined;
}

/* -------------------- Helpers UI -------------------- */

function labelZapato(z: ZapatoItem) {
  return `${z.nombre}${z.color ? ` — ${z.color}` : ""} — $${z.precio?.toLocaleString("es-CO")}`;
}
function labelRopa(r: RopaItem) {
  return `${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`;
}
function labelBolso(b: BolsoItem) {
  return `${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`;
}

/* Una “línea” ahora soporta una grilla de tallas -> cantidades */
type SizeMap = Record<string, number>; // talla -> cantidad (>0)
type Linea = {
  id: string;
  tipo: TipoProducto;
  escribible: string; // input libre (datalist)
  selZapato?: ZapatoItem | null;
  selRopa?: RopaItem | null;
  selBolso?: BolsoItem | null;

  // Grilla de tallas (zapato/ropa)
  sizeMap: SizeMap;

  // Para bolso, cantidad única
  cantBolso: number | "";

  // Crear producto inline
  crearNuevo: boolean;
  nuevoNombre: string;
  nuevoColor: string;
  nuevoPrecio: string; // como texto para input
};

function nuevaLinea(): Linea {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "zapato",
    escribible: "",
    selZapato: null,
    selRopa: null,
    selBolso: null,
    sizeMap: {},       // { "38": 2, "39": 1, ... }
    cantBolso: "" as "",
    crearNuevo: false,
    nuevoNombre: "",
    nuevoColor: "",
    nuevoPrecio: "",
  };
}

/* Cuadricula de tallas SIN precarga de sugeridas */
function SizeGrid({
  sizeMap,
  onChange,
  // sugeridas se acepta para compatibilidad pero NO se usa (no precargamos nada)
  sugeridas,
  placeholderTalla = "Talla",
}: {
  sizeMap: SizeMap;
  onChange: (next: SizeMap) => void;
  sugeridas?: string[];
  placeholderTalla?: string;
}) {
  const [tallaTmp, setTallaTmp] = useState("");
  const [cantTmp, setCantTmp] = useState<string>("");

  function setQty(talla: string, qty: number) {
    const next = { ...sizeMap };
    if (!qty || qty <= 0) {
      delete next[talla];
    } else {
      next[talla] = qty;
    }
    onChange(next);
  }
  function removeTalla(talla: string) {
    const next = { ...sizeMap };
    delete next[talla];
    onChange(next);
  }
  function addManual() {
    const t = tallaTmp.trim();
    const c = Number(cantTmp);
    if (!t) return;
    if (!Number.isFinite(c) || c <= 0) return;
    setQty(t, c);
    setTallaTmp("");
    setCantTmp("");
  }

  return (
    <div className="space-y-3">
      {/* Lista de tallas agregadas por el usuario */}
      {Object.keys(sizeMap).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Object.entries(sizeMap).map(([t, qty]) => (
            <div key={t} className="flex items-center gap-2 rounded-md border border-white/15 px-2 py-1">
              <span className="text-sm text-white/80">{t}</span>
              <input
                type="number"
                min={0}
                value={qty === 0 ? "" : qty}
                onChange={(e) => setQty(t, e.target.value === "" ? 0 : Number(e.target.value))}
                className="h-8 w-16 rounded bg-black/60 border border-[#e0a200]/30 px-2 text-sm"
                placeholder="0"
              />
              <button
                type="button"
                onClick={() => removeTalla(t)}
                className="text-xs px-2 h-7 rounded-md border border-white/20 text-white hover:bg-white/10 ml-auto"
                title="Quitar talla"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inputs para agregar NUEVA talla (siempre debajo) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <input
          value={tallaTmp}
          onChange={(e) => setTallaTmp(e.target.value)}
          placeholder={placeholderTalla}
          className="h-10 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 col-span-2 sm:col-span-3"
        />
        <input
          type="number"
          min={1}
          value={cantTmp}
          onChange={(e) => setCantTmp(e.target.value)}
          placeholder="Cantidad"
          className="h-10 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 col-span-1 sm:col-span-2"
        />
        <button
          type="button"
          onClick={addManual}
          className="h-10 rounded-md border border-[#e0a200]/40 text-[#e0a200] hover:bg-[#e0a200]/10"
        >
          + Agregar talla
        </button>
      </div>
    </div>
  );
}

/* -------------------- Página -------------------- */

export default function NuevaEntradaCajaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [zapatos, setZapatos] = useState<ZapatoItem[]>([]);
  const [ropas, setRopas] = useState<RopaItem[]>([]);
  const [bolsos, setBolsos] = useState<BolsoItem[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([nuevaLinea()]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [zap, rop, bol] = await Promise.all([
          fetch(apiUrl("/zapatos")).then((r) => (r.ok ? r.json() : [])),
          fetch(apiUrl("/ropa")).then((r) => (r.ok ? r.json() : [])),
          fetch(apiUrl("/bolsos")).then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!alive) return;
        setZapatos(Array.isArray(zap) ? zap : []);
        setRopas(Array.isArray(rop) ? rop : []);
        setBolsos(Array.isArray(bol) ? bol : []);
      } catch (e) {
        console.error("Error cargando catálogos:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* --------- Resolvers selección por datalist --------- */
  function resolverSeleccion(l: Linea): Linea {
    if (l.tipo === "zapato") {
      const sel = zapatos.find((z) => labelZapato(z).toLowerCase() === l.escribible.trim().toLowerCase()) || null;
      // No precargamos tallas ni tocamos sizeMap automático
      return { ...l, selZapato: sel, selRopa: null, selBolso: null };
    }
    if (l.tipo === "ropa") {
      const sel = ropas.find((r) => labelRopa(r).toLowerCase() === l.escribible.trim().toLowerCase()) || null;
      return { ...l, selRopa: sel, selZapato: null, selBolso: null };
    }
    if (l.tipo === "bolso") {
      const sel = bolsos.find((b) => labelBolso(b).toLowerCase() === l.escribible.trim().toLowerCase()) || null;
      return { ...l, selBolso: sel, selZapato: null, selRopa: null };
    }
    return l;
  }

  function sugeridasDe(l: Linea): string[] {
    // Se mantiene por compatibilidad, pero NO se usa para precargar
    if (l.tipo === "zapato" && l.selZapato) return (l.selZapato.tallas || []).map((t) => String(t.talla));
    if (l.tipo === "ropa" && l.selRopa) return (l.selRopa.tallas || []).map((t) => String(t.talla));
    return [];
  }

  /* --------- Cambios de UI --------- */
  function cambiarTipo(idx: number, tipo: TipoProducto) {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              tipo,
              escribible: "",
              selZapato: null,
              selRopa: null,
              selBolso: null,
              sizeMap: {},
              cantBolso: "" as "",
              crearNuevo: false,
              nuevoNombre: "",
              nuevoColor: "",
              nuevoPrecio: "",
            }
          : l
      )
    );
  }
  function cambiarEscribible(idx: number, val: string) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? resolverSeleccion({ ...l, escribible: val }) : l)));
  }
  function setSizeMap(idx: number, next: SizeMap) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, sizeMap: next } : l)));
  }
  function setCantBolso(idx: number, val: string) {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, cantBolso: val === "" ? "" : Number(val) } : l))
    );
  }
  function toggleNuevo(idx: number) {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              crearNuevo: !l.crearNuevo,
              // limpiar selección actual al entrar a "nuevo"
              escribible: !l.crearNuevo ? "" : l.escribible,
              selZapato: !l.crearNuevo ? null : l.selZapato,
              selRopa: !l.crearNuevo ? null : l.selRopa,
              selBolso: !l.crearNuevo ? null : l.selBolso,
            }
          : l
      )
    );
  }
  function setNuevo(idx: number, field: "nuevoNombre" | "nuevoColor" | "nuevoPrecio", val: string) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: val } as Linea : l)));
  }

  /* --------- Crear producto inline --------- */
  async function crearProductoInline(idx: number) {
    const l = lineas[idx];
    const nombre = l.nuevoNombre.trim();
    const color = l.nuevoColor.trim();
    const precio = Number(l.nuevoPrecio);
    if (!nombre) return alert("Ingresa nombre.");
    if (!Number.isFinite(precio) || precio <= 0) return alert("Ingresa un precio válido.");

    try {
      let creado: any = null;

      if (l.tipo === "zapato") {
        const body = { nombre, color: color || undefined, precio };
        const res = await fetch(apiUrl("/zapatos"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("No se pudo crear el zapato.");
        creado = await res.json();
        // refrescar catálogo local
        const zres = await fetch(apiUrl("/zapatos"));
        const zlist = zres.ok ? await zres.json() : [];
        setZapatos(Array.isArray(zlist) ? zlist : []);
        // seleccionar
        const found = (Array.isArray(zlist) ? zlist : []).find(
          (z: any) => String(z?.id) === String(creado?.id)
        );
        setLineas((prev) =>
          prev.map((li, i) =>
            i === idx
              ? {
                  ...li,
                  crearNuevo: false,
                  escribible: found ? labelZapato(found) : nombre,
                  selZapato: found || null,
                }
              : li
          )
        );
      } else if (l.tipo === "ropa") {
        if (!color) return alert("Para ropa, el color es obligatorio.");
        const body = { nombre, color, precio };
        const res = await fetch(apiUrl("/ropa"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("No se pudo crear la prenda.");
        // refrescar
        const rres = await fetch(apiUrl("/ropa"));
        const rlist = rres.ok ? await rres.json() : [];
        setRopas(Array.isArray(rlist) ? rlist : []);
        const found = (Array.isArray(rlist) ? rlist : []).find(
          (r: any) => String(r?.nombre) === nombre && String(r?.color) === color
        );
        setLineas((prev) =>
          prev.map((li, i) =>
            i === idx
              ? {
                  ...li,
                  crearNuevo: false,
                  escribible: found ? labelRopa(found) : `${nombre} — ${color} — $${precio.toLocaleString("es-CO")}`,
                  selRopa: found || null,
                }
              : li
          )
        );
      } else {
        const body = { id: undefined, nombre, color: color || undefined, precio };
        const res = await fetch(apiUrl("/bolsos"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("No se pudo crear el bolso.");
        // refrescar
        const bres = await fetch(apiUrl("/bolsos"));
        const blist = bres.ok ? await bres.json() : [];
        setBolsos(Array.isArray(blist) ? blist : []);
        const found = (Array.isArray(blist) ? blist : []).find(
          (b: any) => String(b?.nombre) === nombre && String(b?.color || "") === (color || "")
        );
        setLineas((prev) =>
          prev.map((li, i) =>
            i === idx
              ? {
                  ...li,
                  crearNuevo: false,
                  escribible: found ? labelBolso(found) : `${nombre}${color ? ` — ${color}` : ""} — $${precio.toLocaleString("es-CO")}`,
                  selBolso: found || null,
                }
              : li
          )
        );
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo crear el producto.");
    }
  }

  /* --------- Add/Remove líneas --------- */
  function agregarLinea() {
    setLineas((prev) => [...prev, nuevaLinea()]);
  }
  function eliminarLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }

  /* --------- Submit --------- */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError("");
      const uid = getUsuarioIdAuto();
      if (!uid) {
        alert("No se pudo determinar el usuario.");
        setSaving(false);
        return;
      }

      const errores: string[] = [];
      const payloads: any[] = [];

      lineas.forEach((l, i) => {
        const n = i + 1;
        if (l.tipo === "bolso") {
          // debe haber bolso seleccionado y cantidad
          if (!l.selBolso?.id) {
            errores.push(`Línea ${n}: selecciona el bolso o crea uno nuevo y selecciónalo.`);
            return;
          }
          if (l.cantBolso === "" || isNaN(Number(l.cantBolso)) || Number(l.cantBolso) <= 0) {
            errores.push(`Línea ${n}: cantidad de bolsos inválida.`);
            return;
          }
          payloads.push({
            tipo: "bolso",
            bolso_id: String(l.selBolso.id),
            cantidad: Number(l.cantBolso),
            usuario_id: Number(uid),
          });
          return;
        }

        // zapato/ropa: convertir sizeMap -> muchas entradas
        const entries = Object.entries(l.sizeMap).filter(([_, qty]) => Number(qty) > 0);
        if (!entries.length) {
          errores.push(`Línea ${n}: agrega al menos una talla con cantidad > 0.`);
          return;
        }

        if (l.tipo === "zapato") {
          if (!l.selZapato?.id) {
            errores.push(`Línea ${n}: selecciona el zapato o créalo y selecciónalo.`);
            return;
          }
          for (const [talla, qty] of entries) {
            payloads.push({
              tipo: "zapato",
              zapato_id: l.selZapato.id,
              talla: String(talla),
              cantidad: Number(qty),
              usuario_id: Number(uid),
            });
          }
        } else if (l.tipo === "ropa") {
          if (!l.selRopa) {
            errores.push(`Línea ${n}: selecciona la prenda o créala y selecciónala.`);
            return;
          }
          for (const [talla, qty] of entries) {
            payloads.push({
              tipo: "ropa",
              ropa_nombre: l.selRopa.nombre,
              ropa_color: l.selRopa.color,
              talla: String(talla),
              cantidad: Number(qty),
              usuario_id: Number(uid),
            });
          }
        }
      });

      if (errores.length) {
        setError(errores.join("\n"));
        setSaving(false);
        return;
      }

      // Crear entradas (una por talla >0 o una por bolso)
      for (let i = 0; i < payloads.length; i++) {
        await createEntrada(payloads[i]);
      }

      router.push("/ingresos/registro");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudo crear el ingreso.\n${e.message}`
          : "No se pudo crear el ingreso."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-5xl sm:text-7xl leading-none`}>
            Ingreso de mercancía
          </h1>
          <Link
            href="/ingresos/registro"
            className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
          >
            Volver
          </Link>
        </div>

        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] p-5 flex flex-col gap-4"
        >
          {lineas.map((l, idx) => {
            const sugeridas = sugeridasDe(l);

            return (
              <div
                key={l.id}
                className="rounded-xl border border-[#e0a200]/30 bg-black/60 p-4 grid grid-cols-1 gap-3"
              >
                {/* Tipo + toggle crear */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#c2b48d]">Tipo</label>
                    <select
                      value={l.tipo}
                      onChange={(e) => cambiarTipo(idx, e.target.value as TipoProducto)}
                      className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                    >
                      <option value="zapato">Zapato</option>
                      <option value="ropa">Ropa</option>
                      <option value="bolso">Bolso</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-sm text-[#c2b48d]">
                        {l.tipo === "zapato" && "Zapato (escribe para buscar)"}
                        {l.tipo === "ropa" && "Prenda (escribe para buscar)"}
                        {l.tipo === "bolso" && "Bolso (escribe para buscar)"}
                      </label>
                      <input
                        list={`opciones-${l.id}`}
                        value={l.escribible}
                        onChange={(e) => cambiarEscribible(idx, e.target.value)}
                        placeholder={
                          l.tipo === "zapato"
                            ? "Ej. Air Max — Negro — $250.000"
                            : l.tipo === "ropa"
                            ? "Ej. Camiseta — Blanca — $45.000"
                            : "Ej. Tote — Negro — $120.000"
                        }
                        className="h-11 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                        disabled={l.crearNuevo}
                      />
                      <datalist id={`opciones-${l.id}`}>
                        {l.tipo === "zapato" &&
                          zapatos.map((z) => <option key={z.id} value={labelZapato(z)} />)}
                        {l.tipo === "ropa" &&
                          ropas.map((r, i) => (
                            <option key={`${r.nombre}-${r.color}-${i}`} value={labelRopa(r)} />
                          ))}
                        {l.tipo === "bolso" &&
                          bolsos.map((b) => <option key={b.id} value={labelBolso(b)} />)}
                      </datalist>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleNuevo(idx)}
                      className="h-11 px-3 rounded-md border border-[#e0a200]/40 text-[#e0a200] hover:bg-[#e0a200]/10 shrink-0"
                      title="Crear producto inline"
                    >
                      {l.crearNuevo ? "Cancelar nuevo" : "Nuevo producto"}
                    </button>
                  </div>
                </div>

                {/* Crear producto inline */}
                {l.crearNuevo && (
                  <div className="rounded-lg border border-white/15 p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-sm text-[#c2b48d]">Nombre</label>
                      <input
                        value={l.nuevoNombre}
                        onChange={(e) => setNuevo(idx, "nuevoNombre", e.target.value)}
                        className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                        placeholder="Nombre del producto"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-[#c2b48d]">Color {l.tipo === "ropa" ? "(obligatorio)" : "(opcional)"}</label>
                      <input
                        value={l.nuevoColor}
                        onChange={(e) => setNuevo(idx, "nuevoColor", e.target.value)}
                        className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                        placeholder="Ej. Negro"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-[#c2b48d]">Precio</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={l.nuevoPrecio}
                        onChange={(e) => setNuevo(idx, "nuevoPrecio", e.target.value)}
                        className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                        placeholder="Ej. 120000"
                      />
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => crearProductoInline(idx)}
                        className="px-3 h-10 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30"
                      >
                        Crear y seleccionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Grilla de tallas (zapato/ropa) o cantidad (bolso) */}
                {l.tipo !== "bolso" ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-[#c2b48d]">
                      {l.tipo === "zapato" ? "Tallas (zapato)" : "Tallas (ropa)"} — ingresa cantidades por talla
                    </div>
                    <SizeGrid
                      sizeMap={l.sizeMap}
                      onChange={(next) => setSizeMap(idx, next)}
                      sugeridas={sugeridas}
                      placeholderTalla={l.tipo === "zapato" ? "Ej. 38 / 38.5" : "Ej. S / M / L"}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 sm:col-span-1">
                      <label className="text-sm text-[#c2b48d]">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={l.cantBolso === "" ? "" : l.cantBolso}
                        onChange={(e) => setCantBolso(idx, e.target.value)}
                        className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                      />
                    </div>
                  </div>
                )}

                {/* Quitar línea */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => eliminarLinea(idx)}
                    className="px-3 h-9 rounded-md border border-white/20 text-white hover:bg-white/10"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}

          {/* Acciones */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            <button
              type="button"
              onClick={agregarLinea}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg border border-[#e0a200]/40 text-[#e0a200] hover:bg-[#e0a200]/10 text-sm"
              title="Agregar una nueva línea"
            >
              + Agregar línea
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <Link
                href="/ingresos/registro"
                className="h-9 sm:h-10 px-3 rounded-lg border border-white/20 text-white hover:bg-white/10 text-sm text-center"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving || lineas.length === 0}
                className="h-9 sm:h-10 px-4 rounded-lg bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60 text-sm"
              >
                Guardar ingreso
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
