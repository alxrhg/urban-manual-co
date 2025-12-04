'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/components/shared/CookieConsent';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const { canUseAnalytics, canUseMarketing } = useCookieConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;

    // Update all consent signals based on user preferences
    window.gtag('consent', 'update', {
      // Behavioral analytics consent signals
      analytics_storage: canUseAnalytics ? 'granted' : 'denied',
      
      // Advertising consent signals
      ad_storage: canUseMarketing ? 'granted' : 'denied',
      ad_user_data: canUseMarketing ? 'granted' : 'denied',
      ad_personalization: canUseMarketing ? 'granted' : 'denied',
    });

    // Initialize or update Google Analytics config if analytics is enabled
    if (canUseAnalytics) {
      window.gtag('config', 'G-ZLGK6QXD88', {
        page_path: pathname,
      });
    }
  }, [canUseAnalytics, canUseMarketing, pathname]);

  return null;
}

