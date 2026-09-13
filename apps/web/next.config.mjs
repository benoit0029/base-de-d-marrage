/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Photos de reçus/factures prises au téléphone : prévoir plus que la limite par défaut (1 Mo).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
