/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: false, // Disable compression to help with streaming
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // Point to the correct path
      },
    ];
  },
};

export default nextConfig;