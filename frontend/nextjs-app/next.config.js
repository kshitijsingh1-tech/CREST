/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: '/ub_publicPortal',
        destination: '/crest_publicPortal',
      },
    ];
  },
};

module.exports = nextConfig;
