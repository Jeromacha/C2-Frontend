import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { createDevolucion } from "@/services/devoluciones";

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

type EntregadoItem = {
  tipo: TipoProducto;
  nombre: string;
  color?: string;
  talla?: string; // "Única" para bolso
  precio: number;
  refId?: number | string; // opcional (zapato/bolso)
  cantidad?: number; // default 1
};

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

// Igual que en ventas
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

export default function NuevaDevolucionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Tipo del RECIBIDO (afecta inventario) y tipo del picker para ENTREGADO (carrito)
  const [tipoRec, setTipoRec] = useState<TipoProducto>("zapato");
  const [tipoEntPicker, setTipoEntPicker] = useState<TipoProducto>("zapato");

  // Catálogos
  const [zapatos, setZapatos] = useState<ZapatoItem[]>([]);
  const [ropas, setRopas] = useState<RopaItem[]>([]);
  const [bolsos, setBolsos] = useState<BolsoItem[]>([]);

  // RECIBIDO (devuelto) - inputs
  const [zapatoRecInput, setZapatoRecInput] = useState("");
  const [ropaRecInput, setRopaRecInput] = useState("");
  const [bolsoRecInput, setBolsoRecInput] = useState("");

  const zapatoRecSel = useMemo(
    () =>
      zapatos.find(
        (z) =>
          `${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          zapatoRecInput.trim().toLowerCase()
      ),
    [zapatoRecInput, zapatos]
  );
  const ropaRecSel = useMemo(
    () =>
      ropas.find(
        (r) =>
          `${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          ropaRecInput.trim().toLowerCase()
      ),
    [ropaRecInput, ropas]
  );
  const bolsoRecSel = useMemo(
    () =>
      bolsos.find(
        (b) =>
          `${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          bolsoRecInput.trim().toLowerCase()
      ),
    [bolsoRecInput, bolsos]
  );

  // Talllas RECIBIDO (permitimos TODO, incluso stock 0; si no hay lista, input manual)
  const [tallaZapatoRec, setTallaZapatoRec] = useState("");
  const [tallaRopaRec, setTallaRopaRec] = useState("");
  const tallasZapatoRecTodas = useMemo(
    () => (zapatoRecSel?.tallas || []).map((t) => String(t.talla)),
    [zapatoRecSel]
  );
  const tallasRopaRecTodas = useMemo(
    () => (ropaRecSel?.tallas || []).map((t) => String(t.talla)),
    [ropaRecSel]
  );

  // ENTREGADO (carrito)
  const [zapatoEntInput, setZapatoEntInput] = useState("");
  const [ropaEntInput, setRopaEntInput] = useState("");
  const [bolsoEntInput, setBolsoEntInput] = useState("");
  const [tallaZapatoEnt, setTallaZapatoEnt] = useState("");
  const [tallaRopaEnt, setTallaRopaEnt] = useState("");
  const [entregados, setEntregados] = useState<EntregadoItem[]>([]);

  const zapatoEntSel = useMemo(
    () =>
      zapatos.find(
        (z) =>
          `${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          zapatoEntInput.trim().toLowerCase()
      ),
    [zapatoEntInput, zapatos]
  );
  const ropaEntSel = useMemo(
    () =>
      ropas.find(
        (r) =>
          `${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          ropaEntInput.trim().toLowerCase()
      ),
    [ropaEntInput, ropas]
  );
  const bolsoEntSel = useMemo(
    () =>
      bolsos.find(
        (b) =>
          `${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`.toLowerCase() ===
          bolsoEntInput.trim().toLowerCase()
      ),
    [bolsoEntInput, bolsos]
  );

  // Talllas ENTREGADO (sí filtramos >0 para no ofrecer stock inexistente)
  const tallasZapatoEntDisponibles = useMemo(
    () => (zapatoEntSel?.tallas || []).filter((t) => Number(t.cantidad) > 0).map((t) => String(t.talla)),
    [zapatoEntSel]
  );
  const tallasRopaEntDisponibles = useMemo(
    () => (ropaEntSel?.tallas || []).filter((t) => Number(t.cantidad) > 0).map((t) => String(t.talla)),
    [ropaEntSel]
  );

  // Precios
  const [precioRec, setPrecioRec] = useState<number | "">("" as "");
  const totalEntregado = useMemo(
    () => entregados.reduce((acc, it) => acc + Number(it.precio || 0), 0),
    [entregados]
  );
  const diferencia = useMemo(
    () => Number(totalEntregado || 0) - Number(precioRec || 0),
    [totalEntregado, precioRec]
  );

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

  // Autollenar precio recibido si no lo cambiaron aún
  useEffect(() => {
    if (precioRec !== "") return;
    if (tipoRec === "zapato" && zapatoRecSel) setPrecioRec(zapatoRecSel.precio ?? "");
    if (tipoRec === "ropa" && ropaRecSel) setPrecioRec(ropaRecSel.precio ?? "");
    if (tipoRec === "bolso" && bolsoRecSel) setPrecioRec(bolsoRecSel.precio ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoRec, zapatoRecSel, ropaRecSel, bolsoRecSel]);

  // Resets al cambiar tipo RECIBIDO
  useEffect(() => {
    setZapatoRecInput("");
    setRopaRecInput("");
    setBolsoRecInput("");
    setTallaZapatoRec("");
    setTallaRopaRec("");
    setPrecioRec("" as "");
  }, [tipoRec]);

  // Resets del picker ENTREGADO (no toca carrito)
  useEffect(() => {
    setZapatoEntInput("");
    setRopaEntInput("");
    setBolsoEntInput("");
    setTallaZapatoEnt("");
    setTallaRopaEnt("");
  }, [tipoEntPicker]);

  function addEntregado() {
    try {
      if (tipoEntPicker === "zapato") {
        if (!zapatoEntSel?.id) throw new Error("Selecciona el zapato ENTREGADO.");
        if (!tallaZapatoEnt) throw new Error("Selecciona la talla del zapato ENTREGADO.");
        setEntregados((prev: EntregadoItem[]) => [
          ...prev,
          {
            tipo: "zapato",
            nombre: zapatoEntSel.nombre,
            color: zapatoEntSel.color,
            talla: String(tallaZapatoEnt),
            precio: Number(zapatoEntSel.precio || 0),
            refId: zapatoEntSel.id,
            cantidad: 1,
          },
        ]);
        setZapatoEntInput("");
        setTallaZapatoEnt("");
      } else if (tipoEntPicker === "ropa") {
        if (!ropaEntSel) throw new Error("Selecciona la prenda ENTREGADA.");
        if (!tallaRopaEnt) throw new Error("Selecciona la talla de la prenda ENTREGADA.");
        setEntregados((prev: EntregadoItem[]) => [
          ...prev,
          {
            tipo: "ropa",
            nombre: ropaEntSel.nombre,
            color: ropaEntSel.color,
            talla: String(tallaRopaEnt),
            precio: Number(ropaEntSel.precio || 0),
            cantidad: 1,
          },
        ]);
        setRopaEntInput("");
        setTallaRopaEnt("");
      } else {
        if (!bolsoEntSel?.id) throw new Error("Selecciona el bolso ENTREGADO.");
        setEntregados((prev: EntregadoItem[]) => [
          ...prev,
          {
            tipo: "bolso",
            nombre: bolsoEntSel.nombre,
            color: bolsoEntSel.color,
            talla: "Única",
            precio: Number(bolsoEntSel.precio || 0),
            refId: bolsoEntSel.id,
            cantidad: 1,
          },
        ]);
        setBolsoEntInput("");
      }
    } catch (e: any) {
      alert(e?.message || "No se pudo agregar el producto entregado.");
    }
  }

  function removeEntregado(idx: number) {
    setEntregados((prev: EntregadoItem[]) => prev.filter((_, i) => i !== idx));
  }

  // ——————————————————————————————————————————————————————————
  // SERIALIZADOR compatible con tu backend (listas alineadas):
  function buildEntregadoCompat(entregados: EntregadoItem[]) {
    const productos: string[] = [];
    const tallas: string[] = [];
    const coloresRopa = new Set<string>();

    for (const it of entregados) {
      if (it.tipo === "zapato") {
        // Backend espera ID numérico
        if (it.refId == null) throw new Error("Falta ID de zapato ENTREGADO.");
        productos.push(String(it.refId));
        tallas.push(String(it.talla ?? "").trim());
      } else if (it.tipo === "bolso") {
        // Backend intenta por id exacto; talla “Única”
        if (it.refId == null) throw new Error("Falta ID de bolso ENTREGADO.");
        productos.push(String(it.refId));
        tallas.push("Única");
      } else {
        // ropa: usa nombre + color_entregado (único global) + talla
        if (!it.nombre || !it.color) {
          throw new Error("Para ropa ENTREGADA se requiere nombre y color.");
        }
        productos.push(it.nombre);
        tallas.push(String(it.talla ?? "").trim());
        coloresRopa.add(it.color);
      }
    }

    // color_entregado global: si hay ropa, todas deben compartir el mismo color
    let color_entregado: string | undefined = undefined;
    if (coloresRopa.size > 0) {
      if (coloresRopa.size > 1) {
        throw new Error("No se pueden entregar varias prendas de ropa con colores distintos en la misma devolución.");
      }
      color_entregado = Array.from(coloresRopa)[0];
    }

    return {
      producto_entregado: productos.join("; "),
      talla_entregada: tallas.join("; "),
      color_entregado, // puede ser undefined si no hubo ropa
    };
  }
  // ——————————————————————————————————————————————————————————

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

      if (precioRec === "" || isNaN(Number(precioRec))) {
        alert("El precio recibido es obligatorio.");
        setSaving(false);
        return;
      }

      // === RECIBIDO (DTO base) ===
      const payload: any = {
        tipo: tipoRec, // el backend ajusta inventario del RECIBIDO
        usuario_id: Number(uid),
        precio_recibido: Number(precioRec),
      };

      if (tipoRec === "zapato") {
        if (!zapatoRecSel?.id) throw new Error("Selecciona el zapato DEVUELTO (recibido).");
        if (!tallaZapatoRec) throw new Error("Ingresa/selecciona la talla del zapato DEVUELTO (recibido).");
        if (isNaN(parseFloat(String(tallaZapatoRec)))) {
          throw new Error("La talla del zapato devuelto debe ser numérica (ej. 38, 40.5).");
        }
        payload.producto_recibido = String(zapatoRecSel.id);
        payload.color_recibido = zapatoRecSel.color || undefined;
        payload.talla_recibida = String(tallaZapatoRec);
      } else if (tipoRec === "ropa") {
        if (!ropaRecSel) throw new Error("Selecciona la prenda DEVUELTA (recibido).");
        if (!tallaRopaRec) throw new Error("Ingresa/selecciona la talla de la prenda DEVUELTA (recibido).");
        payload.producto_recibido = ropaRecSel.nombre;
        payload.color_recibido = ropaRecSel.color; // requerido en servicio para ropa
        payload.talla_recibida = String(tallaRopaRec);
      } else {
        if (!bolsoRecSel?.id) throw new Error("Selecciona el bolso DEVUELTO (recibido).");
        payload.producto_recibido = String(bolsoRecSel.id);
        payload.color_recibido = bolsoRecSel.color || undefined;
        payload.talla_recibida = "Única";
      }

      // === ENTREGADOS (carrito) ===
      if (entregados.length === 0) {
        throw new Error("Agrega al menos un producto ENTREGADO al carrito.");
      }
      const precio_entregado = entregados.reduce((acc, it) => acc + Number(it.precio || 0), 0);
      if (precio_entregado < Number(precioRec)) {
        throw new Error("El precio ENTREGADO (suma del carrito) debe ser igual o mayor al RECIBIDO.");
      }

      // Construir compat (listas alineadas) para el backend actual
      const compat = buildEntregadoCompat(entregados);

      payload.producto_entregado = compat.producto_entregado; // lista de IDs (zapato/bolso) o nombres (ropa)
      payload.talla_entregada = compat.talla_entregada;       // lista alineada de tallas
      if (compat.color_entregado) payload.color_entregado = compat.color_entregado;

      payload.precio_entregado = precio_entregado;
      payload.diferencia_pago = Number(precio_entregado) - Number(precioRec);

      await createDevolucion(payload);
      router.push("/devoluciones/registro");
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || "No se pudo crear la devolución. Verifica la API o CORS.";
      setError(msg);
      alert(msg);
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
            Nueva devolución
          </h1>
          <Link
            href="/devoluciones/registro"
            className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
          >
            Volver
          </Link>
        </div>

        {error && <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">{error}</div>}

        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] p-5 grid grid-cols-1 gap-5"
        >
          {/* Tipos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#c2b48d]">Tipo devuelto (recibido)</label>
              <select
                value={tipoRec}
                onChange={(e) => setTipoRec(e.target.value as TipoProducto)}
                className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              >
                <option value="zapato">Zapato</option>
                <option value="ropa">Ropa</option>
                <option value="bolso">Bolso</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[#c2b48d]">Tipo entregado (para agregar al carrito)</label>
              <select
                value={tipoEntPicker}
                onChange={(e) => setTipoEntPicker(e.target.value as TipoProducto)}
                className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
              >
                <option value="zapato">Zapato</option>
                <option value="ropa">Ropa</option>
                <option value="bolso">Bolso</option>
              </select>
            </div>
          </div>

          {/* === RECIBIDO (devuelto) === */}
          {tipoRec === "zapato" && (
            <>
              <div className="text-[#c2b48d] text-sm">Devuelto (recibido) — Zapato</div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Zapato devuelto (escribe para buscar)</label>
                <input
                  list="zapatos-rec-list"
                  value={zapatoRecInput}
                  onChange={(e) => setZapatoRecInput(e.target.value)}
                  placeholder="Ej. Air Max — Negro — $250.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="zapatos-rec-list">
                  {zapatos.map((z) => (
                    <option key={`rec-${z.id}`} value={`${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`} />
                  ))}
                </datalist>
              </div>

              {/* Talla: TODAS las tallas del catálogo (aunque stock 0); si no hay, input manual */}
              {tallasZapatoRecTodas.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla devuelta</label>
                  <select
                    value={tallaZapatoRec}
                    onChange={(e) => setTallaZapatoRec(e.target.value)}
                    disabled={!zapatoRecSel}
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  >
                    <option value="">Selecciona…</option>
                    {tallasZapatoRecTodas.map((t) => (
                      <option key={`rec-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                  <p className="text-xs text-white/60">Si tu talla no aparece, puedes escribirla abajo.</p>
                </div>
              ) : null}

              {tallasZapatoRecTodas.length === 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla devuelta (escribe)</label>
                  <input
                    value={tallaZapatoRec}
                    onChange={(e) => setTallaZapatoRec(e.target.value)}
                    placeholder="Ej. 40 o 40.5"
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  />
                </div>
              )}
            </>
          )}

          {tipoRec === "ropa" && (
            <>
              <div className="text-[#c2b48d] text-sm">Devuelto (recibido) — Ropa</div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Prenda devuelta (escribe para buscar)</label>
                <input
                  list="ropa-rec-list"
                  value={ropaRecInput}
                  onChange={(e) => setRopaRecInput(e.target.value)}
                  placeholder="Ej. Camiseta — Blanca — $45.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="ropa-rec-list">
                  {ropas.map((r, i) => (
                    <option
                      key={`rec-${r.nombre}__${r.color}__${i}`}
                      value={`${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`}
                    />
                  ))}
                </datalist>
              </div>

              {tallasRopaRecTodas.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla devuelta</label>
                  <select
                    value={tallaRopaRec}
                    onChange={(e) => setTallaRopaRec(e.target.value)}
                    disabled={!ropaRecSel}
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  >
                    <option value="">Selecciona…</option>
                    {tallasRopaRecTodas.map((t) => (
                      <option key={`rec-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla devuelta (escribe)</label>
                  <input
                    value={tallaRopaRec}
                    onChange={(e) => setTallaRopaRec(e.target.value)}
                    placeholder="Ej. S / M / L"
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  />
                </div>
              )}
              <p className="text-xs text-white/60">Para ropa, el color recibido es requerido (se toma del ítem).</p>
            </>
          )}

          {tipoRec === "bolso" && (
            <>
              <div className="text-[#c2b48d] text-sm">Devuelto (recibido) — Bolso</div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Bolso devuelto (escribe para buscar)</label>
                <input
                  list="bolsos-rec-list"
                  value={bolsoRecInput}
                  onChange={(e) => setBolsoRecInput(e.target.value)}
                  placeholder="Ej. Tote — Negro — $120.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="bolsos-rec-list">
                  {bolsos.map((b) => (
                    <option
                      key={`rec-${b.id}`}
                      value={`${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`}
                    />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-white/60">Para bolso la talla es “Única”.</p>
            </>
          )}

          {/* Precio recibido */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Precio recibido (producto devuelto)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={precioRec === "" ? "" : precioRec}
              onChange={(e) => setPrecioRec(e.target.value === "" ? "" : Number(e.target.value))}
              required
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
            />
          </div>

          {/* === ENTREGADO: picker + carrito === */}
          <div className="rounded-xl bg-black/60 border border-[#e0a200]/30 p-3">
            <div className="text-sm text-[#c2b48d] mb-2">Agregar producto ENTREGADO al carrito</div>

            {/* Picker por tipo */}
            {tipoEntPicker === "zapato" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Zapato (escribe para buscar)</label>
                  <input
                    list="zapatos-ent-list"
                    value={zapatoEntInput}
                    onChange={(e) => setZapatoEntInput(e.target.value)}
                    placeholder="Ej. Air Max — Negro — $250.000"
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  />
                  <datalist id="zapatos-ent-list">
                    {zapatos.map((z) => (
                      <option key={`ent-${z.id}`} value={`${z.nombre} — ${z.color} — $${z.precio?.toLocaleString("es-CO")}`} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla</label>
                  <select
                    value={tallaZapatoEnt}
                    onChange={(e) => setTallaZapatoEnt(e.target.value)}
                    disabled={!zapatoEntSel}
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  >
                    <option value="">Selecciona…</option>
                    {tallasZapatoEntDisponibles.map((t) => (
                      <option key={`ent-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tipoEntPicker === "ropa" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Prenda (escribe para buscar)</label>
                  <input
                    list="ropa-ent-list"
                    value={ropaEntInput}
                    onChange={(e) => setRopaEntInput(e.target.value)}
                    placeholder="Ej. Camiseta — Blanca — $45.000"
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  />
                  <datalist id="ropa-ent-list">
                    {ropas.map((r, i) => (
                      <option
                        key={`ent-${r.nombre}__${r.color}__${i}`}
                        value={`${r.nombre} — ${r.color} — $${r.precio?.toLocaleString("es-CO")}`}
                      />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla</label>
                  <select
                    value={tallaRopaEnt}
                    onChange={(e) => setTallaRopaEnt(e.target.value)}
                    disabled={!ropaEntSel}
                    className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                  >
                    <option value="">Selecciona…</option>
                    {tallasRopaEntDisponibles.map((t) => (
                      <option key={`ent-${t}`} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {tipoEntPicker === "bolso" && (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-[#c2b48d]">Bolso (escribe para buscar)</label>
                <input
                  list="bolsos-ent-list"
                  value={bolsoEntInput}
                  onChange={(e) => setBolsoEntInput(e.target.value)}
                  placeholder="Ej. Tote — Negro — $120.000"
                  className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40"
                />
                <datalist id="bolsos-ent-list">
                  {bolsos.map((b) => (
                    <option
                      key={`ent-${b.id}`}
                      value={`${b.nombre}${b.color ? ` — ${b.color}` : ""} — $${b.precio?.toLocaleString("es-CO")}`}
                    />
                  ))}
                </datalist>
                <p className="text-xs text-white/60">Talla “Única”.</p>
              </div>
            )}

            <div className="mt-2">
              <button
                type="button"
                onClick={addEntregado}
                className="px-3 h-10 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30"
              >
                Agregar al carrito
              </button>
            </div>

            {/* Carrito */}
            <div className="mt-3 rounded-md border border-white/15 p-3">
              {entregados.length === 0 ? (
                <div className="text-white/60 text-sm">Sin productos en el carrito.</div>
              ) : (
                <ul className="space-y-2">
                  {entregados.map((it, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3">
                      <div className="text-sm text-white/90 truncate">
                        {it.nombre}
                        {it.color ? ` — ${it.color}` : ""}
                        {it.talla && it.talla !== "Única" ? ` — Talla ${it.talla}` : ""}
                        {" — "}
                        {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(it.precio)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntregado(idx)}
                        className="text-xs px-2 h-7 rounded-md border border-white/20 text-white hover:bg-white/10"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 text-sm text-[#c2b48d]">
                Total entregado:&nbsp;
                <span className="text-[#e0a200]">
                  {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(totalEntregado)}
                </span>
              </div>
            </div>
          </div>

          {/* Diferencia */}
          <div className="rounded-md bg-black/60 border border-[#e0a200]/30 px-3 py-2">
            <div className="text-sm text-[#c2b48d]">Diferencia (entregado - recibido)</div>
            <div className="mt-1 text-[#e0a200] text-lg">
              {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
                Number.isFinite(diferencia) ? diferencia : 0
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 mt-2">
            <Link
              href="/devoluciones/registro"
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Crear devolución
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
