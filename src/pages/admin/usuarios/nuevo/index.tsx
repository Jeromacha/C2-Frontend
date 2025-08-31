import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { createUsuario } from "@/services/usuarios";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

function extractErrorMessage(err: any): string {
  const raw = err?.message ?? err ?? "";
  if (!raw) return "Error desconocido";
  try {
    const parsed = JSON.parse(raw);
    const m = parsed?.message;
    if (Array.isArray(m)) return m.join("\n");
    if (typeof m === "string") return m;
    return JSON.stringify(parsed);
  } catch {
    return String(raw);
  }
}

export default function NuevoUsuarioPage() {
  const me = getCurrentUser();
  const router = useRouter();
  const soyAdmin = isAdmin(me?.rol);

  const [nombre, setNombre] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [rol, setRol] = useState<"Empleado" | "Admin">("Empleado");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!soyAdmin) router.replace("/warning");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!soyAdmin) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !contraseña.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    if (contraseña.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      setSaving(true);
      await createUsuario({ nombre: nombre.trim(), contraseña, rol });
      router.replace("/admin/usuarios");
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Título + volver */}
        <div className="mb-6 flex items-center justify-between">
          <h1
            className={`${qwitcher.className} text-[#e0a200] text-5xl sm:text-7xl leading-none`}
          >
            Nuevo usuario
          </h1>
          <Link
            href="/admin/usuarios"
            className="h-10 px-4 rounded-md border border-[#e0a200]/30 text-[#e0a200] hover:bg-[#e0a200]/10 transition"
          >
            Volver
          </Link>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Card formulario */}
        <form
          onSubmit={onSubmit}
          className="rounded-2xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] p-5 grid grid-cols-1 gap-4"
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white"
              placeholder="Nombre completo"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Contraseña</label>
            <input
              type="password"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white"
              placeholder="••••••••"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#c2b48d]">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "Empleado" | "Admin")}
              className="h-11 rounded-md bg-black/60 border border-[#e0a200]/30 px-3 outline-none focus:ring-2 focus:ring-[#e0a200]/40 text-white"
            >
              <option value="Empleado">Empleado</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 mt-2">
            <Link
              href="/admin/usuarios"
              className="px-4 py-2 rounded-md border border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#e0a200]/20 text-[#e0a200] hover:bg-[#e0a200]/30 border border-[#e0a200]/30 disabled:opacity-60"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
