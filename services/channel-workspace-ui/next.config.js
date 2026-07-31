/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  transpilePackages: ['@insurance/design-system', '@insurance/ui-utils', '@insurance/api-client'],
}

module.exports = nextConfig
