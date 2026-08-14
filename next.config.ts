import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true, // Ativa compressão nativa Gzip e Brotli para todas as respostas
  poweredByHeader: false,
  reactStrictMode: false,
  images: {
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|ico|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
