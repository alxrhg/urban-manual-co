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

  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
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
    <div className={`border border-gray-200 dark:border-gray-800 rounded-2xl p-4 ${className}`}>
      <div className="text-xs text-gray-400 mb-2 text-center">Advertisement</div>
      <GoogleAd slot={slot} format="auto" responsive />
    </div>
  );
}

/**
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
