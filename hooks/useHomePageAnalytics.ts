'use client';

import { useEffect } from 'react';
import {
  initializeSession,
  trackPageView,
  trackDestinationClick,
  trackSearch,
  trackFilterChange,
} from '@/lib/tracking';

export function useHomePageAnalytics(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    initializeSession();
    trackPageView({ pageType: 'home' });
  }, [enabled]);

  return {
    trackDestinationClick,
    trackSearch,
    trackFilterChange,
  };
}
