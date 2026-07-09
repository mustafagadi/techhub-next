/** @type {import('next').NextConfig} */
// عنوان الخلفية: من متغيّر البيئة BACKEND_URL، أو localhost افتراضيًّا للتطوير.
// في النشر، اضبط BACKEND_URL لعنوان الخلفية الفعلي (مثل http://api-preprod.internal:5080).
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5080';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
    ];
  },
};
module.exports = nextConfig;
