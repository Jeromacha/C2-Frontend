import React, { useEffect, useState } from "react";

export type BolsoFormValues = {
  id: string;
  nombre: string;
  color: string;
  precio: number | string;
  observaciones?: string;
  cantidad: number | string;
};

type Props = {
  initial?: Partial<BolsoFormValues>;
  onSubmit: (values: BolsoFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
};

export default function BolsoForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Guardar",
}: Props) {
  const [values, setValues] = useState<BolsoFormValues>({
    id: "",
    nombre: "",
    color: "",
    precio: "",
    observaciones: "",
    cantidad: "",
  });

  useEffect(() => {
    setValues((v) => ({
      id: initial?.id ?? v.id,
      nombre: initial?.nombre ?? v.nombre,
      color: initial?.color ?? v.color,
      precio: initial?.precio ?? v.precio,
      observaciones: initial?.observaciones ?? v.observaciones,
      cantidad: initial?.cantidad ?? v.cantidad,
    }));
  }, [initial]);

  const handleChange =
    (field: keyof BolsoFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [field]: e.target.value }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...values,
      precio: Number(values.precio) || 0,
      cantidad: Number(values.cantidad) || 0,
    });
  };

  const inputBase =
    "w-full h-11 px-3 rounded-md bg-black/50 text-white outline-none transition-all border border-[#e0a200]/20 focus:ring-2 focus:ring-[#e0a200]/50 placeholder-white/30";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm text-white/70">ID</label>
          <input
            required
            value={values.id}
            onChange={handleChange("id")}
            className={inputBase}
            placeholder="Ej: BOLSO123"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm text-white/70">Nombre</label>
          <input
            required
            value={values.nombre}
            onChange={handleChange("nombre")}
            className={inputBase}
            placeholder="Ej: Bolso elegante"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm text-white/70">Color</label>
          <input
            required
            value={values.color}
            onChange={handleChange("color")}
            className={inputBase}
            placeholder="Ej: Negro"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm text-white/70">Precio</label>
          <input
            required
            type="number"
            step="0.01"
            value={values.precio}
            onChange={handleChange("precio")}
            className={inputBase}
            placeholder="Ej: 120000"
          />
        </div>
        <div>
          <label className="block mb-1 text-sm text-white/70">Cantidad</label>
          <input
            required
            type="number"
            value={values.cantidad}
            onChange={handleChange("cantidad")}
            className={inputBase}
            placeholder="Ej: 5"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block mb-1 text-sm text-white/70">
            Observaciones
          </label>
          <textarea
            value={values.observaciones}
            onChange={handleChange("observaciones")}
            className={[inputBase, "min-h-[94px]"].join(" ")}
            placeholder="Notas opcionales…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-md text-white/80 hover:bg-white/5 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="h-10 px-4 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
