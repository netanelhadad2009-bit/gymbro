/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Prevent webpack cache corruption issues
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable memory cache in development to prevent corruption
      config.cache = false;
    }
    return config;
  },

  // Disable experimental features that may cause cache issues
  experimental: {
    // Ensure consistent builds
    webpackBuildWorker: false,
  }
};

module.exports = nextConfig;
