// src/pages/ingresos/nueva/index.tsx
import { useEffect, useState } from "react";
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

type Linea = {
  id: string;
  tipo: TipoProducto;
  escribible: string;
  selZapato?: ZapatoItem | null;
  selRopa?: RopaItem | null;
  selBolso?: BolsoItem | null;
  talla?: string;
  cantidad: number | "";
};

function nuevaLinea(): Linea {
  return {
    id: Math.random().toString(36).slice(2),
    tipo: "zapato",
    escribible: "",
    talla: "",
    cantidad: "" as "",
    selZapato: null,
    selRopa: null,
    selBolso: null,
  };
}

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

  function resolverSeleccion(l: Linea): Linea {
    if (l.tipo === "zapato") {
      const sel = zapatos.find(
        (z) =>
          `${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          l.escribible.trim().toLowerCase()
      );
      return { ...l, selZapato: sel || null, selRopa: null, selBolso: null };
    }
    if (l.tipo === "ropa") {
      const sel = ropas.find(
        (r) =>
          `${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          l.escribible.trim().toLowerCase()
      );
      return { ...l, selRopa: sel || null, selZapato: null, selBolso: null };
    }
    if (l.tipo === "bolso") {
      const sel = bolsos.find(
        (b) =>
          `${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          l.escribible.trim().toLowerCase()
      );
      return { ...l, selBolso: sel || null, selZapato: null, selRopa: null };
    }
    return l;
  }

  function tallasDisponibles(l: Linea): string[] {
    if (l.tipo === "zapato" && l.selZapato) {
      return (l.selZapato.tallas || []).map((t) => String(t.talla));
    }
    if (l.tipo === "ropa" && l.selRopa) {
      return (l.selRopa.tallas || []).map((t) => String(t.talla));
    }
    return [];
  }

  function cambiarTipo(idx: number, tipo: TipoProducto) {
    setLineas((prev) =>
      prev.map((l, i) =>
        i === idx
          ? { ...l, tipo, escribible: "", talla: "", selZapato: null, selRopa: null, selBolso: null }
          : l
      )
    );
  }
  function cambiarEscribible(idx: number, val: string) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? resolverSeleccion({ ...l, escribible: val }) : l)));
  }
  function cambiarTalla(idx: number, val: string) {
    setLineas((prev) => prev.map((l, i) => (i === idx ? { ...l, talla: val } : l)));
  }
  function cambiarCantidad(idx: number, val: string) {
    setLineas((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, cantidad: val === "" ? "" : Number(val) } : l))
    );
  }
  function agregarLinea() {
    setLineas((prev) => [...prev, nuevaLinea()]);
  }
  function eliminarLinea(idx: number) {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  }

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
        if (l.cantidad === "" || isNaN(Number(l.cantidad)) || Number(l.cantidad) <= 0) {
          errores.push(`Línea ${n}: cantidad inválida.`);
          return;
        }
        if (l.tipo === "zapato") {
          if (!l.selZapato?.id) {
            errores.push(`Línea ${n}: selecciona un zapato.`);
            return;
          }
          if (!l.talla) {
            errores.push(`Línea ${n}: ingresa una talla.`);
            return;
          }
          payloads.push({
            tipo: "zapato",
            zapato_id: l.selZapato.id,
            talla: String(l.talla),
            cantidad: Number(l.cantidad),
            usuario_id: Number(uid),
          });
        } else if (l.tipo === "ropa") {
          if (!l.selRopa) {
            errores.push(`Línea ${n}: selecciona la prenda.`);
            return;
          }
          if (!l.talla) {
            errores.push(`Línea ${n}: ingresa una talla.`);
            return;
          }
          payloads.push({
            tipo: "ropa",
            ropa_nombre: l.selRopa.nombre,
            ropa_color: l.selRopa.color,
            talla: String(l.talla),
            cantidad: Number(l.cantidad),
            usuario_id: Number(uid),
          });
        } else if (l.tipo === "bolso") {
          if (!l.selBolso?.id) {
            errores.push(`Línea ${n}: selecciona el bolso.`);
            return;
          }
          payloads.push({
            tipo: "bolso",
            bolso_id: String(l.selBolso.id),
            cantidad: Number(l.cantidad),
            usuario_id: Number(uid),
          });
        }
      });

      if (errores.length) {
        setError(errores.join("\n"));
        setSaving(false);
        return;
      }

      // Crear entradas (una por línea)
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
            Ingreso de caja
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
            const tallas =
              l.tipo === "zapato"
                ? (l.selZapato?.tallas || []).map((t) => String(t.talla))
                : l.tipo === "ropa"
                ? (l.selRopa?.tallas || []).map((t) => String(t.talla))
                : [];

            return (
              <div
                key={l.id}
                className="rounded-xl border border-[#e0a200]/30 bg-black/60 p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
              >
                {/* Tipo */}
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

                {/* Producto escribible */}
                <div className="flex flex-col gap-1 md:col-span-2">
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
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                  />
                  <datalist id={`opciones-${l.id}`}>
                    {l.tipo === "zapato" &&
                      zapatos.map((z) => (
                        <option
                          key={z.id}
                          value={`${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`}
                        />
                      ))}
                    {l.tipo === "ropa" &&
                      ropas.map((r, i) => (
                        <option
                          key={`${r.nombre}-${r.color}-${i}`}
                          value={`${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`}
                        />
                      ))}
                    {l.tipo === "bolso" &&
                      bolsos.map((b) => (
                        <option
                          key={b.id}
                          value={`${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`}
                        />
                      ))}
                  </datalist>
                </div>

                {/* Talla libre */}
                {(l.tipo === "zapato" || l.tipo === "ropa") && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm text-[#c2b48d]">Talla</label>
                    <input
                      list={`tallas-${l.id}`}
                      value={l.talla ?? ""}
                      onChange={(e) => cambiarTalla(idx, e.target.value)}
                      placeholder={l.tipo === "zapato" ? "Ej. 38 / 38.5" : "Ej. S / M / L"}
                      className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                    />
                    <datalist id={`tallas-${l.id}`}>
                      {tallas.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <p className="text-xs text-white/60">Puedes escribir una talla nueva.</p>
                  </div>
                )}

                {/* Cantidad */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={l.cantidad === "" ? "" : l.cantidad}
                    onChange={(e) => cambiarCantidad(idx, e.target.value)}
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3"
                  />
                </div>

                {/* Quitar línea */}
                <div className="md:col-span-4 flex justify-end">
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

          {/* Acciones (responsive, compactas) */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
            {/* Izquierda: Agregar línea */}
            <button
              type="button"
              onClick={agregarLinea}
              className="h-9 sm:h-10 px-3 sm:px-4 rounded-lg border border-[#e0a200]/40 text-[#e0a200] hover:bg-[#e0a200]/10 text-sm"
              title="Agregar una nueva línea"
            >
              + Agregar línea
            </button>

            {/* Derecha: Cancelar / Guardar */}
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
                Guardar ingreso (caja)
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
