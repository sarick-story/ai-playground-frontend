/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Similarly, ignore TypeScript errors during builds
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  // swcMinify: true, // Removed as it's no longer a valid option
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs, remove all others
    } : false,
  },
  experimental: {
    // Optimize build time 
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@rainbow-me/rainbowkit',
      'wagmi',
    ],
    // Configure Turbopack
    turbo: {
      // Add rules for better turbopack performance
      rules: {
        // Skip type checking during development (improves speed)
        '**/*.{ts,tsx}': {
          globalPreventDevRule: true,
          loaders: []
        }
      }
    },
  },
  env: {
    // Make environment variables available to the client
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  // Minimize external warnings and optimize build output
  webpack: (config, { isServer }) => {
    // Ignore specific warnings during build
    config.ignoreWarnings = [
      // Ignore warnings from pino and other packages
      { message: /Critical dependency: the request of a dependency is an expression/ },
      { message: /Can't resolve 'pino-pretty'/ },
    ];
    
    return config;
  },
}

module.exports = nextConfig 