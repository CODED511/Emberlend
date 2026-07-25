/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // These are optional deps pulled by @metamask/sdk / walletconnect that
    // only exist in React Native or Node contexts. Stub them for the browser
    // build so webpack doesn't fail on the unresolved imports.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
      lokijs: false,
      encoding: false,
    };
    return config;
  },
};

module.exports = nextConfig;
