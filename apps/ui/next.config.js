const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    domains: [
      "raw.githubusercontent.com",
      "assets.coingecko.com",
      "ethereum.org",
    ],
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js built-in modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
  // experimental: {
  //   optimizeCss: true,
  //   optimizePackageImports: ["lucide-react", "framer-motion", "wagmi"],
  // },
  // Enable brotli compression
  // compress: true,
  // poweredByHeader: false,
  // Configure webpack to optimize bundle size
  // webpack: (config, { isServer }) => {
  //   // Split chunks more aggressively
  //   if (!isServer) {
  //     config.optimization.splitChunks = {
  //       chunks: "all",
  //       maxInitialRequests: 30,
  //       maxAsyncRequests: 30,
  //       minSize: 20000,
  //       cacheGroups: {
  //         framework: {
  //           test: /[\\/]node_modules[\\/](react|react-dom|next|wagmi|viem)[\\/]/,
  //           name: "framework",
  //           priority: 40,
  //           chunks: "all",
  //         },
  //         commons: {
  //           test: /[\\/]node_modules[\\/]/,
  //           name: "commons",
  //           priority: 30,
  //           chunks: "all",
  //         },
  //         lib: {
  //           test: /[\\/]node_modules[\\/](framer-motion|@tanstack|styled-components)[\\/]/,
  //           name: "lib",
  //           priority: 20,
  //           chunks: "all",
  //         },
  //       },
  //     };
  //   }
  //   return config;
  // },
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
};

module.exports = nextConfig;
