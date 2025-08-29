// src/services/devoluciones.ts
export type Devolucion = {
  id?: number;
  fecha?: string;

  // devuelto
  tipo_devuelto?: 'zapato' | 'ropa' | 'bolso';
  zapato_id_devuelto?: number;
  nombre_producto_devuelto?: string;
  color_devuelto?: string;
  talla_devuelta?: string;
  precio_devuelto?: number;

  // entregado
  tipo_entregado?: 'zapato' | 'ropa' | 'bolso';
  zapato_id_entregado?: number;
  nombre_producto_entregado?: string;
  color_entregado?: string;
  talla_entregada?: string;
  precio_entregado?: number;

  // dinero
  excedente?: number; // cuando entregado > devuelto

  // otros
  observaciones?: string;
  usuario_id?: number;
  usuario?: { id: number; nombre: string };
};

// BASE igual que ventas.ts
const BASE_URL = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = BASE_URL ? `${BASE_URL}${p}` : p;
  if (!params) return base;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}` !== "") qs.set(k, String(v));
  });
  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}

function jsonHeaders(token?: string) {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
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

// Crear
export async function createDevolucion(dto: Partial<Devolucion>, token?: string): Promise<Devolucion> {
  const res = await fetch(buildUrl("/devoluciones"), {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Listar todo
export async function getDevoluciones(token?: string): Promise<Devolucion[]> {
  const res = await fetch(buildUrl("/devoluciones"), {
    headers: jsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Rango de fechas: start/end pueden ser ISO o YYYY-MM-DDTHH...
export async function getDevolucionesByDateRange(start: string, end: string, token?: string): Promise<Devolucion[]> {
  const res = await fetch(buildUrl("/devoluciones/rango-fechas", { start, end }), {
    headers: jsonHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Actualizar (no toca inventario)
export async function updateDevolucion(id: number, dto: Partial<Devolucion>, token?: string): Promise<Devolucion> {
  const res = await fetch(buildUrl(`/devoluciones/${id}`), {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Eliminar (no toca inventario)
export async function deleteDevolucion(id: number, token?: string): Promise<{ ok: true }> {
  const res = await fetch(buildUrl(`/devoluciones/${id}`), {
    method: "DELETE",
    headers: jsonHeaders(token),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return { ok: true };
}
