/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow cross-origin requests for development
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/python-api/:path*',
          destination: 'http://127.0.0.1:5000/:path*',
        },
      ],
    };
  },
}

module.exports = nextConfig
