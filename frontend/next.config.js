/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow cross-origin requests for development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api-backend/:path*',
          destination: 'http://127.0.0.1:2001/:path*',
        },
      ],
    };
  },
}

module.exports = nextConfig
