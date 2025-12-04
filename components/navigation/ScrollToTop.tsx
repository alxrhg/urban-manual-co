'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number; // Show button after scrolling this many pixels
  smooth?: boolean;
}

export function ScrollToTop({ threshold = 400, smooth = true }: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsVisible(scrollY > threshold);
    };

    // Check initial scroll position
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`
        fixed bottom-6 right-6 z-50
        w-10 h-10 rounded-full
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-700
        shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        ${isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
    >
      <ArrowUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />
    </button>
  );
}
