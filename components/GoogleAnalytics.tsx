'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useCookieConsent } from '@/components/CookieConsent';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export function GoogleAnalytics() {
  const { canUseAnalytics } = useCookieConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;

    if (canUseAnalytics) {
      // Grant consent and initialize Google Analytics
      window.gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
      window.gtag('config', 'G-ZLGK6QXD88', {
        page_path: pathname,
      });
    } else {
      // Revoke consent
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }
  }, [canUseAnalytics, pathname]);

  return null;
}

