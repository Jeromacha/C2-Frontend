import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const router = useRouter();

  const handleDropdown = (menu: string) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  const go = async (href: string) => {
    setIsOpen(false);
    setOpenDropdown(null);
    if (router.asPath !== href) await router.push(href);
  };

  const menuItems = [
    {
      label: "Inventario",
      href: "#",
      subItems: [
        { label: "Ropa",    href: "/Inventario/ropa" },
        { label: "Zapatos", href: "/Inventario/zapatos" },
        { label: "Bolsos",  href: "/Inventario/bolsos" },
      ],
    },
    {
      label: "Ventas",
      href: "#",
      subItems: [
        { label: "Agregar venta", href: "/ventas/nueva" },
        { label: "Ver registro de ventas", href: "/ventas/registro" }
      ],
    },
    {
      label: "Devoluciones",
      href: "#",
      subItems: [
        { label: "Registrar devolución", href: "/devoluciones/nueva" },
        { label: "Ver registro de devoluciones", href: "/devoluciones/registro" }
      ],
    },
    {
      label: "Ingreso de mercancía",
      href: "#",
      subItems: [
        { label: "Registrar ingreso", href: "/ingresos/nueva" },
        { label: "Ver registro de ingresos", href: "/ingresos/registro" }
      ],
    },
  ];

  return (
    <>
      {/* Botón hamburguesa */}
      <div className="fixed top-4 right-4 z-30 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#e0a200] text-3xl bg-black/70 p-2 rounded-md backdrop-blur-[10px] border border-[#e0a200]/30"
        >
          <span className="material-symbols-outlined">
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Navbar principal */}
      <nav className={`fixed top-0 left-0 z-20 h-full w-[280px] bg-black/70 backdrop-blur-[10px] border-r border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.1)]
        p-6 flex flex-col gap-6 transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-full md:h-[72px] md:flex-row md:items-center md:justify-between md:px-6 md:py-0 md:border-b md:border-[#e0a200]/30`}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer"
          onClick={() => go('/dashboard')}
        >
          <img src="/img/logo.png" alt="Logo" className="w-10 h-10" />
          <span className="text-xl font-medium text-[#e0a200]">Inventario C2</span>
        </div>

        {/* Menú - Mobile */}
        <div className="flex flex-col gap-2 flex-grow md:hidden">
          {menuItems.map(({ label, subItems }) => (
            <div key={label} className="flex flex-col">
              <button
                onClick={() => handleDropdown(label)}
                className="flex items-center justify-between px-4 py-2 rounded-md text-white bg-black/50 hover:bg-black/60 hover:text-[#e0a200] transition-colors whitespace-nowrap"
              >
                {label}
                {!!subItems.length && (
                  <span className="material-symbols-outlined">
                    {openDropdown === label ? 'expand_less' : 'expand_more'}
                  </span>
                )}
              </button>

              {!!subItems.length && openDropdown === label && (
                <div className="ml-8 mt-1 flex flex-col border-l border-[#e0a200]/30">
                  {subItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-4 py-2 text-white/80 hover:text-[#e0a200] transition-colors text-sm"
                      onClick={(e) => { e.preventDefault(); go(item.href); }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Menú - Desktop */}
        <div className="hidden md:flex items-center justify-center flex-grow gap-8">
          {menuItems.map(({ label, subItems }) => (
            <div key={label} className="relative group h-full flex items-center">
              <button
                onClick={() => handleDropdown(label)}
                className="px-4 py-2 text-white hover:text-[#e0a200] transition-colors flex items-center h-full"
              >
                {label}
                {!!subItems.length && (
                  <span className="material-symbols-outlined text-sm ml-1">
                    expand_more
                  </span>
                )}
              </button>

              {!!subItems.length && openDropdown === label && (
                <div className="flex flex-col absolute top-full left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-[10px] border border-[#e0a200]/30 shadow-[0_2px_10px_rgba(255,234,7,0.1)] rounded-md z-50 min-w-[180px]">
                  {subItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="px-4 py-2 text-white hover:bg-[#e0a200]/10 hover:text-[#e0a200] transition-colors"
                      onClick={(e) => { e.preventDefault(); go(item.href); }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botón Cerrar Sesión */}
        <button
          onClick={() => go('/login')}
          className="mt-auto px-4 py-2 rounded-md bg-[#e0a200]/10 text-[#e0a200] hover:bg-[#e0a200]/20 transition-colors flex items-center gap-2 md:mt-0 md:ml-auto"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="md:inline">Cerrar sesión</span>
        </button>
      </nav>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
        body { font-family: 'Poppins', sans-serif; background: #0f0a1a; padding-top: 0; }
        @media (min-width: 768px) { body { padding-top: 72px; } }
      `}</style>
    </>
  );
}
