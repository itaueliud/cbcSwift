/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow API rewrites for local dev if needed
  async rewrites() {
    if (process.env.NODE_ENV !== "production") return [];
    return [];
  },
  // Ignore build errors on linting (deploy-safe)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
