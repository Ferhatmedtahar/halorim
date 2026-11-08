/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@glowframe/schema', '@glowframe/presets', '@glowframe/core', '@glowframe/export'],
  output: 'standalone',
};

export default nextConfig;
