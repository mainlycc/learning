import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ustawiamy root śledzenia plików na katalog projektu `e2`,
  // aby Next.js nie wybierał przypadkowo innego lockfile i tsconfig z katalogu domowego
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
