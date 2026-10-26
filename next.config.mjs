/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/**/*', './prisma/dev.db'],
      '/*': ['./prisma/**/*', './prisma/dev.db'],
    },
  },
};

export default nextConfig;
