'use client';

import { useEffect } from 'react';
import { trackWebVitals, observeResourceTiming } from '@/lib/analytics/performance';
import { trackPageView } from '@/lib/analytics/events';
import { usePathname } from 'next/navigation';

/**
 * WebVitalsTracker Component
 *
 * Tracks Core Web Vitals (LCP, FID, CLS, INP, FCP, TTFB) and sends them
 * to our analytics backend for monitoring and dashboard reporting.
 *
 * This component should be placed in the root layout to ensure
 * metrics are captured for all pages.
 */
export function WebVitalsTracker() {
  const pathname = usePathname();

  // Initialize web vitals tracking once on mount
  useEffect(() => {
    // Track Core Web Vitals
    trackWebVitals();

    // Optionally track slow resources (can be enabled for debugging)
    if (process.env.NODE_ENV === 'development') {
      observeResourceTiming();
    }
  }, []);

  // Track page views on route changes
  useEffect(() => {
    // Small delay to ensure the page has loaded
    const timeout = setTimeout(() => {
      trackPageView(pathname);
    }, 100);

    return () => clearTimeout(timeout);
  }, [pathname]);

  // This component doesn't render anything
  return null;
}

export default WebVitalsTracker;
