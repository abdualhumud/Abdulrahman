/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';
// Vercel sets VERCEL=1 automatically; GitHub Pages needs the /REMS basePath
const isVercel = !!process.env.VERCEL;

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // basePath and assetPrefix are only required for GitHub Pages (served at /REMS/)
  // On Vercel the app is served from the root /, so these must be empty
  basePath:    (!isVercel && isProd) ? '/REMS' : '',
  assetPrefix: (!isVercel && isProd) ? '/REMS/' : '',
};

module.exports = nextConfig;

