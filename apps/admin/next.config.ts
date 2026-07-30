import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // standalone só no build de deploy (Docker/Linux) — no Windows local o file tracing
  // tenta criar symlinks do store do pnpm e falha com EPERM.
  ...(process.env.NEXT_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  async rewrites() {
    // Em dev, proxy para a API local — evita CORS no painel.
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3001'}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
