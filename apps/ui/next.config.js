const nextConfig = {
  // Enable Turbopack for faster development builds
  // Note: Turbopack configuration is handled automatically by Next.js

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

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Enhanced polyfills for Dynamic Labs + ZeroDv compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        process: require.resolve("process/browser"),
        vm: false,
        fs: false,
        net: false,
        tls: false,
        // Dynamic Labs specific polyfills
        "react-native-sqlite-storage": false,
        "@react-native-async-storage/async-storage": false,
      };

      // Add required plugins for crypto compatibility
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );

      // Resolve module issues with Dynamic Labs
      config.resolve.alias = {
        ...config.resolve.alias,
        "react-native$": "react-native-web",
      };
    }

    // Externalize problematic packages
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@walletconnect/safe-json"
    );

    // Fix module resolution for AA packages
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },

  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: [
      "lucide-react",
      "@dynamic-labs/sdk-react-core",
      "@radix-ui/react-icons",
      "@tanstack/react-query",
    ],
    // Fix for Dynamic Labs SSR issues
    esmExternals: "loose",
  },

  // Enable compression
  compress: true,
  poweredByHeader: false,

  // PostHog rewrites (keeping existing)
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
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;
