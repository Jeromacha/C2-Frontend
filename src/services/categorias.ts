import axios from "axios";

export type Categoria = {
  nombre: string;
  // agrega más campos si tu backend los expone
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "";

const api = axios.create({
  baseURL: API_BASE,
});

export async function getCategorias(): Promise<Categoria[]> {
  // ajusta la ruta si en tu backend es distinta (por ejemplo: /categorias)
  const { data } = await api.get<Categoria[]>("/categorias");
  return data;
}
