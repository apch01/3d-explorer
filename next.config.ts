import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow up to 20 MB image uploads via Server Actions
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
