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
      <div className="h-full flex flex-col">
        {/* Main content area - centered */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <h1 className="text-5xl md:text-6xl font-light text-gray-300 dark:text-gray-600 tracking-[0.2em] mb-4">
              URBAN MANUAL
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-light tracking-[0.3em] uppercase">
              Travel Curation
            </p>
          </div>
        </div>

        {/* Bottom right - brand placement */}
        <div className="absolute bottom-8 right-8">
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-light tracking-widest">
              URBAN<br />MANUAL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

