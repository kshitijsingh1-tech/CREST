/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://crest-api-0uc4.onrender.com";

const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: '/ub_crest',
        destination: '/ub_CREST',
        permanent: false,
      },
      {
        source: '/ub_crest/:path*',
        destination: '/ub_CREST/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ub_publicPortal',
        destination: '/crest_publicPortal',
      },
      // Proxy all /api/* requests server-side to backend → eliminates CORS
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      // Proxy socket.io for real-time dashboard updates
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
