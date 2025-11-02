import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Enable compression
  compress: true,
  
  // Optimize CSS
  experimental: {
    optimizeCss: true,
  },
  
  // Optimize production builds (no source maps for smaller bundles)
  productionBrowserSourceMaps: false,
  
  // Optimize webpack chunk splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimize chunk splitting for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Framework chunk (React, Next.js)
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Vendor chunk (other node_modules)
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 30,
              minChunks: 2,
            },
            // Common chunk (shared code)
            common: {
              name: 'common',
              minChunks: 2,
              priority: 20,
              reuseExistingChunk: true,
            },
          },
          maxInitialRequests: 25,
          minSize: 20000,
        },
      };
    }
    return config;
  },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: (() => {
      const patterns: { protocol: 'https'; hostname: string }[] = []
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        if (supabaseUrl) {
          const { hostname } = new URL(supabaseUrl)
          patterns.push({ protocol: 'https', hostname })
        }
      } catch {}
      // Add common image CDN domains
      patterns.push(
        { protocol: 'https', hostname: 'guide.michelin.com' },
        { protocol: 'https', hostname: 'cdn.prod.website-files.com' },
        { protocol: 'https', hostname: 'framerusercontent.com' },
        { protocol: 'https', hostname: '*.framerusercontent.com' },
        { protocol: 'https', hostname: '*.webflow.com' },
        { protocol: 'https', hostname: '*.supabase.co' },
        { protocol: 'https', hostname: '*.supabase.in' }
      )
      return patterns
    })(),
  },
};

export default nextConfig;
