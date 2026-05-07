import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
  },
  // Required for sharp to work correctly on Railway/Linux
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
};

export default nextConfig;
