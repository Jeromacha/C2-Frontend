// src/services/zapatos.ts
import axios from "axios";

export type TallaZapato = {
  talla: number;
  cantidad: number;
};

export type Zapato = {
  id: number;
  nombre: string;
  ubicacion: string;
  imagen_url: string;
  precio: number;
  categoriaNombre: string;
  observaciones?: string | null;
  tallas?: TallaZapato[];
};

export type CreateZapatoDto = {
  id: number;
  nombre: string;
  ubicacion: string;
  imagen_url: string;
  precio: number;
  categoriaNombre: string;
  observaciones?: string;
};

export type UpdateZapatoDto = Partial<Omit<CreateZapatoDto, "id">>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
});

// --- REST ---
export async function getZapatos(): Promise<Zapato[]> {
  const { data } = await api.get<Zapato[]>("/zapatos");
  return data;
}

export async function getZapato(id: number): Promise<Zapato> {
  const { data } = await api.get<Zapato>(`/zapatos/${id}`);
  return data;
}

export async function createZapato(payload: CreateZapatoDto): Promise<Zapato> {
  const { data } = await api.post<Zapato>("/zapatos", payload);
  return data;
}

// Backend expuesto con PATCH /zapatos/:id
export async function updateZapato(id: number, payload: UpdateZapatoDto): Promise<Zapato> {
  const { data } = await api.patch<Zapato>(`/zapatos/${id}`, payload);
  return data;
}

export async function deleteZapato(id: number): Promise<void> {
  await api.delete(`/zapatos/${id}`);
}
