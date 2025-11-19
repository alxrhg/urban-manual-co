'use client';

import { useState, useEffect, useMemo } from 'react';

type SplashScreenProps = {
  disabled?: boolean;
};

const getPrefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SplashScreen({ disabled = false }: SplashScreenProps) {
  const prefersReducedMotion = useMemo(getPrefersReducedMotion, []);
  const [isVisible, setIsVisible] = useState(() => !disabled && !getPrefersReducedMotion());
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (disabled || prefersReducedMotion) {
      setIsVisible(false);
      return;
    }

    let postLoadHideTimer: ReturnType<typeof setTimeout> | undefined;

    // Start fade after 800ms, fully hide after 1000ms
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 800);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    // Also hide when page is fully loaded (faster)
    const handleLoad = () => {
      window.removeEventListener('load', handleLoad);
      setIsFading(true);

      clearTimeout(hideTimer);
      clearTimeout(fadeTimer);
      postLoadHideTimer = setTimeout(() => setIsVisible(false), 200);
    };

    if (document.readyState === 'complete') {
      setTimeout(handleLoad, 600);
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      if (postLoadHideTimer) clearTimeout(postLoadHideTimer);
      window.removeEventListener('load', handleLoad);
    };
  }, [disabled, prefersReducedMotion]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white dark:bg-gray-900 z-[9999] transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity' }}
    >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <span className="font-medium text-2xl text-black dark:text-white">
                Urban Manual®
              </span>
            </div>
          </div>
    </div>
  );
}

