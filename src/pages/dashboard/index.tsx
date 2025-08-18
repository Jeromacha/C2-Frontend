import Navbar from '@/components/layout/NavBar';

export default function DashboardPage() {
  const isAdmin = true; // ← Esto luego vendrá del contexto del login

  return (
    <div className="min-h-screen bg-[#151515] text-white">
      <Navbar/>
      <main className="p-6">
        <h2 className="text-2xl font-semibold text-[#e0a200]">Bienvenido al panel</h2>
        <p className="mt-2">Selecciona una opción del menú para comenzar.</p>
      </main>
    </div>
  );
}
