import Navbar from "@/components/layout/NavBar";
import Particles from "@/components/visual/Particles";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: Props) {
  return (
    <div className="relative min-h-screen text-white">
      {/* Fondo de partículas fijo detrás de todo */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Particles
          className="h-full w-full"
          particleCount={240}
          particleSpread={10}
          speed={0.18}
          particleColors={["#e0a200", "#f0b300", "#c58a00"]} // tu paleta
          moveParticlesOnHover={true}
          particleHoverFactor={0.6}
          alphaParticles={true}
          particleBaseSize={120}
          sizeRandomness={0.9}
          cameraDistance={22}
          disableRotation={false}
        />
      </div>

      {/* Capa base oscura por si el canvas está transparente */}
      <div className="fixed inset-0 -z-20 bg-[#000000]" />

      {/* Navbar y contenido */}
      <Navbar />
      <main className="pt-[72px]"> {/* compensa la altura del navbar en desktop */}
        {children}
      </main>
    </div>
  );
}
