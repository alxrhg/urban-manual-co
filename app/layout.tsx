import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DrawerProvider } from "@/contexts/DrawerContext";
import { GlobalDrawers } from "@/components/GlobalDrawers";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminEditModeProvider } from "@/contexts/AdminEditModeContext";
import { ItineraryProvider } from "@/contexts/ItineraryContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { SplashScreen } from "@/components/SplashScreen";
import { TRPCProvider } from "@/lib/trpc/provider";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import GoogleAdSense from "@/components/GoogleAdSense";
import { ToastContainer } from "@/components/Toast";
import { ThemeProvider } from "@/components/theme-provider";
import { SkipNavigation } from "@/components/SkipNavigation";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
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
        alt: 'The Urban Manual',
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

import { getResourceHints } from "@/lib/resource-hints";

const resourceHints = getResourceHints();

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

        {/* Resource hints for faster resource loading */}
        {resourceHints.map((hint) => (
          <link key={hint.href} {...hint} />
        ))}

        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600&display=swap" rel="stylesheet" />

        {/* RSS Feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="The Urban Manual RSS Feed"
          href="https://www.urbanmanual.co/feed.xml"
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
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
        >
          <SkipNavigation />
          <SplashScreen />
          <TRPCProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <AdminEditModeProvider>
                  <ItineraryProvider>
                    <DrawerProvider>
                      <div className="flex flex-col min-h-screen">
                        <Header />
                        <main className="flex-grow pt-0">
                          {children}
                        </main>
                        <Footer />
                        <GlobalDrawers />
                      </div>
                      <ToastContainer />
                    </DrawerProvider>
                    <CookieConsent />
                  </ItineraryProvider>
                </AdminEditModeProvider>
              </Suspense>
            </AuthProvider>
          </TRPCProvider>
          <ToastContainer />
          <GoogleAnalytics />
          <GoogleAdSense />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
