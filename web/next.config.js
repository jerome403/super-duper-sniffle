/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // Allow large file uploads
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
