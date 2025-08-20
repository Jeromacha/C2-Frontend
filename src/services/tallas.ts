// src/services/tallas.ts
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";
const api = axios.create({ baseURL: API_BASE });

export type TallaZapato = {
  talla: number;
  cantidad: number;
  zapato_id: number;
};

export type CreateTallaDto = {
  talla: number;
  cantidad: number;
  zapato_id: number;
};

export type UpdateTallaDto = {
  cantidad?: number;
};

export async function createTalla(payload: CreateTallaDto) {
  const { data } = await api.post("/tallas", payload);
  return data as TallaZapato;
}

export async function updateTalla(talla: number, zapato_id: number, payload: UpdateTallaDto) {
  const { data } = await api.patch(`/tallas/${talla}/${zapato_id}`, payload);
  return data as TallaZapato;
}

export async function deleteTalla(talla: number, zapato_id: number) {
  await api.delete(`/tallas/${talla}/${zapato_id}`);
}
