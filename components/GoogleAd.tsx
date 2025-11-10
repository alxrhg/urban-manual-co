'use client';

import { useEffect, useRef } from 'react';

interface GoogleAdProps {
  slot: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
}

/**
 * Minimal Google AdSense component matching homepage design
 * Uses subtle borders and minimal styling to blend with the design
 */
export function GoogleAd({
  slot,
  format = 'auto',
  style,
  className = '',
  responsive = true
}: GoogleAdProps) {
  const adRef = useRef<HTMLModElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization (React Strict Mode, re-renders)
    if (initializedRef.current) return;
    
    // Wait for DOM element to be ready
    if (!adRef.current) {
      // Retry after a short delay if element isn't ready yet
      const timer = setTimeout(() => {
        if (adRef.current && !initializedRef.current) {
          // Check if ad is already initialized by Google
          if (adRef.current.getAttribute('data-ad-status')) {
            initializedRef.current = true;
            return;
          }

          try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            initializedRef.current = true;
          } catch (err) {
            // Silently handle duplicate initialization errors
            if (err instanceof Error && err.message?.includes('already have ads')) {
              initializedRef.current = true;
            } else {
              console.error('AdSense error:', err);
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Check if ad is already initialized by Google
    if (adRef.current.getAttribute('data-ad-status')) {
      initializedRef.current = true;
      return;
    }

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initializedRef.current = true;
    } catch (err) {
      // Silently handle duplicate initialization errors
      if (err instanceof Error && err.message?.includes('already have ads')) {
        initializedRef.current = true;
      } else {
        console.error('AdSense error:', err);
      }
    }
  }, []);

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{
          display: 'block',
          ...style,
        }}
        data-ad-client="ca-pub-3052286230434362"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

/**
 * Display ad with minimal border to match homepage design
 */
export function DisplayAd({ slot, className = '' }: { slot: string; className?: string }) {
  return (
    <div className={`border border-gray-200 dark:border-dark-blue-600 rounded-2xl p-4 ${className}`}>
      <div className="text-xs text-gray-400 mb-2 text-center">Advertisement</div>
      <GoogleAd slot={slot} format="auto" responsive />
    </div>
  );
}

/**
 * Multiplex ad - Grid of native ads matching your card layout
 * Perfect for insertion between rows in destination grids
 * Automatically hides if no ad content is available
 */
export function MultiplexAd({ slot, className = '' }: { slot: string; className?: string }) {
  const adRef = useRef<HTMLModElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization (React Strict Mode, re-renders)
    if (initializedRef.current) return;
    
    // Wait for DOM element to be ready
    if (!adRef.current) {
      // Retry after a short delay if element isn't ready yet
      const timer = setTimeout(() => {
        if (adRef.current && !initializedRef.current) {
          // Check if ad is already initialized by Google
          if (adRef.current.getAttribute('data-ad-status')) {
            initializedRef.current = true;
            return;
          }

          try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            initializedRef.current = true;
          } catch (err) {
            // Silently handle duplicate initialization errors
            if (err instanceof Error && err.message?.includes('already have ads')) {
              initializedRef.current = true;
            } else {
              console.error('AdSense error:', err);
            }
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Check if ad is already initialized by Google
    if (adRef.current.getAttribute('data-ad-status')) {
      initializedRef.current = true;
      return;
    }

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      initializedRef.current = true;

      // Check if ad loaded after a delay
      const checkAdLoaded = setTimeout(() => {
        if (adRef.current && containerRef.current) {
          const adStatus = adRef.current.getAttribute('data-ad-status');
          const hasContent = adRef.current.innerHTML.trim().length > 0;

          // Hide container if ad didn't load or has no content
          if (adStatus === 'unfilled' || !hasContent) {
            containerRef.current.style.display = 'none';
          }
        }
      }, 1000);

      return () => clearTimeout(checkAdLoaded);
    } catch (err) {
      // Silently handle duplicate initialization errors
      if (err instanceof Error && err.message?.includes('already have ads')) {
        initializedRef.current = true;
      } else {
        console.error('AdSense error:', err);
        // Hide on error
        if (containerRef.current) {
          containerRef.current.style.display = 'none';
        }
      }
    }
  }, []);

  return (
    <div ref={containerRef} className={`col-span-full ${className}`}>
      <div className="w-full border border-gray-200 dark:border-dark-blue-600 rounded-2xl p-4 bg-gray-50/50 dark:bg-dark-blue-900/50">
        <div className="text-xs text-gray-400 mb-3 text-center">Sponsored</div>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3052286230434362"
          data-ad-slot={slot}
          data-ad-format="autorelaxed"
        />
      </div>
    </div>
  );
}

/**
 * @deprecated Use MultiplexAd instead for better grid integration
 * In-feed ad that matches the destination card style
 */
export function InFeedAd({ slot }: { slot: string }) {
  return (
    <div className="relative">
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-dark-blue-900 border border-gray-200 dark:border-dark-blue-600 mb-2">
        <GoogleAd slot={slot} format="fluid" style={{ height: '100%' }} responsive={false} />
      </div>
      <div className="text-xs text-gray-400">Sponsored</div>
    </div>
  );
}
