import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Permite construir aunque existan errores de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite construir aunque existan errores de TypeScript
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
