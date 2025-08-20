// src/services/categorias-ropa.ts
import axios from "axios";

export type CategoriaRopa = {
  nombre: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
});

export async function getCategoriasRopa(): Promise<CategoriaRopa[]> {
  const { data } = await api.get<CategoriaRopa[]>("/categorias-ropa");
  return data;
}
