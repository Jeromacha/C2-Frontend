// src/pages/devoluciones/nueva/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { createDevolucion } from "@/services/devoluciones";
import { getZapatos } from "@/services/zapatos";
import { getRopa } from "@/services/ropa";
import { getBolsos } from "@/services/bolsos";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

type Tipo = "zapato" | "ropa" | "bolso";

type TallaStock = { talla: string; cantidad: number };

type ItemZapato = {
  id: number;
  nombre: string;
  color?: string;
  precio: number;
  tallas?: TallaStock[];
};

type ItemRopa = {
  nombre: string;
  color?: string;
  precio: number;
  tallas?: TallaStock[];
};

type ItemBolso = {
  id: string | number;
  nombre: string;
  color?: string;
  precio: number;
  // normalmente bolsos no tienen tallas; usaremos "UNICA"
};

function fmtMoney(n?: number) {
  const v = Number(n ?? 0);
  return `$${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
}

// Igual que en ventas: obtener usuario_id automáticamente (desde token o localStorage)
function getUsuarioIdAuto(): number | undefined {
  if (typeof window === "undefined") return undefined;

  const token = window.localStorage.getItem("access_token") || window.localStorage.getItem("token");
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
  // Catálogos
  const [zapatos, setZapatos] = useState<ItemZapato[]>([]);
  const [ropas, setRopas] = useState<ItemRopa[]>([]);
  const [bolsos, setBolsos] = useState<ItemBolso[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [z, r, b] = await Promise.all([getZapatos(), getRopa(), getBolsos()]);
        if (!alive) return;

        // ✅ Normalizar tallas de zapatos a { talla: string, cantidad: number }
        setZapatos(
          Array.isArray(z)
            ? z.map((zap: any) => ({
                ...zap,
                tallas: Array.isArray(zap.tallas)
                  ? zap.tallas.map((t: any) => ({
                      talla: String(t.talla),
                      cantidad: Number(t.cantidad),
                    }))
                  : [],
              }))
            : []
        );

        setRopas(
          Array.isArray(r)
            ? r.map((rop: any) => ({
                ...rop,
                tallas: Array.isArray(rop.tallas)
                  ? rop.tallas.map((t: any) => ({
                      talla: String(t.talla),
                      cantidad: Number(t.cantidad),
                    }))
                  : [],
              }))
            : []
        );

        setBolsos(Array.isArray(b) ? b : []);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el catálogo. Revisa la API.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Tipo de devolución (DTO: zapato | ropa | bolso)
  const [tipo, setTipo] = useState<Tipo>("zapato");

  // Búsquedas
  const [qRecibido, setQRecibido] = useState(""); // producto que devuelve el cliente (RECIBIDO por la tienda)
  const [qEntregado, setQEntregado] = useState(""); // producto que se entrega al cliente (ENTREGADO)

  // Selecciones
  const [recibido, setRecibido] = useState<{ nombre?: string; color?: string; precio?: number }>({});
  const [entregado, setEntregado] = useState<{ nombre?: string; color?: string; precio?: number }>({});

  // Tallas
  const [tallaRecibida, setTallaRecibida] = useState<string>("");
  const [tallaEntregada, setTallaEntregada] = useState<string>("");

  // Precios (autorrellenos, editables)
  const [precioRecibido, setPrecioRecibido] = useState<number | "">("" as "");
  const [precioEntregado, setPrecioEntregado] = useState<number | "">("" as "");

  // Catálogo según tipo
  const catalogo = useMemo(() => {
    if (tipo === "zapato") return zapatos;
    if (tipo === "ropa") return ropas;
    return bolsos;
  }, [tipo, zapatos, ropas, bolsos]);

  // Filtrado por texto
  function filtrar(lista: any[], q: string) {
    const t = q.trim().toLowerCase();
    if (!t) return lista;
    return lista.filter((x) =>
      [x.nombre, x.color]
        .filter(Boolean)
        .map((s: string) => s.toLowerCase())
        .some((s: string) => s.includes(t))
    );
  }
  const filteredRec = useMemo(() => filtrar(catalogo, qRecibido), [catalogo, qRecibido]);
  const filteredEnt = useMemo(() => filtrar(catalogo, qEntregado), [catalogo, qEntregado]);

  // 🔧 util para obtener tallas según stock
  function getTallas(lista: any[], sel: { nombre?: string; color?: string }, includeOutOfStock: boolean): string[] {
    if (tipo === "bolso") return ["UNICA"];
    const it = lista.find((x) => x.nombre === sel.nombre && (x.color ?? "") === (sel.color ?? ""));
    if (!it) return [];
    const base = (it.tallas || []) as TallaStock[];
    const arr = includeOutOfStock ? base : base.filter((t) => Number(t.cantidad) > 0);
    return arr.map((t) => String(t.talla));
  }

  // ✅ RECIBIDO: TODAS las tallas (aunque no haya stock)
  const tallasRecibido = useMemo(
    () => getTallas(filteredRec as any, recibido, true),
    [filteredRec, recibido, tipo]
  );

  // ✅ ENTREGADO: SOLO tallas con stock > 0
  const tallasEntregado = useMemo(
    () => getTallas(filteredEnt as any, entregado, false),
    [filteredEnt, entregado, tipo]
  );

  // Autorrelleno de precios al elegir item
  useEffect(() => {
    if (typeof recibido?.precio === "number") setPrecioRecibido(recibido.precio);
  }, [recibido?.precio]);
  useEffect(() => {
    if (typeof entregado?.precio === "number") setPrecioEntregado(entregado.precio);
  }, [entregado?.precio]);

  // Reset al cambiar tipo
  function resetSeleccion() {
    setRecibido({});
    setEntregado({});
    setQRecibido("");
    setQEntregado("");
    setTallaRecibida(tipo === "bolso" ? "UNICA" : "");
    setTallaEntregada(tipo === "bolso" ? "UNICA" : "");
    setPrecioRecibido("" as "");
    setPrecioEntregado("" as "");
  }

  // Diferencia a pagar
  const diferencia_pago = Math.max(0, Number(precioEntregado || 0) - Number(precioRecibido || 0));

  // UI de ítem
  function ItemCard({ item, onPick }: { item: any; onPick: () => void }) {
    const precio = Number(item.precio ?? 0);
    return (
      <button
        type="button"
        onClick={onPick}
        className="w-full text-left rounded-md border border-[#e0a200]/30 bg-black/40 hover:bg-[#e0a200]/10 transition p-3"
      >
        <div className="flex items-center justify-between">
          <div className="text-white">
            <div className="font-medium">{item.nombre}</div>
            <div className="text-xs text-white/70">{item.color ? `Color: ${item.color}` : ""}</div>
            <div className="text-xs text-white/50">
              {tipo === "zapato" ? "Zapato" : tipo === "ropa" ? "Ropa" : "Bolso"}
            </div>
          </div>
          <div className="text-[#e0a200]">{fmtMoney(precio)}</div>
        </div>
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const uid = getUsuarioIdAuto();
    if (!uid || !Number.isInteger(uid) || uid <= 0) {
      alert("No se pudo determinar un usuario válido. Inicia sesión o configura usuario_id.");
      return;
    }
    if (!recibido?.nombre) {
      alert("Selecciona el producto RECIBIDO (devuelto por el cliente).");
      return;
    }
    if (!entregado?.nombre) {
      alert("Selecciona el producto ENTREGADO al cliente.");
      return;
    }

    // Para bolso, la talla es "UNICA"
    const tallaRec = tipo === "bolso" ? "UNICA" : tallaRecibida;
    const tallaEnt = tipo === "bolso" ? "UNICA" : tallaEntregada;

    if (!tallaRec || !tallasRecibido.includes(tallaRec)) {
      alert("Selecciona una talla RECIBIDA válida.");
      return;
    }
    if (!tallaEnt || !tallasEntregado.includes(tallaEnt)) {
      alert("Selecciona una talla ENTREGADA válida.");
      return;
    }

    const pr = Number(precioRecibido);
    const pe = Number(precioEntregado);
    if (!Number.isFinite(pr)) {
      alert("precio_recibido inválido.");
      return;
    }
    if (!Number.isFinite(pe)) {
      alert("precio_entregado inválido.");
      return;
    }
    const dif = Math.max(0, pe - pr);

    // Construir DTO EXACTO a tu CreateDevolucionDto
    const dto: any = {
      tipo, // 'zapato' | 'ropa' | 'bolso'
      producto_entregado: String(entregado.nombre).trim(),
      talla_entregada: String(tallaEnt).trim(),
      producto_recibido: String(recibido.nombre).trim(),
      talla_recibida: String(tallaRec).trim(),
      precio_entregado: pe,
      precio_recibido: pr,
      diferencia_pago: dif,
      usuario_id: uid,
    };
    const ce = (entregado.color || "").toString().trim();
    const cr = (recibido.color || "").toString().trim();
    if (ce) dto.color_entregado = ce; // opcional
    if (cr) dto.color_recibido = cr;  // opcional

    console.log("[devoluciones/nueva] Enviando payload:", dto);

    try {
      const token = typeof window !== "undefined" ? (localStorage.getItem("token") || undefined) : undefined;
      await createDevolucion(dto, token);
      window.location.href = "/devoluciones/registro";
    } catch (e: any) {
      console.error("Error creando devolución:", e?.message || e);
      alert(`No se pudo registrar la devolución.\n${e?.message || "Error desconocido"}`);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none`}>
            Registrar devolución
          </h1>
          <Link
            href="/devoluciones/registro"
            className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
          >
            Volver
          </Link>
        </div>

        {loading && <div className="mb-3 text-sm text-white/70">Cargando catálogos…</div>}
        {err && <div className="mb-3 text-sm text-red-400">{err}</div>}

        {!loading && (
          <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tipo */}
            <div className="lg:col-span-2 rounded-xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 p-4">
              <div className="mb-2 text-[#c2b48d] text-sm">Tipo de producto</div>
              <div className="flex gap-2">
                {(["zapato", "ropa", "bolso"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTipo(t);
                      resetSeleccion();
                    }}
                    className={[
                      "px-3 py-1 rounded-md border",
                      tipo === t
                        ? "border-[#e0a200]/60 bg-[#e0a200]/20 text-[#e0a200]"
                        : "border-[#e0a200]/30 text-[#c2b48d] hover:bg-[#e0a200]/10",
                    ].join(" ")}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* RECIBIDO (devuelto por el cliente) */}
            <div className="rounded-xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 p-4">
              <div className="mb-2 text-[#c2b48d] text-sm">Producto recibido (devuelto)</div>

              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
                <input
                  value={qRecibido}
                  onChange={(e) => setQRecibido(e.target.value)}
                  placeholder="Buscar por nombre, color…"
                  className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
                />
              </div>

              <div className="grid gap-2 max-h-[320px] overflow-auto pr-1">
                {filteredRec.map((it) => (
                  <ItemCard
                    key={`${it.nombre}-${(it as any).color ?? ""}-${(it as any).id ?? ""}`}
                    item={it}
                    onPick={() => {
                      setRecibido({ nombre: it.nombre, color: (it as any).color, precio: Number(it.precio ?? 0) });
                      // ✅ TODAS las tallas (incluye sin stock)
                      const opciones =
                        tipo === "bolso"
                          ? ["UNICA"]
                          : getTallas([it], { nombre: it.nombre, color: (it as any).color }, true);
                      setTallaRecibida(opciones[0] ?? (tipo === "bolso" ? "UNICA" : ""));
                    }}
                  />
                ))}
              </div>

              {/* Talla / Precio recibidos */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla recibida</label>
                  {tipo === "bolso" ? (
                    <input
                      value="UNICA"
                      readOnly
                      className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 text-white/90"
                    />
                  ) : (
                    <select
                      value={tallaRecibida}
                      onChange={(e) => setTallaRecibida(e.target.value)}
                      disabled={!recibido?.nombre}
                      className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                    >
                      <option value="">Selecciona…</option>
                      {tallasRecibido.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Precio recibido</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={precioRecibido === "" ? "" : precioRecibido}
                    onChange={(e) => setPrecioRecibido(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                  />
                </div>
              </div>
            </div>

            {/* ENTREGADO (lo que se lleva el cliente) */}
            <div className="rounded-xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 p-4">
              <div className="mb-2 text-[#c2b48d] text-sm">Producto entregado</div>

              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e0a200] text-[20px]">search</span>
                <input
                  value={qEntregado}
                  onChange={(e) => setQEntregado(e.target.value)}
                  placeholder="Buscar por nombre, color…"
                  className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90 placeholder:text-white/50"
                />
              </div>

              <div className="grid gap-2 max-h-[320px] overflow-auto pr-1">
                {filteredEnt.map((it) => (
                  <ItemCard
                    key={`${it.nombre}-${(it as any).color ?? ""}-${(it as any).id ?? ""}`}
                    item={it}
                    onPick={() => {
                      setEntregado({ nombre: it.nombre, color: (it as any).color, precio: Number(it.precio ?? 0) });
                      // ✅ SOLO tallas con stock
                      const opciones =
                        tipo === "bolso"
                          ? ["UNICA"]
                          : getTallas([it], { nombre: it.nombre, color: (it as any).color }, false);
                      setTallaEntregada(opciones[0] ?? (tipo === "bolso" ? "UNICA" : ""));
                    }}
                  />
                ))}
              </div>

              {/* Talla / Precio entregados */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Talla entregada</label>
                  {tipo === "bolso" ? (
                    <input
                      value="UNICA"
                      readOnly
                      className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 text-white/90"
                    />
                  ) : (
                    <select
                      value={tallaEntregada}
                      onChange={(e) => setTallaEntregada(e.target.value)}
                      disabled={!entregado?.nombre}
                      className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                    >
                      <option value="">Selecciona…</option>
                      {tallasEntregado.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-[#c2b48d]">Precio entregado</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={precioEntregado === "" ? "" : precioEntregado}
                    onChange={(e) => setPrecioEntregado(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-10 w-full rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white/90"
                  />
                </div>
              </div>
            </div>

            {/* RESUMEN */}
            <div className="lg:col-span-2 rounded-xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-md border border-[#e0a200]/30 p-3">
                  <div className="text-sm text-[#c2b48d]">Precio recibido</div>
                  <div className="text-2xl text-[#e0a200]">{fmtMoney(Number(precioRecibido || 0))}</div>
                </div>
                <div className="rounded-md border border-[#e0a200]/30 p-3">
                  <div className="text-sm text-[#c2b48d]">Precio entregado</div>
                  <div className="text-2xl text-[#e0a200]">{fmtMoney(Number(precioEntregado || 0))}</div>
                </div>
                <div className="rounded-md border border-[#e0a200]/30 p-3">
                  <div className="text-sm text-[#c2b48d]">Diferencia a pagar</div>
                  <div className="text-2xl text-[#e0a200]">{fmtMoney(diferencia_pago)}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link
                  href="/devoluciones/registro"
                  className="px-4 h-10 rounded-md border border-white/20 text-white hover:bg-white/10 inline-flex items-center"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  className="px-4 h-10 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30"
                >
                  Guardar devolución
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
