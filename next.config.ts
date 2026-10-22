import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },

  allowedDevOrigins: ["local-origin.dev", "*.local-origin.dev", "127.0.0.1", "192.168.1.94"],
};

export default nextConfig;
