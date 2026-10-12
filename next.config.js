/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-655532e909a84173b724499ba0ea6f8c.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
