'use client';

import { useState, useEffect } from 'react';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade after 800ms, fully hide after 1000ms
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 800);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    // Also hide when page is fully loaded (faster)
    const handleLoad = () => {
      setIsFading(true);
      setTimeout(() => setIsVisible(false), 200);
    };

    if (document.readyState === 'complete') {
      setTimeout(handleLoad, 600);
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 bg-white dark:bg-gray-900 z-[9999] transition-opacity duration-300 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ willChange: 'opacity' }}
    >
          <div className="h-full flex items-center justify-center">
            <div className="text-center flex flex-col items-center">
              <span className="text-2xl font-bold uppercase tracking-tight text-black dark:text-white">
                THE URBAN MANUAL
              </span>
              <span className="h-1 w-full max-w-[200px] bg-[#6BFFB8] mt-2" />
            </div>
          </div>
    </div>
  );
}

