import type { NextConfig } from "next";

const isAndroidBuild = process.env.BUILD_TARGET === "android";

const nextConfig: NextConfig = {
  ...(isAndroidBuild ? { output: "export" as const } : {}),
  images: {
    ...(isAndroidBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
