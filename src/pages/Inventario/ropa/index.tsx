import { useState } from 'react';

type Ropa = {
  nombre: string;
  color: string;
  precio: number;
  imagen_url: string;
  categoriaNombre: string;
  observaciones?: string;
};

const ropaMock: Ropa[] = [
  {
    nombre: 'Camisa Blanca',
    color: 'Blanco',
    precio: 75000,
    imagen_url: 'https://via.placeholder.com/300',
    categoriaNombre: 'Formal',
    observaciones: 'Algodón 100%',
  },
  {
    nombre: 'Chaqueta Negra',
    color: 'Negro',
    precio: 120000,
    imagen_url: 'https://via.placeholder.com/300',
    categoriaNombre: 'Casual',
  },
];

export default function InventarioRopa() {
  const [seleccionado, setSeleccionado] = useState<Ropa | null>(null);

  return (
    <div className="min-h-screen px-6 py-8 text-white bg-black/70 backdrop-blur-[10px]">
      <h1 className="text-3xl font-bold mb-6 border-b border-[#e0a200]/30 pb-2">Inventario - Ropa</h1>

      <div className="overflow-x-auto rounded-xl shadow-[0_2px_10px_rgba(255,234,7,0.1)] border border-[#e0a200]/30">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#e0a200]/20 text-[#e0a200]">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {ropaMock.map((ropa) => (
              <tr
                key={`${ropa.nombre}-${ropa.color}`}
                onClick={() => setSeleccionado(ropa)}
                className="hover:bg-[#e0a200]/10 cursor-pointer transition-colors"
              >
                <td className="px-4 py-2">{ropa.nombre}</td>
                <td className="px-4 py-2">{ropa.color}</td>
                <td className="px-4 py-2">${ropa.precio.toLocaleString()}</td>
                <td className="px-4 py-2">{ropa.categoriaNombre}</td>
                <td className="px-4 py-2">{ropa.observaciones ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {seleccionado && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setSeleccionado(null)}
        >
          <div
            className="bg-black p-6 rounded-xl border border-[#e0a200]/30 max-w-md w-full shadow-[0_2px_10px_rgba(255,234,7,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={seleccionado.imagen_url}
              alt={seleccionado.nombre}
              className="w-full h-64 object-cover rounded-lg mb-4"
            />
            <h2 className="text-xl font-bold text-[#e0a200] mb-2">{seleccionado.nombre}</h2>
            <p><strong>Color:</strong> {seleccionado.color}</p>
            <p><strong>Precio:</strong> ${seleccionado.precio.toLocaleString()}</p>
            <p><strong>Categoría:</strong> {seleccionado.categoriaNombre}</p>
            {seleccionado.observaciones && (
              <p><strong>Observaciones:</strong> {seleccionado.observaciones}</p>
            )}
            <button
              className="mt-4 px-4 py-2 bg-[#e0a200] text-black rounded hover:bg-[#c89300] transition"
              onClick={() => setSeleccionado(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
