import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Only ship a service worker in production builds — in dev it would
  // otherwise intercept requests and make hot reload / API calls confusing
  // to debug.
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // Never let a session token, OTP, or live ride payload get cached —
    // socket + polling data must always come from the network.
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "google-fonts-stylesheets",
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-webfonts",
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year — font files are immutable per URL
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "images",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          },
        },
      },
      {
        // OpenStreetMap tile images that <RideMap> renders — worth caching
        // for a fast/offline-tolerant map, but short-lived since tiles can
        // change.
        urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "map-tiles",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
        },
      },
      {
        // Read-only, non-sensitive GET endpoints only (ride history, the
        // rider's own profile) — short cache purely to make repeat visits
        // feel instant; React Query still revalidates in the background on
        // top of this. Anything auth/session/OTP related is explicitly
        // excluded, so it always hits the network.
        urlPattern: ({ url, request }) =>
          request.method === "GET" &&
          /\/api\/(rides\/history|riders\/me|drivers\/me)(\?.*)?$/.test(
            url.pathname + url.search
          ),
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "api-get-cache",
          networkTimeoutSeconds: 4,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 5, // 5 minutes
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
    // Everything else (auth, fares, ride creation/status, payments,
    // sockets) falls through uncached, which is exactly what we want.
    navigateFallback: "/offline",
    navigateFallbackDenylist: [/^\/api\//],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
