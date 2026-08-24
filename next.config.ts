import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // One canonical host. Without this, www serves a full copy of the site
      // and every page exists at two URLs; the canonical tags point crawlers
      // at the apex, but a permanent redirect settles it for people too.
      // Kept in the repo rather than as a dashboard setting so it survives
      // moving hosts and is visible in review.
      {
        source: "/:path*",
        has: [{ type: "host" as const, value: "www.dannvincentpalmes.com" }],
        destination: "https://dannvincentpalmes.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
