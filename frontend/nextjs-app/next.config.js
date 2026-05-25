/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://crest-api-z8zf.onrender.com";
console.log("★ [Next.config.js] CONFIGURED BACKEND_URL is:", BACKEND_URL);

const nextConfig = {
  output: "standalone",
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
