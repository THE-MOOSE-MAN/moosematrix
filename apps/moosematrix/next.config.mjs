/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@moosematrix/ui"],

  // Accept requests from your domains
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    domains: [
      "moosematrix.com",
      "www.moosematrix.com",
      "dev-moosematrix.moosematrix.com",
      "mooseman.moosematrix.com",
      "dev-mooseman.moosematrix.com",
      "moosebrain.moosematrix.com",
      "dev-moosebrain.moosematrix.com",
      "merch.moosematrix.com",
      "m2.moosematrix.com",
    ],
  },
};

export default nextConfig;
