import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.zonaprop.com.ar' },
      { protocol: 'https', hostname: '**.navent.com' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
