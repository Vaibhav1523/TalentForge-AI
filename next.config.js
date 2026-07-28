/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['country-state-city', 'lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/auth/login',
        destination: '/sign-in',
        permanent: true,
      },
      {
        source: '/auth/register',
        destination: '/sign-in',
        permanent: true,
      },
      {
        source: '/for-ai-data-partners',
        destination: '/ai-data-partners',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
