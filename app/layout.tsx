import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminEditModeProvider } from "@/contexts/AdminEditModeContext";
import { ItineraryProvider } from "@/contexts/ItineraryContext";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { SplashScreen } from "@/components/SplashScreen";
import { TRPCProvider } from "@/lib/trpc/provider";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ToastContainer } from "@/components/Toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipNavigation } from "@/components/SkipNavigation";
import DrawerMount from "@/components/DrawerMount";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Pinch-to-zoom enabled for accessibility (WCAG 1.4.4)
  // Double-tap zoom and overscroll prevented via CSS (globals.css)
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.urbanmanual.co'),
  title: "The Urban Manual - Curated Guide to World's Best Hotels, Restaurants & Travel Destinations",
  description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. Your curated guide to exceptional travel experiences.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "The Urban Manual - Curated Travel Guide",
    description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide.",
    url: "https://urbanmanual.co",
    siteName: "The Urban Manual",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Urban Manual - Curated guide to world\'s best hotels, restaurants & travel destinations',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "The Urban Manual - Curated Travel Guide",
    description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide.",
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="google-adsense-account" content="ca-pub-3052286230434362" />
        {/* Revert iOS-specific app meta to default web behavior */}

        {/* Preconnect hints for faster resource loading */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Distinctive typography - Outfit for body, Instrument Serif & Playfair Display for headings */}
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        
        {/* DNS Prefetch for additional domains */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://guide.michelin.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://cdn.amcharts.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* RSS Feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="The Urban Manual RSS Feed"
          href="https://www.urbanmanual.co/feed.xml"
        />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3052286230434362"
          crossOrigin="anonymous"
        />
        
        {/* Google Analytics - Load script, but only initialize with consent */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              // Set default consent mode to denied - will be updated when user consents
              gtag('consent', 'default', {
                // Behavioral analytics consent signals
                analytics_storage: 'denied',
                // Advertising consent signals
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
              });
            `,
          }}
        />
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-ZLGK6QXD88"
        />
        
        {/* Critical inline CSS for above-the-fold content */}
        {/* Safe: Static CSS from codebase, no user input */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold */
            *,::before,::after{box-sizing:border-box}
            body{margin:0;font-family:'Inter',system-ui,-apple-system,sans-serif}
            .dark{color-scheme:dark}
          `
        }} />
        
        {/* Handle chunk loading errors gracefully */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                
                // Handle chunk loading errors
                window.addEventListener('error', function(e) {
                  if (e.target && e.target.tagName === 'SCRIPT' && e.target.src) {
                    const src = e.target.src;
                    // Check if it's a Next.js chunk
                    if (src.includes('/_next/static/chunks/')) {
                      console.warn('[Chunk Load Error] Failed to load chunk:', src);
                      // Next.js will automatically retry, but we can help by clearing cache
                      // Only do this if the error persists after retries
                      if (e.target.dataset.retryCount && parseInt(e.target.dataset.retryCount) > 2) {
                        console.warn('[Chunk Load Error] Multiple retries failed, consider clearing cache');
                      }
                    }
                  }
                }, true);
                
                // Handle unhandled promise rejections from chunk loading
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && typeof e.reason === 'object' && e.reason.message) {
                    const message = e.reason.message;
                    if (message.includes('Failed to load chunk') || message.includes('Loading chunk')) {
                      console.warn('[Chunk Load Error]', message);
                      // Next.js handles retries automatically
                      e.preventDefault(); // Prevent default error logging
                    }
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="urban-manual-theme"
        >
          <SkipNavigation />
          <SplashScreen />
          <TRPCProvider>
              <AuthProvider>
                <DrawerProvider>
                  <Suspense fallback={null}>
                    <AdminEditModeProvider>
                      <ItineraryProvider>
                        <Header />
                        <main id="main-content" className="min-h-screen page-transition" role="main">
                          {children}
                        </main>
                        <Footer />
                        <CookieConsent />
                        <DrawerMount />
                      </ItineraryProvider>
                    </AdminEditModeProvider>
                  </Suspense>
                </DrawerProvider>
              </AuthProvider>
          </TRPCProvider>
          <ToastContainer />
          <GoogleAnalytics />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
