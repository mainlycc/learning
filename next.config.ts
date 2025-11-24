import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ustawiamy root śledzenia plików na katalog projektu `e2`,
  // aby Next.js nie wybierał przypadkowo innego lockfile i tsconfig z katalogu domowego
  outputFileTracingRoot: path.join(__dirname),
  
  // Konfiguracja dla Next.js Image - pozwala ładować obrazy z Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Zwiększ limit rozmiaru body dla Server Actions (domyślnie 1 MB)
  // Potrzebne do uploadu plików PDF/PPTX do 40 MB
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
