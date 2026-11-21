import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev", "127.0.0.1", "192.168.1.94"],

  experimental: {
    agentUpgrade: "security",
  },

  async redirects() {
    return [
      {
        // SEO: marketing content moved to /; keep /landing as a permanent redirect.
        source: "/landing",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
