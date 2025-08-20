// src/services/ropa.ts
import axios from "axios";

export type TallaRopa = {
  talla: string;   // "XS" | "S" | "M" | "L"
  cantidad: number;
};

export type Ropa = {
  id?: string;     // opcional, si tu backend lo retorna
  nombre: string;
  color: string;
  precio: number;
  categoriaNombre: string;
  observaciones?: string | null;
  tallas?: TallaRopa[];
};

// En tu backend, la PK es (nombre, color). No hay id en la ruta.
export type CreateRopaDto = {
  nombre: string;
  color: string;
  precio: number;
  categoriaNombre: string;
  observaciones?: string;
};

export type UpdateRopaDto = Partial<Omit<CreateRopaDto, "nombre" | "color">>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
});

// --- REST ---
export async function getRopa(): Promise<Ropa[]> {
  const { data } = await api.get<Ropa[]>("/ropa");
  return data;
}

// POST /ropa (NO incluye id porque PK es nombre+color)
export async function createRopa(payload: CreateRopaDto): Promise<Ropa> {
  const { data } = await api.post<Ropa>("/ropa", payload);
  return data;
}

// PATCH /ropa/:nombre/:color  (backend NO permite cambiar nombre/color vía update)
export async function updateRopa(
  nombre: string,
  color: string,
  payload: UpdateRopaDto
): Promise<Ropa> {
  const { data } = await api.patch<Ropa>(`/ropa/${encodeURIComponent(nombre)}/${encodeURIComponent(color)}`, payload);
  return data;
}

// DELETE /ropa/:nombre/:color
export async function deleteRopa(nombre: string, color: string): Promise<void> {
  await api.delete(`/ropa/${encodeURIComponent(nombre)}/${encodeURIComponent(color)}`);
}
