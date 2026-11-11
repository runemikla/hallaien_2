import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded by the custom server (server.ts) as well as by Next.js.
  serverExternalPackages: ['@google-cloud/firestore'],
};

export default nextConfig;
