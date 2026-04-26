import type { NextConfig } from "next";
// next-pwa ships without first-party TypeScript types.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const withPWA = require("next-pwa") as (
  options: Record<string, unknown>,
) => (config: NextConfig) => NextConfig;

const isDev = process.env.NODE_ENV === "development";

const pwa = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: isDev,
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
  runtimeCaching: [
    {
      urlPattern: ({ request }: { request: Request }) =>
        request.destination === "document",
      handler: "NetworkFirst",
      options: {
        cacheName: "operator-pages",
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: ({ request }: { request: Request }) =>
        ["script", "style", "worker"].includes(request.destination),
      handler: "StaleWhileRevalidate",
      options: { cacheName: "operator-assets" },
    },
    {
      urlPattern: ({ request }: { request: Request }) =>
        request.destination === "image",
      handler: "CacheFirst",
      options: {
        cacheName: "operator-images",
        expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "operator-fonts",
        expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
};

export default pwa(nextConfig);
