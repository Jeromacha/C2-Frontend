// src/services/auth.ts
import { saveToken } from "@/lib/auth";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");
const url = (p: string) => (BASE ? `${BASE}${p}` : p);

export async function login(nombre: string, contraseniaRaw: string) {
  const nombreNorm = (nombre ?? "").trim();
  const pass = contraseniaRaw ?? "";

  // Enviamos todas las claves razonables por si el backend mapea diferente
  const body = {
    nombre: nombreNorm,
    contraseña: pass,   // con ñ
    contrasena: pass,   // sin ñ
    password: pass,     // alias
    pass,               // alias
  };

  const res = await fetch(url("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.json();
        detail = j?.message ? JSON.stringify(j.message) : JSON.stringify(j);
      } else {
        detail = await res.text();
      }
    } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? " — " + detail : ""}`);
  }

  const data = await res.json(); // { access_token }
  if (data?.access_token) saveToken(data.access_token);
  return data;
}
