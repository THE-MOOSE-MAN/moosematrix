/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  transpilePackages: ["@moosematrix/ui"],

  images: {
    // Prefer remotePatterns over domains for security.
    // Only include hosts you actually load remote images from.
    remotePatterns: [
      // If you serve images from subdomains (via https://...):
      { protocol: "https", hostname: "moosematrix.com" },
      { protocol: "https", hostname: "www.moosematrix.com" },
      { protocol: "https", hostname: "dev-moosematrix.moosematrix.com" },
      { protocol: "https", hostname: "mooseman.moosematrix.com" },
      { protocol: "https", hostname: "dev-mooseman.moosematrix.com" },
      { protocol: "https", hostname: "moosebrain.moosematrix.com" },
      { protocol: "https", hostname: "dev-moosebrain.moosematrix.com" },
      { protocol: "https", hostname: "merch.moosematrix.com" },
      { protocol: "https", hostname: "m2.moosematrix.com" }
    ],
  },
};

export default nextConfig;
