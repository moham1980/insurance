/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@insurance/design-system', '@insurance/ui-utils', '@insurance/api-client'],
};

export default nextConfig;
