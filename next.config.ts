import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // registration photos are compressed client-side to well under this, but
    // leave headroom (Vercel caps the request body at 4.5 MB regardless).
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default withSerwist(nextConfig);
