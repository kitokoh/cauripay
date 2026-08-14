/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le port (3002, ADR-004) est piloté par WEB_BUSINESS_PORT via les scripts
  // package.json (dev / start / start:dev) : `next dev -p ${WEB_BUSINESS_PORT:-3002}`.
};

export default nextConfig;
