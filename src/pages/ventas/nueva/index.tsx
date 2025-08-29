// src/pages/ventas/nueva/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { createVenta } from "@/services/ventas";

type RopaItem = {
  nombre: string;
  color: string;
  precio: number;
  tallas?: Array<{ talla: string; cantidad: number }>;
};
type ZapatoItem = {
  id: number; // zapato_id
  nombre: string;
  color: string;
  precio: number;
  tallas?: Array<{ talla: string; cantidad: number }>;
};
type BolsoItem = {
  id: string; // bolso_id
  nombre: string;
  color?: string;
  precio: number;
};

type TipoProducto = "zapato" | "ropa" | "bolso";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

function toISODateInput(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Intenta sacar usuario_id automáticamente (JWT > localStorage)
function getUsuarioIdAuto(): number | undefined {
  if (typeof window === "undefined") return undefined;

  const token = window.localStorage.getItem("access_token");
  if (token) {
    try {
      const [, payloadB64] = token.split(".");
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
        const maybe =
          payload?.userId ??
          payload?.userid ??
          payload?.id ??
          payload?.sub ??
          undefined;
        if (maybe && !isNaN(Number(maybe))) return Number(maybe);
      }
    } catch {}
  }

  const v = window.localStorage.getItem("usuario_id");
  if (v && !isNaN(Number(v))) return Number(v);

  return undefined;
}

export default function NuevaVentaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fecha, setFecha] = useState<string>(toISODateInput(new Date()));
  const [precio, setPrecio] = useState<number | "">("" as "");
  const [tipo, setTipo] = useState<TipoProducto>("zapato");

  // Catálogos
  const [zapatos, setZapatos] = useState<ZapatoItem[]>([]);
  const [ropas, setRopas] = useState<RopaItem[]>([]);
  const [bolsos, setBolsos] = useState<BolsoItem[]>([]);

  // Inputs “escribibles”
  const [zapatoInput, setZapatoInput] = useState("");
  const [ropaInput, setRopaInput] = useState("");
  const [bolsoInput, setBolsoInput] = useState("");

  // Selecciones a partir del texto
  const zapatoSel = useMemo(
    () =>
      zapatos.find(
        (z) =>
          `${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          zapatoInput.trim().toLowerCase()
      ),
    [zapatoInput, zapatos]
  );
  const ropaSel = useMemo(
    () =>
      ropas.find(
        (r) =>
          `${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          ropaInput.trim().toLowerCase()
      ),
    [ropaInput, ropas]
  );
  const bolsoSel = useMemo(
    () =>
      bolsos.find(
        (b) =>
          `${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          bolsoInput.trim().toLowerCase()
      ),
    [bolsoInput, bolsos]
  );

  // Tallas
  const [tallaZapato, setTallaZapato] = useState("");
  const [tallaRopa, setTallaRopa] = useState("");

  // Cargar catálogos
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

  // Autollenar precio
  useEffect(() => {
    if (tipo === "zapato" && zapatoSel) setPrecio(zapatoSel.precio ?? "");
    if (tipo === "ropa" && ropaSel) setPrecio(ropaSel.precio ?? "");
    if (tipo === "bolso" && bolsoSel) setPrecio(bolsoSel.precio ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, zapatoSel, ropaSel, bolsoSel]);

  const tallasZapatoDisponibles = useMemo(
    () => (zapatoSel?.tallas || []).filter((t) => Number(t.cantidad) > 0).map((t) => String(t.talla)),
    [zapatoSel]
  );
  const tallasRopaDisponibles = useMemo(
    () => (ropaSel?.tallas || []).filter((t) => Number(t.cantidad) > 0).map((t) => String(t.talla)),
    [ropaSel]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError("");

      const uid = getUsuarioIdAuto();
      if (!uid) {
        alert("No se pudo determinar el usuario. Inicia sesión o configura usuario_id en localStorage.");
        setSaving(false);
        return;
      }
      if (!fecha || isNaN(new Date(fecha).getTime())) {
        alert("La fecha es obligatoria.");
        setSaving(false);
        return;
      }
      if (precio === "" || isNaN(Number(precio))) {
        alert("El precio es obligatorio.");
        setSaving(false);
        return;
      }

      // DTO con fecha (el backend ya la acepta y persiste)
      const payload: any = {
        tipo,
        precio: Number(precio),
        usuario_id: Number(uid),
        fecha, // ⬅️ importante
      };

      if (tipo === "zapato") {
        if (!zapatoSel?.id) {
          alert("Selecciona el zapato (puedes escribir y elegir de la lista).");
          setSaving(false);
          return;
        }
        if (!tallaZapato) {
          alert("Selecciona la talla del zapato.");
          setSaving(false);
          return;
        }
        payload.zapato_id = zapatoSel.id;
        payload.talla = tallaZapato;
      } else if (tipo === "ropa") {
        if (!ropaSel) {
          alert("Selecciona la prenda (puedes escribir y elegir de la lista).");
          setSaving(false);
          return;
        }
        if (!tallaRopa) {
          alert("Selecciona la talla de la prenda.");
          setSaving(false);
          return;
        }
        payload.nombre_producto = ropaSel.nombre;
        payload.color = ropaSel.color;
        payload.talla = tallaRopa;
      } else if (tipo === "bolso") {
        if (!bolsoSel?.id) {
          alert("Selecciona el bolso (puedes escribir y elegir de la lista).");
          setSaving(false);
          return;
        }
        payload.bolso_id = String(bolsoSel.id);
      }

      await createVenta(payload);
      router.push("/ventas/registro");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message?.includes("HTTP")
          ? `No se pudo crear la venta.\n${e.message}`
          : "No se pudo crear la venta. Verifica la API o CORS."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-5xl sm:text-7xl leading-none`}>
            Nueva venta
          </h1>
          <Link
            href="/ventas/registro"
            className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
          >
            Volver
          </Link>
        </div>

        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] p-5 grid grid-cols-1 gap-4"
        >
          {/* Fecha */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
            />
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => {
                const v = e.target.value as TipoProducto;
                setTipo(v);
                setZapatoInput("");
                setRopaInput("");
                setBolsoInput("");
                setTallaZapato("");
                setTallaRopa("");
                setPrecio("" as "");
              }}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
            >
              <option value="zapato">Zapato</option>
              <option value="ropa">Ropa</option>
              <option value="bolso">Bolso</option>
            </select>
          </div>

          {/* Zapato escribible */}
          {tipo === "zapato" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Zapato (escribe para buscar)</label>
                <input
                  list="zapatos-list"
                  value={zapatoInput}
                  onChange={(e) => setZapatoInput(e.target.value)}
                  placeholder="Ej. Air Max — Negro — $250.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="zapatos-list">
                  {zapatos.map((z) => (
                    <option key={z.id} value={`${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Talla</label>
                <select
                  value={tallaZapato}
                  onChange={(e) => setTallaZapato(e.target.value)}
                  disabled={!zapatoSel}
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                >
                  <option value="">Selecciona…</option>
                  {tallasZapatoDisponibles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-white/60">Sólo tallas con stock &gt; 0.</p>
              </div>
            </>
          )}

          {/* Ropa escribible */}
          {tipo === "ropa" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Prenda (escribe para buscar)</label>
                <input
                  list="ropa-list"
                  value={ropaInput}
                  onChange={(e) => setRopaInput(e.target.value)}
                  placeholder="Ej. Camiseta — Blanca — $45.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="ropa-list">
                  {ropas.map((r, i) => (
                    <option
                      key={`${r.nombre}__${r.color}__${i}`}
                      value={`${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`}
                    />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Talla</label>
                <select
                  value={tallaRopa}
                  onChange={(e) => setTallaRopa(e.target.value)}
                  disabled={!ropaSel}
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                >
                  <option value="">Selecciona…</option>
                  {tallasRopaDisponibles.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <p className="text-xs text-white/60">Sólo tallas con stock &gt; 0.</p>
              </div>
            </>
          )}

          {/* Bolso escribible */}
          {tipo === "bolso" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#c2b48d]">Bolso (escribe para buscar)</label>
              <input
                list="bolsos-list"
                value={bolsoInput}
                onChange={(e) => setBolsoInput(e.target.value)}
                placeholder="Ej. Tote — Negro — $120.000"
                className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              />
              <datalist id="bolsos-list">
                {bolsos.map((b) => (
                  <option
                    key={b.id}
                    value={`${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`}
                  />
                ))}
              </datalist>
            </div>
          )}

          {/* Precio */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Precio</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={precio === "" ? "" : precio}
              onChange={(e) => setPrecio(e.target.value === "" ? "" : Number(e.target.value))}
              required
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
            />
            <p className="text-xs text-white/60">
              Se llena con el precio del inventario seleccionado, pero puedes ajustarlo (descuento/promo).
            </p>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 mt-2">
            <Link
              href="/ventas/registro"
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Crear venta
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
