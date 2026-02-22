
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimisations pour Vercel serverless
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless']
  },
  
  // Désactiver le linting pendant le build si nécessaire
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Désactiver les erreurs TypeScript pendant le build (à retirer en prod)
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Headers de sécurité
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
