// src/pages/admin/usuarios/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "@/components/layout/AppLayout";
import { Qwitcher_Grypen } from "next/font/google";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import {
  listUsuarios,
  deleteUsuario,
  setEstadoUsuario,
  UsuarioDTO,
} from "@/services/usuarios";

const qwitcher = Qwitcher_Grypen({ weight: ["700"], subsets: ["latin"] });

function extractErrorMessage(err: any): string {
  const raw = err?.message ?? err ?? "";
  if (!raw) return "Error desconocido";
  try {
    const parsed = JSON.parse(raw);
    const m = (parsed as any)?.message;
    if (Array.isArray(m)) return m.join("\n");
    if (typeof m === "string") return m;
    return JSON.stringify(parsed);
  } catch {
    return String(raw);
  }
}

export default function UsuariosAdminPage() {
  const me = getCurrentUser();
  const router = useRouter();
  const soyAdmin = isAdmin(me?.rol);

  const [rows, setRows] = useState<UsuarioDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await listUsuarios();
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!soyAdmin) {
      router.replace("/warning");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!soyAdmin) return null;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Título centrado */}
        <div className="mb-6 flex items-center justify-center">
          <h1
            className={`${qwitcher.className} text-[#e0a200] text-6xl sm:text-8xl leading-none text-center`}
          >
            Usuarios
          </h1>
        </div>

        {/* Acciones superiores */}
        <div className="mb-4 flex items-center justify-end">
          <Link
            href="/admin/usuarios/nuevo"
            className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition inline-flex items-center"
          >
            Nuevo usuario
          </Link>
        </div>

        {/* Estado */}
        {loading && (
          <div className="mb-3 text-sm text-white/70">Cargando usuarios…</div>
        )}
        {error && (
          <div className="mb-3 text-sm text-red-400 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Tabla en card */}
        <div className="rounded-2xl bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.08)] overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/60">
              <tr>
                <th className="px-4 py-3 text-white/80">ID</th>
                <th className="px-4 py-3 text-white/80">Nombre</th>
                <th className="px-4 py-3 text-white/80">Rol</th>
                <th className="px-4 py-3 text-white/80">Estado</th>
                <th className="px-4 py-3 text-white/80 w-56"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-4 opacity-70" colSpan={5}>
                    No hay usuarios.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-[#e0a200]/15">
                  <td className="px-4 py-3">{u.id}</td>
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3">
                    {u.rol === "Admin" ? "Admin" : "Empleado"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "px-2 py-0.5 rounded-md text-sm border",
                        u.activo
                          ? "text-green-300 border-green-400/40 bg-green-500/10"
                          : "text-red-300 border-red-400/40 bg-red-500/10",
                      ].join(" ")}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1 rounded-md border border-[#e0a200]/30 hover:bg-[#e0a200]/10 text-[#e0a200]"
                        onClick={async () => {
                          try {
                            await setEstadoUsuario(u.id, !u.activo);
                            await load();
                          } catch (e: any) {
                            alert(extractErrorMessage(e));
                          }
                        }}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        className="px-3 py-1 rounded-md border border-red-500/40 hover:bg-red-500/10 text-red-300"
                        onClick={async () => {
                          if (!confirm(`Eliminar usuario ${u.nombre}?`)) return;
                          try {
                            await deleteUsuario(u.id);
                            await load();
                          } catch (e: any) {
                            alert(extractErrorMessage(e));
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-4">Cargando…</div>}
        </div>
      </div>
    </AppLayout>
  );
}
