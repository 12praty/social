/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }] },
  experimental: {},
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  webpack: (config) => {
    // macOS can hit EMFILE (too many open files) with large dependency graphs.
    // Polling trades CPU for reliability; enable via WATCHPACK_POLLING=true.
    if (process.env.WATCHPACK_POLLING === "true") {
      config.watchOptions = {
        ...(config.watchOptions || {}),
        poll: Number(process.env.WATCHPACK_POLLING_INTERVAL || 1000),
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
