// src/services/bolsos.ts
import axios from "axios";

export type Bolso = {
  id: string;              // en tu backend es PrimaryColumn string
  nombre: string;
  color: string;
  precio: number;
  observaciones?: string | null;
  cantidad: number;
};

export type CreateBolsoDto = {
  id: string;
  nombre: string;
  color: string;
  precio: number;
  observaciones?: string;
  cantidad: number;
};

export type UpdateBolsoDto = Partial<Omit<CreateBolsoDto, "id">> & { id?: never };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
  // withCredentials: true,
});

// --- Normalizador para asegurar números y strings consistentes
const normalizeBolso = (b: any): Bolso => ({
  id: String(b.id),
  nombre: b.nombre,
  color: b.color,
  precio: typeof b.precio === "number" ? b.precio : Number(b.precio ?? 0),
  observaciones: b.observaciones ?? null,
  cantidad: typeof b.cantidad === "number" ? b.cantidad : Number(b.cantidad ?? 0),
});

// ---- REST ----
export async function getBolsos(): Promise<Bolso[]> {
  const { data } = await api.get<Bolso[]>("/bolsos");
  return (data as any[]).map(normalizeBolso);
}

export async function getBolso(id: string): Promise<Bolso> {
  const { data } = await api.get<Bolso>(`/bolsos/${encodeURIComponent(id)}`);
  return normalizeBolso(data as any);
}

export async function createBolso(payload: CreateBolsoDto): Promise<Bolso> {
  const { data } = await api.post<Bolso>("/bolsos", payload);
  return normalizeBolso(data as any);
}

// 👇 DEVUELVE data (no el AxiosResponse) y ya normalizado
export async function updateBolso(id: string, payload: UpdateBolsoDto): Promise<Bolso> {
  const { data } = await api.patch<Bolso>(`/bolsos/${encodeURIComponent(id)}`, payload);
  return normalizeBolso(data as any);
}

export async function deleteBolso(id: string): Promise<void> {
  await api.delete(`/bolsos/${encodeURIComponent(id)}`);
}
