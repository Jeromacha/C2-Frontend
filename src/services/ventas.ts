// src/services/ventas.ts
export type Venta = {
  id?: number;
  fecha?: string;                 // ISO (o yyyy-mm-dd)
  total?: number;
  observaciones?: string | null;
};

// Lee NEXT_PUBLIC_API_BASE (ej.: http://localhost:3001).
// Si no está, usará rutas relativas ("/ventas/...") contra el mismo host.
const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

// Construye URL sin usar new URL() (evita "Invalid URL" si BASE está vacío).
function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = BASE_URL ? `${BASE_URL}${p}` : p; // relativo si no hay base
  if (!params) return base;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}` !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

async function errorFromResponse(res: Response) {
  let detail: any = null;
  try { detail = await res.json(); } catch {}
  const err = new Error(
    `HTTP ${res.status} ${res.statusText}` + (detail ? ` — ${JSON.stringify(detail)}` : "")
  ) as any;
  err.status = res.status;
  err.detail = detail;
  return err;
}

// ======================= CRUD & consultas =======================

// Crear venta
export async function createVenta(dto: any): Promise<Venta> {
  const res = await fetch(buildUrl("/ventas"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Listar todas las ventas
export async function getVentas(): Promise<Venta[]> {
  const res = await fetch(buildUrl("/ventas"), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Ventas por rango (?start=YYYY-MM-DD&end=YYYY-MM-DD)
export async function getVentasByDateRange(start: string, end: string): Promise<Venta[]> {
  const res = await fetch(buildUrl("/ventas/rango-fechas", { start, end }), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Ganancias (totales u opcionalmente por rango)
export async function getGanancias(start?: string, end?: string): Promise<number> {
  const res = await fetch(buildUrl("/ventas/ganancias", { start, end }), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  const data = await res.json();
  return Number(data?.total ?? 0);
}

// Actualizar venta
export async function updateVenta(id: number, dto: any): Promise<Venta> {
  const res = await fetch(buildUrl(`/ventas/${id}`), {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Eliminar venta
export async function deleteVenta(id: number): Promise<{ ok: true }> {
  const res = await fetch(buildUrl(`/ventas/${id}`), { method: "DELETE" });
  if (!res.ok) throw await errorFromResponse(res);
  return { ok: true };}
