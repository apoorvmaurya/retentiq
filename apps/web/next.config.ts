import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    return [
      {
        source: '/ai-service/:path*',
        destination: `${aiServiceUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
