/**
 * Native Experience Provider
 *
 * Provides app-wide native-like experience features:
 * - Swipe-back navigation on mobile
 * - Haptic feedback context
 * - View transitions state
 * - Mobile-first optimizations
 */

'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SwipeBack } from '@/components/SwipeBack';
import { Haptics, isHapticsSupported } from '@/lib/haptics';
import { useViewTransition } from '@/hooks/useViewTransition';

interface NativeExperienceContextValue {
  /** Whether the app is running on a mobile device */
  isMobile: boolean;
  /** Whether haptic feedback is supported */
  isHapticsSupported: boolean;
  /** Whether View Transitions API is supported */
  isViewTransitionsSupported: boolean;
  /** Whether a view transition is in progress */
  isTransitioning: boolean;
  /** Trigger haptic feedback */
  haptic: typeof Haptics;
  /** Navigate with view transition */
  navigate: (href: string) => void;
  /** Start a view transition for DOM updates */
  startTransition: (callback: () => void | Promise<void>) => Promise<void>;
  /** Whether swipe-back is enabled */
  swipeBackEnabled: boolean;
  /** Toggle swipe-back navigation */
  setSwipeBackEnabled: (enabled: boolean) => void;
}

const NativeExperienceContext = createContext<NativeExperienceContextValue | null>(null);

interface NativeExperienceProviderProps {
  children: React.ReactNode;
  /** Enable swipe-back navigation (default: true on mobile) */
  enableSwipeBack?: boolean;
  /** Paths where swipe-back should be disabled */
  disableSwipeBackPaths?: string[];
}

/**
 * NativeExperienceProvider - Wraps the app with native-like features
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <NativeExperienceProvider>
 *   {children}
 * </NativeExperienceProvider>
 *
 * // In a component
 * const { haptic, navigate, isMobile } = useNativeExperience();
 *
 * const handleTap = () => {
 *   haptic.tap();
 *   navigate('/destination');
 * };
 * ```
 */
export function NativeExperienceProvider({
  children,
  enableSwipeBack = true,
  disableSwipeBackPaths = ['/map', '/chat', '/trip'],
}: NativeExperienceProviderProps) {
  const pathname = usePathname();
  const {
    isTransitioning,
    isSupported: isViewTransitionsSupported,
    navigate,
    startTransition,
  } = useViewTransition();

  const [isMobile, setIsMobile] = useState(false);
  const [swipeBackEnabled, setSwipeBackEnabled] = useState(enableSwipeBack);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 768 ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Disable swipe-back on certain paths
  const isSwipeBackDisabledPath = disableSwipeBackPaths.some((path) =>
    pathname.startsWith(path)
  );

  const shouldEnableSwipeBack =
    swipeBackEnabled && isMobile && !isSwipeBackDisabledPath;

  // Add haptic feedback on navigation
  const navigateWithHaptic = useCallback(
    (href: string) => {
      if (isMobile && isHapticsSupported()) {
        Haptics.tap();
      }
      navigate(href);
    },
    [isMobile, navigate]
  );

  const contextValue: NativeExperienceContextValue = {
    isMobile,
    isHapticsSupported: isHapticsSupported(),
    isViewTransitionsSupported,
    isTransitioning,
    haptic: Haptics,
    navigate: navigateWithHaptic,
    startTransition,
    swipeBackEnabled,
    setSwipeBackEnabled,
  };

  return (
    <NativeExperienceContext.Provider value={contextValue}>
      {shouldEnableSwipeBack ? (
        <SwipeBack enabled={shouldEnableSwipeBack}>{children}</SwipeBack>
      ) : (
        children
      )}
    </NativeExperienceContext.Provider>
  );
}

/**
 * Hook to access native experience features
 */
export function useNativeExperience(): NativeExperienceContextValue {
  const context = useContext(NativeExperienceContext);

  if (!context) {
    // Return sensible defaults if used outside provider
    return {
      isMobile: false,
      isHapticsSupported: false,
      isViewTransitionsSupported: false,
      isTransitioning: false,
      haptic: Haptics,
      navigate: () => {},
      startTransition: async () => {},
      swipeBackEnabled: false,
      setSwipeBackEnabled: () => {},
    };
  }

  return context;
}

export default NativeExperienceProvider;
