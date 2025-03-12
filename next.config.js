/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:6666',
  },
  // Configure longer timeout for API requests
  experimental: {
    serverComponentsExternalPackages: [],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ];
  },
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: `${process.env.BACKEND_URL || 'http://localhost:6666'}/api/:path*`,
    },
  ],
};

module.exports = nextConfig; 