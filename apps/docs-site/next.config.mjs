import nextra from "nextra";

// Set up Nextra with correct configuration for Nextra 4
const withNextra = nextra({
  // Nextra 4 uses a simpler configuration approach
  defaultShowCopyCode: true,
  staticImage: true,
  latex: true,
});

// Export the final Next.js config with Nextra included
export default withNextra({
  // Next.js config options
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    domains: ["nextra.site", "docs.zyra.io"],
    formats: ["image/webp", "image/avif"],
  },
  experimental: {
    optimizeCss: true,
  },
  // Performance optimizations
  compress: true,
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
});
