const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Critical: Optimize for Netlify's memory constraints
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@dynamic-labs/sdk-react-core",
      "@radix-ui/react-icons",
      "@tanstack/react-query",
    ],
    // Reduce memory usage during build
    workerThreads: false,
    cpus: 1,
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

    // Critical: Optimize bundle size and memory usage
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        maxSize: 200000, // Smaller chunks to reduce memory pressure
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            maxSize: 200000,
          },
        },
      },
    };

    return config;
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

  // Critical: Optimize static generation
  generateStaticParams: async () => {
    return []; // Disable static generation for memory optimization
  },
};

module.exports = nextConfig;
