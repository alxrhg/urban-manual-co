'use client';

import { useEffect } from 'react';

let drawerModulePromise: Promise<typeof import('@/src/features/detail/DestinationDrawer')> | null = null;

function loadDrawerModule() {
  if (!drawerModulePromise) {
    drawerModulePromise = import('@/src/features/detail/DestinationDrawer');
  }
  return drawerModulePromise;
}

interface PrefetchOptions {
  delay?: number;
}

/**
 * Prefetch the destination drawer bundle so it is ready when the user opens it.
 * Returns the underlying dynamic import promise so other callers can await it.
 */
export function prefetchDestinationDrawer() {
  return loadDrawerModule();
}

/**
 * React hook that schedules a destination drawer prefetch once the component mounts.
 * A small delay keeps the main thread free for initial page work while still
 * ensuring the drawer chunk is available before the user interacts with it.
 */
export function usePrefetchDestinationDrawer(options: PrefetchOptions = {}) {
  const { delay = 1000 } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = window.setTimeout(() => {
      loadDrawerModule().catch(error => {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[DestinationDrawer] Prefetch failed:', error);
        }
      });
    }, Math.max(0, delay));

    return () => {
      window.clearTimeout(timer);
    };
  }, [delay]);
}
