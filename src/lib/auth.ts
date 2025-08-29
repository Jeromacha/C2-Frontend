// src/lib/auth.ts
const LS_TOKEN = "access_token";

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_TOKEN, token);
}
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_TOKEN);
}
export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_TOKEN);
}

// Devuelve { id, rol, nombre } a partir del JWT
export function getCurrentUser():
  | { id: number; rol?: string; nombre?: string }
  | null {
  try {
    const t = getToken();
    if (!t) return null;
    const [, payloadB64] = t.split(".");
    if (!payloadB64) return null;
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const id = Number(payload?.sub);
    if (isNaN(id)) return null;
    return { id, rol: payload?.rol, nombre: payload?.nombre };
  } catch {
    return null;
  }
}
