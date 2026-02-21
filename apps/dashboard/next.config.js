/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Required for GitHub Pages: repo is served at /Abdulrahman/ not /
  basePath:    isProd ? '/Abdulrahman' : '',
  assetPrefix: isProd ? '/Abdulrahman/' : '',
};

module.exports = nextConfig;
