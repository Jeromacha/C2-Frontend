// src/services/tallas-ropa.ts
import axios from "axios";

export type CreateTallaRopaDto = {
  talla: string;      // "XS" | "S" | "M" | "L"
  cantidad: number;
  ropa_id: string;    // id de la prenda
};

export type UpdateTallaRopaDto = {
  cantidad: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
});

// POST /tallas-ropa
export async function createTallaRopa(payload: CreateTallaRopaDto): Promise<void> {
  await api.post("/tallas-ropa", payload);
}

// PATCH /tallas-ropa/:talla/:ropa_id
export async function updateTallaRopa(
talla: string, ropa_id: string, ropa_color: string, payload: UpdateTallaRopaDto): Promise<void> {
  await api.patch(`/tallas-ropa/${encodeURIComponent(talla)}/${encodeURIComponent(ropa_id)}`, payload);
}
