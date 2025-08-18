import { useState } from 'react';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="relative z-10 w-full max-w-[380px] rounded-[40px] px-6 sm:px-8 py-10 sm:py-12 bg-black/70 backdrop-blur-[10px] shadow-[0_20px_50px_rgba(255,234,7,0.1)] flex flex-col items-center text-center border border-[#e0a200]/30 mx-4 sm:mx-0">
      <img src="/img/logo.png" alt="Logo" className="w-[64px] sm:w-[74px] mb-6 sm:mb-8" />
      <h2 className="text-xl sm:text-2xl font-medium mb-1 text-white">Inventario C2</h2>
      <h3 className="text-sm text-[#e0a200] font-medium mb-12 sm:mb-14">
        Inicia sesión para continuar
      </h3>

      <form className="grid gap-4 w-full mb-8">
        <div className="relative">
          <input
            required
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="peer w-full h-12 sm:h-14 px-4 pt-2 rounded-md bg-black/50 text-white outline-none transition-all focus:ring-2 focus:ring-[#e0a200] border border-[#e0a200]/20"
          />
          <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e0a200]/70 transition-all origin-left peer-focus:scale-[0.725] peer-focus:-translate-y-[112%] peer-valid:scale-[0.725] peer-valid:-translate-y-[112%]">
            Usuario
          </label>
        </div>

        <div className="relative">
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer w-full h-12 sm:h-14 px-4 pt-2 rounded-md bg-black/50 text-white outline-none transition-all focus:ring-2 focus:ring-[#e0a200] border border-[#e0a200]/20"
          />
          <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e0a200]/70 transition-all origin-left peer-focus:scale-[0.725] peer-focus:-translate-y-[112%] peer-valid:scale-[0.725] peer-valid:-translate-y-[112%]">
            Contraseña
          </label>
        </div>

        <button
          type="submit"
          className="h-12 sm:h-14 w-full rounded-md bg-[#e0a200] text-black text-[16px] sm:text-[17px] font-bold flex items-center justify-center group hover:bg-[#f0b500] transition-colors"
        >
          <div className="flex items-center">
            <span className="block transition-transform group-hover:-translate-x-2">
              Iniciar sesión
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>
      </form>
    </div>
  );
}
