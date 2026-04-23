import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for PDF uploads (10MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Handle server-only packages
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
