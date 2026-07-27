/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  transpilePackages: ['@insurance/design-system', '@insurance/ui-utils', '@insurance/api-client'],
};

module.exports = nextConfig;
