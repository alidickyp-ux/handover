/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['*.supabase.co'],
  },
  // Untuk deploy di Vercel
  output: 'standalone',
  // Optimasi untuk mobile
  swcMinify: true,
  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;