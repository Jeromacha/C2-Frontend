import { getToken } from "@/lib/auth";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const url = (p: string) => (BASE ? `${BASE}${p}` : p);

export type RolUsuario = "Empleado" | "Admin";

export type UsuarioDTO = {
  id: number;
  nombre: string;
  rol: RolUsuario;
  activo?: boolean; // 👈 nuevo
};

export type CreateUsuarioInput = {
  nombre: string;
  contraseña: string;
  rol: RolUsuario;
};

function authHeaders() {
  const t = getToken();
  return {
    "Content-Type": "application/json; charset=utf-8",
    Accept: "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

async function parseOrText(res: Response) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

export async function listUsuarios(): Promise<UsuarioDTO[]> {
  const res = await fetch(url("/usuarios"), { headers: authHeaders() });
  if (!res.ok) throw new Error(JSON.stringify(await parseOrText(res)));
  return res.json();
}

export async function createUsuario(input: CreateUsuarioInput): Promise<UsuarioDTO> {
  const res = await fetch(url("/usuarios"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(JSON.stringify(await parseOrText(res)));
  return res.json();
}

export async function updateUsuario(
  id: number,
  data: Partial<CreateUsuarioInput>
): Promise<UsuarioDTO> {
  const res = await fetch(url(`/usuarios/${id}`), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(JSON.stringify(await parseOrText(res)));
  return res.json();
}

export async function deleteUsuario(id: number): Promise<void> {
  const res = await fetch(url(`/usuarios/${id}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(JSON.stringify(await parseOrText(res)));
}

// 👇 nuevo: activar / desactivar
export async function setEstadoUsuario(id: number, activo: boolean): Promise<UsuarioDTO> {
  const res = await fetch(url(`/usuarios/${id}/estado`), {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ activo }),
  });
  if (!res.ok) throw new Error(JSON.stringify(await parseOrText(res)));
  return res.json();
}
