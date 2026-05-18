import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent bundling of Node.js-only packages; use native require at runtime
  serverExternalPackages: ["@imgly/background-removal-node", "onnxruntime-node"],
  experimental: {
    serverActions: {
      // Allow up to 20 MB image uploads via Server Actions
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
