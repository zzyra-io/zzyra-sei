/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@zyra/wallet", "@zyra/types"],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  // Turbopack configuration for Next.js 15
  turbopack: {
    // Add any specific Turbopack rules if needed in the future
  },
  // CSP configuration temporarily disabled for Magic SDK debugging
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "Content-Security-Policy",
  //           value: [
  //             "default-src 'self'",
  //             "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://us.i.posthog.com https://us-assets.i.posthog.com https://*.magic.link https://*.fortmatic.com",
  //             "style-src 'self' 'unsafe-inline'",
  //             "img-src 'self' data: https: blob:",
  //             "font-src 'self' data:",
  //             "connect-src 'self' https://evm-rpc-arctic-1.sei-apis.com https://*.sei-apis.com https://us.i.posthog.com https://us-assets.i.posthog.com https://*.magic.link https://*.fortmatic.com wss://*.magic.link ws://localhost:* http://localhost:*",
  //             "frame-src 'self' https://*.magic.link https://*.fortmatic.com",
  //             "object-src 'none'",
  //             "base-uri 'self'",
  //             "form-action 'self'",
  //             "frame-ancestors 'none'",
  //             "upgrade-insecure-requests",
  //           ].join("; "),
  //         },
  //       ],
  //     },
  //   ];
  // },
};

export default nextConfig;
