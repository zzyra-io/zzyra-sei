const nextConfig = {
  // reactStrictMode: true,
  // swcMinify: true,
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
};

module.exports = nextConfig;
