import Navbar from "@/components/layout/NavBar";

export default function InventarioBolsos() {
  const bolsos = [
    { id: 1, nombre: "Bolso de cuero", color: "Negro", precio: 120000, observaciones: "Edición limitada", cantidad: 10 },
    { id: 2, nombre: "Bolso deportivo", color: "Azul", precio: 80000, observaciones: "Resistente al agua", cantidad: 5 },
  ];

  return (
    <div className="min-h-screen bg-black/70 text-white">
      <Navbar />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#e0a200] mb-4">Inventario de Bolsos</h1>
        <div className="overflow-x-auto rounded-lg border border-[#e0a200]/30 shadow-md">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-[#e0a200]/20 text-[#e0a200]">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Color</th>
                <th className="px-4 py-2 text-left">Precio</th>
                <th className="px-4 py-2 text-left">Observaciones</th>
                <th className="px-4 py-2 text-left">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {bolsos.map((bolso) => (
                <tr key={bolso.id} className="border-b border-[#e0a200]/30 hover:bg-[#e0a200]/10">
                  <td className="px-4 py-2">{bolso.id}</td>
                  <td className="px-4 py-2">{bolso.nombre}</td>
                  <td className="px-4 py-2">{bolso.color}</td>
                  <td className="px-4 py-2">${bolso.precio.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-2">{bolso.observaciones}</td>
                  <td className="px-4 py-2">{bolso.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
