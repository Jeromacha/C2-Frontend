// src/components/ui/KebabMenu.tsx
import React, { useEffect, useRef, useState } from "react";

type KebabMenuProps = {
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function KebabMenu({ onEdit, onDelete }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-1 rounded-md text-white hover:bg-[#e0a200]/10 border border-transparent hover:border-[#e0a200]/30"
        aria-label="Acciones"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_10px_30px_rgba(255,234,7,0.12)] z-50">
          <button
            onClick={() => { setOpen(false); onEdit?.(); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#e0a200]/10"
          >
            Editar
          </button>
          <button
            onClick={() => { setOpen(false); onDelete?.(); }}
            className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}
