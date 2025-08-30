// src/services/entradas.ts
export type TipoProducto = "zapato" | "ropa" | "bolso";

export type EntradaMercancia = {
  id?: number;
  tipo: TipoProducto;
  zapato_id?: number;
  ropa_nombre?: string;
  ropa_color?: string;
  bolso_id?: string;
  talla?: string;
  cantidad: number;
  usuario_id?: number;
  fecha?: string; // ISO (lo setea CreateDateColumn)
};

// Lee NEXT_PUBLIC_API_BASE (ej.: http://localhost:3001).
// Si no está, usará rutas relativas ("/entradas/...") contra el mismo host.
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

// Crear entrada
export async function createEntrada(dto: Omit<EntradaMercancia, "id" | "fecha">): Promise<EntradaMercancia> {
  const res = await fetch(buildUrl("/entradas"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Listar todas las entradas
export async function getEntradas(): Promise<EntradaMercancia[]> {
  const res = await fetch(buildUrl("/entradas"), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Entradas por rango (?start=YYYY-MM-DD&end=YYYY-MM-DD o ISO con zona)
export async function getEntradasByDateRange(start: string, end: string): Promise<EntradaMercancia[]> {
  const res = await fetch(buildUrl("/entradas/rango-fechas", { start, end }), { cache: "no-store" });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Actualizar entrada
export async function updateEntrada(id: number, dto: Partial<EntradaMercancia>): Promise<EntradaMercancia> {
  const res = await fetch(buildUrl(`/entradas/${id}`), {
    method: "PATCH",
    headers: jsonHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw await errorFromResponse(res);
  return res.json();
}

// Eliminar entrada
export async function deleteEntrada(id: number): Promise<{ ok: true }> {
  const res = await fetch(buildUrl(`/entradas/${id}`), { method: "DELETE" });
  if (!res.ok) throw await errorFromResponse(res);
  return { ok: true };
}
