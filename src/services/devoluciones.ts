// src/services/devoluciones.ts

export type Devolucion = {
  id?: number;
  fecha?: string;                 // ISO (o yyyy-mm-dd)
  observaciones?: string | null;

  // Campos opcionales que tu tabla usa:
  producto?: string;
  nombre_producto?: string;
  producto_recibido?: string;
  producto_entregado?: string;

  talla?: string;
  talla_recibida?: string;
  talla_entregada?: string;

  color?: string;
  color_recibido?: string;
  color_entregado?: string;

  precio?: number;
  precio_recibido?: number;
  precio_entregado?: number;
  diferencia_pago?: number;

  usuario_id?: number;
  usuario_nombre?: string;
  usuario?: { id: number; nombre?: string } | null;
};

// Lee NEXT_PUBLIC_API_BASE (ej.: http://localhost:3001).
// Si no está, usará rutas relativas ("/devoluciones/...") contra el mismo host.
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

// Crear devolución
export async function createDevolucion(dto: any): Promise<Devolucion> {
  const res = await fetch(buildUrl("/devoluciones"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Listar todas las devoluciones (si lo usas)
export async function getDevoluciones(): Promise<Devolucion[]> {
  const res = await fetch(buildUrl("/devoluciones"), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Devoluciones por rango (mismo endpoint-style que ventas)
// Ventas usa: GET /ventas/rango-fechas?start=...&end=...
// Aquí usamos: GET /devoluciones/rango-fechas?start=...&end=...
export async function getDevolucionesByDateRange(start: string, end: string): Promise<Devolucion[]> {
  const res = await fetch(buildUrl("/devoluciones/rango-fechas", { start, end }), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Actualizar devolución
export async function updateDevolucion(id: number, dto: any): Promise<Devolucion> {
  const res = await fetch(buildUrl(`/devoluciones/${id}`), {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Eliminar devolución
export async function deleteDevolucion(id: number): Promise<{ ok: true }> {
  const res = await fetch(buildUrl(`/devoluciones/${id}`), { method: "DELETE" });
  if (!res.ok) throw await errorFromResponse(res);
  return { ok: true };
}
