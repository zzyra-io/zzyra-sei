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

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
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
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        })
      );

      config.resolve.alias = {
        ...config.resolve.alias,
        "react-native$": "react-native-web",
      };
    }

    // Remove problematic externals that may cause webpack errors
    // config.externals.push(...) - Comment this out temporarily

    return config;
  },

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@dynamic-labs/sdk-react-core",
      "@radix-ui/react-icons",
      "@tanstack/react-query",
    ],
  },

  compress: true,
  poweredByHeader: false,

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
