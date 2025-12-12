'use client';

import { useEffect, useRef, useState } from 'react';

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
 * Automatically hides if no ad content is available
 */
export function DisplayAd({ slot, className = '' }: { slot: string; className?: string }) {
  const adRef = useRef<HTMLModElement>(null);
  const initializedRef = useRef(false);
  const [shouldShow, setShouldShow] = useState(true);

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

      // Check if ad loaded - use multiple checks with increasing delays
      // Only hide after sufficient time has passed to allow ad to load
      const checkAdLoaded = (canHide: boolean = false) => {
        if (!adRef.current) return;

        const adStatus = adRef.current.getAttribute('data-ad-status');
        const hasContent = adRef.current.innerHTML.trim().length > 0;
        const hasIframes = adRef.current.querySelectorAll('iframe').length > 0;

        // Show if ad is filled or has content
        if (adStatus === 'filled' || hasContent || hasIframes) {
          setShouldShow(true);
        } else if (canHide && adStatus === 'unfilled') {
          // Only hide if explicitly unfilled AND we've waited long enough
          setShouldShow(false);
        }
      };

      // Check for positive signals immediately and at intervals
      // But only allow hiding after 5 seconds to give ads time to load
      checkAdLoaded(false);
      const timer1 = setTimeout(() => checkAdLoaded(false), 1000);
      const timer2 = setTimeout(() => checkAdLoaded(false), 2000);
      const timer3 = setTimeout(() => checkAdLoaded(false), 3000);
      const timer4 = setTimeout(() => checkAdLoaded(true), 5000); // Can hide after 5s

      // Also observe mutations to catch late-loading ads
      const observer = new MutationObserver(() => checkAdLoaded(false));
      if (adRef.current) {
        observer.observe(adRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-ad-status']
        });
      }

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        observer.disconnect();
      };
    } catch (err) {
      // Silently handle duplicate initialization errors
      if (err instanceof Error && err.message?.includes('already have ads')) {
        initializedRef.current = true;
      } else {
        console.error('AdSense error:', err);
        setShouldShow(false);
      }
    }
  }, []);

  // Don't render if ad didn't load
  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl p-4 ${className}`}>
      <div className="text-xs text-gray-400 mb-2 text-center">Advertisement</div>
      <div className="overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{
            display: 'block',
          }}
          data-ad-client="ca-pub-3052286230434362"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
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
  const initializedRef = useRef(false);
  const [shouldShow, setShouldShow] = useState(true);

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

      // Check if ad loaded - use multiple checks with increasing delays
      // Only hide after sufficient time has passed to allow ad to load
      const checkAdLoaded = (canHide: boolean = false) => {
        if (!adRef.current) return;

        const adStatus = adRef.current.getAttribute('data-ad-status');
        const hasContent = adRef.current.innerHTML.trim().length > 0;
        const hasIframes = adRef.current.querySelectorAll('iframe').length > 0;

        // Show if ad is filled or has content
        if (adStatus === 'filled' || hasContent || hasIframes) {
          setShouldShow(true);
        } else if (canHide && adStatus === 'unfilled') {
          // Only hide if explicitly unfilled AND we've waited long enough
          setShouldShow(false);
        }
      };

      // Check for positive signals immediately and at intervals
      // But only allow hiding after 5 seconds to give ads time to load
      checkAdLoaded(false);
      const timer1 = setTimeout(() => checkAdLoaded(false), 1000);
      const timer2 = setTimeout(() => checkAdLoaded(false), 2000);
      const timer3 = setTimeout(() => checkAdLoaded(false), 3000);
      const timer4 = setTimeout(() => checkAdLoaded(true), 5000); // Can hide after 5s

      // Also observe mutations to catch late-loading ads
      const observer = new MutationObserver(() => checkAdLoaded(false));
      if (adRef.current) {
        observer.observe(adRef.current, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-ad-status']
        });
      }

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        observer.disconnect();
      };
    } catch (err) {
      // Silently handle duplicate initialization errors
      if (err instanceof Error && err.message?.includes('already have ads')) {
        initializedRef.current = true;
      } else {
        console.error('AdSense error:', err);
        setShouldShow(false);
      }
    }
  }, []);

  // Don't render if ad didn't load
  if (!shouldShow) {
    return null;
  }

  return (
    <div className={`col-span-full ${className}`}>
      <div className="w-full max-w-4xl mx-auto border border-gray-200 dark:border-gray-800 rounded-2xl p-4 bg-gray-50/50 dark:bg-gray-900/50">
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
      <div className="aspect-square overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-2">
        <GoogleAd slot={slot} format="fluid" style={{ height: '100%' }} responsive={false} />
      </div>
      <div className="text-xs text-gray-400">Sponsored</div>
    </div>
  );
}
