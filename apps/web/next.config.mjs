/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Sortie autonome (server.js + node_modules minimaux) utilisée par
  // apps/web/Dockerfile pour une image de production plus légère.
  output: "standalone",
  experimental: {
    serverActions: {
      // Photos de reçus/factures prises au téléphone : prévoir plus que la limite par défaut (1 Mo).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
