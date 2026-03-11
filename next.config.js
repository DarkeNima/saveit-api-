/** @type {import('next').NextConfig} */
const nextConfig = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
    responseLimit: false,
  },
};
module.exports = nextConfig;
