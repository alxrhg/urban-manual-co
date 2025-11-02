import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "The Urban Manual - Curated Guide to World's Best Hotels, Restaurants & Travel Destinations",
  description: "Discover handpicked luxury hotels, Michelin-starred restaurants, and hidden gems across 50+ cities worldwide. Your curated guide to exceptional travel experiences.",
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
        
        {/* Preconnect hints for faster resource loading */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        
        {/* DNS Prefetch for additional domains */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://guide.michelin.com" />
        
        {/* Critical inline CSS for above-the-fold content */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold */
            *,::before,::after{box-sizing:border-box}
            body{margin:0;font-family:system-ui,-apple-system,sans-serif}
            .dark{color-scheme:dark}
          `
        }} />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);
                if (shouldBeDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <Header />
          <main className="min-h-screen page-transition">
            {children}
          </main>
          <Footer />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
