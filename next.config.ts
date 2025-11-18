import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  "'unsafe-eval'",
  "https://maps.googleapis.com",
  "https://cdn.amcharts.com",
  "https://*.supabase.co",
  "https://*.supabase.in",
  "https://pagead2.googlesyndication.com",
  "https://vercel.live",
  "https://cdn.apple-mapkit.com",
  "https://www.googletagmanager.com",
  "https://fundingchoicesmessages.google.com",
  "https://ep2.adtrafficquality.google",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
];

const styleSrc = [
  "'self'",
  "'unsafe-inline'",
  "https://fonts.googleapis.com",
];

const imgSrc = [
  "'self'",
  "data:",
  "blob:",
  "https://*",
];

const fontSrc = [
  "'self'",
  "data:",
  "https://fonts.gstatic.com",
];

const connectSrc = [
  "'self'",
  "https://*.supabase.co",
  "https://*.supabase.in",
  "https://maps.googleapis.com",
  "https://api.openai.com",
  "https://*.upstash.io",
  "https://*.googleapis.com",
  "https://api.mapbox.com",
  "https://events.mapbox.com",
  "https://cdn.jsdelivr.net",
  "https://cdn.apple-mapkit.com",
  "https://api.apple-mapkit.com",
  "https://googleads.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://ep1.adtrafficquality.google",
  "https://ep2.adtrafficquality.google",
  "https://fundingchoicesmessages.google.com",
  "https://www.google.com/recaptcha/",
  "https://*.sentry.io",
  "https://*.ingest.sentry.io",
];

const frameSrc = [
  "https://googleads.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://fundingchoicesmessages.google.com",
  "https://ep2.adtrafficquality.google",
  "https://www.google.com/recaptcha/",
];

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc.join(' ')}`,
  `style-src ${styleSrc.join(' ')}`,
  `img-src ${imgSrc.join(' ')}`,
  `font-src ${fontSrc.join(' ')}`,
  `connect-src ${connectSrc.join(' ')}`,
  "worker-src 'self' blob:",
  "child-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  `frame-src ${frameSrc.join(' ')}`,
  'upgrade-insecure-requests',
]

const securityHeaders: { key: string; value: string }[] = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'Access-Control-Allow-Origin',
    value: process.env.NODE_ENV === 'production' ? 'https://www.urbanmanual.co' : '*',
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization, X-Requested-With, Accept',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'unsafe-none', // Changed from require-corp to allow external resources
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin', // Changed from same-origin to allow external images (e.g., Michelin)
  },
  {
    key: 'Origin-Agent-Cluster',
    value: '?1',
  },
]

const nextConfig: NextConfig = {
  /* config options here */
  // Enable compression
  compress: true,

  env: {
    NEXT_PUBLIC_MAPKIT_AVAILABLE:
      process.env.MAPKIT_TEAM_ID && process.env.MAPKIT_KEY_ID && process.env.MAPKIT_PRIVATE_KEY ? 'true' : '',
  },

  // Optimize CSS
  experimental: {
    optimizeCss: true,
  },

  // Optimize production builds (no source maps for smaller bundles)
  productionBrowserSourceMaps: false,

  // Enable React compiler optimizations
  reactStrictMode: true,

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
        headers: securityHeaders,
      },
      {
        // Cache static assets for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache destinations.json for 5 minutes with stale-while-revalidate
        source: '/destinations.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache for 7 days (604800 seconds)
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false, // Ensure image optimization is enabled
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
        // Supabase Storage (primary image hosting)
        { protocol: 'https', hostname: '*.supabase.co' },
        { protocol: 'https', hostname: '*.supabase.in' },
        // External photography + Google imagery
        { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        { protocol: 'https', hostname: 'maps.googleapis.com' },
        { protocol: 'https', hostname: 'maps.gstatic.com' },
        { protocol: 'https', hostname: 'images.unsplash.com' },
        { protocol: 'https', hostname: 'images.pexels.com' },
        { protocol: 'https', hostname: 'assets-global.website-files.com' },
        { protocol: 'https', hostname: 'images.ctfassets.net' }
      )
      return patterns
    })(),
  },
};

// Wrap Next.js config with Sentry
export default withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: '/monitoring',

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
