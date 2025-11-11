import type { NextConfig } from "next";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY;

const publicEnv: Record<string, string> = {};
if (supabaseUrl) {
  publicEnv.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
}
if (supabaseAnonKey) {
  publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
}
if (supabasePublishableKey) {
  publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
}

const nextConfig: NextConfig = {
  /* config options here */
  // Enable compression
  compress: true,

  env: publicEnv,

  // Optimize CSS
  experimental: {
    optimizeCss: true,
  },

  // Optimize production builds (no source maps for smaller bundles)
  productionBrowserSourceMaps: false,

  // Note: Next.js 16 uses SWC (Speedy Web Compiler) by default for:
  // - TypeScript/JavaScript compilation (20x faster than Babel)
  // - Minification (faster than Terser)
  // - Code transformation and optimization
  // SWC is automatically enabled - no configuration needed!
  // 
  // Next.js 16 also uses Turbopack by default which handles chunk splitting automatically
  // Webpack config removed to avoid conflicts with Turbopack

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
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
