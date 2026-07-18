/** @type {import('next').NextConfig} */
// Backend address: from the BACKEND_URL environment variable, or localhost by default for development.
// In deployment, set BACKEND_URL to the real backend address (e.g. http://api-preprod.internal:5080).
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5080';

// The app is fully self-contained (no CDN scripts/styles/fonts), so the CSP can stay strict.
// 'unsafe-inline'/'unsafe-eval' are required by Next.js itself (inline bootstrap scripts; eval in dev builds).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
