import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Avoid picking up parent lockfiles outside this monorepo
  turbopack: {
    root: __dirname,
  },
  // Pipeline spawns Node scripts from monorepo parent; needs Node runtime APIs.
  serverExternalPackages: ['adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '80mb',
    },
  },
};

export default nextConfig;
