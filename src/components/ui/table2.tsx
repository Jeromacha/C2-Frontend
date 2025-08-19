"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";

type Column<Row> = {
  key: keyof Row;
  label: string;
  className?: string;
  render?: (value: any, row: Row) => React.ReactNode;
};

type Props<Row extends Record<string, any>> = {
  rows: Row[];
  columns: Column<Row>[];
  initialSortKey?: keyof Row;
  initialSortOrder?: "asc" | "desc";
  className?: string;
  showActions?: boolean;
  onEdit?: (row: Row) => void;
  onDelete?: (row: Row) => void;
};

export default function Table2<Row extends Record<string, any>>({
  rows,
  columns,
  initialSortKey,
  initialSortOrder = "asc",
  className = "",
  showActions = false,
  onEdit,
  onDelete,
}: Props<Row>) {
  const defaultKey = (initialSortKey ?? columns[0]?.key) as keyof Row;
  const [sortKey, setSortKey] = useState<keyof Row>(defaultKey);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(initialSortOrder);

  // Estado para asegurar que estamos en cliente (evitar SSR glitches)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Menú contextual
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  // Ordenamiento
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a?.[sortKey];
      const vb = b?.[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return sortOrder === "asc" ? -1 : 1;
      if (vb == null) return sortOrder === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortOrder === "asc" ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return sortOrder === "asc" ? -1 : 1;
      if (sa > sb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortOrder]);

  const onSort = (key: keyof Row) => {
    if (key === sortKey) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Calcula posición preferida junto al botón + flip si es necesario
  const computeMenuPosition = (buttonEl: HTMLElement, menuSize?: { w: number; h: number }) => {
    const rect = buttonEl.getBoundingClientRect();
    const scrollY = window.pageYOffset ?? document.documentElement.scrollTop ?? 0;
    const scrollX = window.pageXOffset ?? document.documentElement.scrollLeft ?? 0;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const estW = menuSize?.w ?? 176; // w-44
    const estH = menuSize?.h ?? 96;  // alto aprox

    let top = rect.bottom + scrollY + 6;          // debajo del botón
    let left = rect.right + scrollX - estW;       // alineado al borde derecho del botón

    // Ajustes horizontales
    if (left + estW > scrollX + vw - 8) left = scrollX + vw - 8 - estW;
    if (left < scrollX + 8) left = scrollX + 8;

    // Flip vertical si se sale por abajo
    if (top + estH > scrollY + vh - 8) {
      top = rect.top + scrollY - estH - 6;
    }
    if (top < scrollY + 8) top = scrollY + 8;

    return { top, left };
  };

  // Afinar posición tras montar el menú (usar tamaño real)
  useEffect(() => {
    if (!mounted) return;
    if (openMenuId === null) return;
    if (!menuRef.current || !anchorRef.current) return;

    const refine = () => {
      const menuRect = menuRef.current!.getBoundingClientRect();
      const size = { w: menuRect.width, h: menuRect.height };
      const pos = computeMenuPosition(anchorRef.current!, size);
      setMenuPos(pos);
    };

    const id = requestAnimationFrame(refine);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, openMenuId]);

  // Listeners para cerrar menú
  useEffect(() => {
    if (!mounted) return;

    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!(e.target instanceof Node)) return;
      // Si clic fuera del menú y fuera del botón, cerrar
      if (!menuRef.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpenMenuId(null);
    const onScrollOrResize = () => setOpenMenuId(null);

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [mounted]);

  return (
    <div
      className={[
        "overflow-hidden rounded-lg",
        "bg-black/70 backdrop-blur-[10px]",
        "border border-[#e0a200]/30",
        "shadow-[0_2px_10px_rgba(255,234,7,0.08)]",
        className,
      ].join(" ")}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-[1] bg-[#0e0e0e]/90 backdrop-blur">
            <tr className="border-b border-[#e0a200]/20">
              {columns.map((col) => {
                const active = col.key === sortKey;
                return (
                  <th
                    key={String(col.key)}
                    onClick={() => onSort(col.key)}
                    className={[
                      "h-14 px-3 sm:px-4 text-sm font-medium select-none",
                      "text-[#cfcfd4] hover:text-white transition-colors",
                      "whitespace-nowrap align-middle cursor-pointer",
                      active ? "text-white" : "",
                      col.className ?? "",
                    ].join(" ")}
                    title={`Ordenar por ${col.label}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{col.label}</span>
                      <span
                        className={[
                          "material-symbols-outlined text-[16px] leading-none",
                          active ? "opacity-100" : "opacity-30",
                        ].join(" ")}
                      >
                        {active
                          ? sortOrder === "asc"
                            ? "arrow_drop_up"
                            : "arrow_drop_down"
                          : "unfold_more"}
                      </span>
                    </div>
                  </th>
                );
              })}
              {showActions && (
                <th
                  className="h-14 px-3 sm:px-4 text-sm font-medium text-[#cfcfd4] whitespace-nowrap align-middle w-12"
                  aria-label="Acciones"
                  title="Acciones"
                />
              )}
            </tr>
          </thead>

          <tbody className="text-sm">
            {sorted.map((row, idx) => {
              const rowId =
                (row as any).id ??
                (row as any).ID ??
                `${idx}-${String((row as any)[columns[0]?.key])}`;

              return (
                <tr
                  key={String(rowId)}
                  className={[
                    "transition-colors",
                    "border-b border-[#e0a200]/20",
                    idx % 2 === 0 ? "bg-[#111015]/60" : "bg-[#0d0c11]/60",
                    "hover:bg-white/5",
                  ].join(" ")}
                >
                  {columns.map((col) => {
                    const raw = row[col.key];
                    const value = col.render ? col.render(raw, row) : raw;
                    return (
                      <td
                        key={String(col.key)}
                        className={[
                          "h-[50px] px-3 sm:px-4 whitespace-nowrap align-middle",
                          "text-white/80 group-hover:text-white",
                          col.className ?? "",
                        ].join(" ")}
                        title={typeof value === "string" ? value : undefined}
                      >
                        <div className="truncate">{value as any}</div>
                      </td>
                    );
                  })}

                  {showActions && (
                    <td className="h-[50px] px-2 sm:px-3 whitespace-nowrap align-middle text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const btn = e.currentTarget as HTMLElement;
                          anchorRef.current = btn;

                          // Posición inicial (antes de montar el menú)
                          const pos = computeMenuPosition(btn);
                          setMenuPos(pos);

                          setOpenMenuId((prev) => (prev === rowId ? null : rowId));
                        }}
                        className="px-2 py-1 rounded-md text-white hover:bg-[#e0a200]/10 border border-transparent hover:border-[#e0a200]/30"
                        aria-label="Abrir acciones"
                      >
                        ⋮
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="h-24 px-4 text-center text-white/60"
                >
                  Sin datos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Menú contextual en portal (solo si estamos montados en cliente) */}
      {mounted &&
        showActions &&
        openMenuId !== null &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-44 rounded-md bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_10px_30px_rgba(255,234,7,0.12)] overflow-hidden"
            style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                // Buscar la fila correspondiente por id
                const row = rows.find((r, i) => {
                  const rid =
                    (r as any).id ??
                    (r as any).ID ??
                    `${i}-${String((r as any)[columns[0]?.key])}`;
                  return String(rid) === String(openMenuId);
                });
                setOpenMenuId(null);
                if (row) onEdit?.(row);
              }}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#e0a200]/10"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                const row = rows.find((r, i) => {
                  const rid =
                    (r as any).id ??
                    (r as any).ID ??
                    `${i}-${String((r as any)[columns[0]?.key])}`;
                  return String(rid) === String(openMenuId);
                });
                setOpenMenuId(null);
                if (row) onDelete?.(row);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Eliminar
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
