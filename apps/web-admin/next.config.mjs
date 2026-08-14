/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ESLint du monorepo géré à la racine (eslint.config.mjs) — on ne bloque pas le build dessus.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Le port de dev/start est piloté par WEB_ADMIN_PORT (défaut 3001, cf. package.json : next dev -p ${WEB_ADMIN_PORT:-3001}).
};

export default nextConfig;
