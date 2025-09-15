/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  transpilePackages: ["@moosematrix/ui"]
};
export default nextConfig;
