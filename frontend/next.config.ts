import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable the floating Next.js dev indicator (the "N" icon)
  devIndicators: false,

  // Fix turbopack workspace root warning
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
