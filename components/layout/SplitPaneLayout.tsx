'use client';

import clsx from 'clsx';
import { ReactNode, useEffect, useRef } from 'react';
import { useSplitPane } from '@/contexts/SplitPaneContext';

interface SplitPaneLayoutProps {
  children: ReactNode;
}

/**
 * Hosts a right-hand column that drawers can portal into on desktop viewports.
 * On mobile, the second column collapses completely and drawers fall back to overlays.
 */
export function SplitPaneLayout({ children }: SplitPaneLayoutProps) {
  const paneRef = useRef<HTMLDivElement>(null);
  const { registerPaneHost, isPaneOpen, paneWidth } = useSplitPane();

  useEffect(() => {
    registerPaneHost(paneRef.current);
    return () => registerPaneHost(null);
  }, [registerPaneHost]);

  return (
    <div className="w-full">
      <div
        className={clsx(
          'lg:flex lg:items-start',
          isPaneOpen ? 'lg:gap-8' : 'lg:gap-0'
        )}
      >
        <div className="flex-1 min-w-0">{children}</div>
        <div className="hidden lg:block flex-none sticky top-0 h-screen">
          <div
            ref={paneRef}
            className={clsx(
              'h-full transition-[width,opacity,transform] duration-300 ease-out',
              isPaneOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'
            )}
            style={{
              width: isPaneOpen ? paneWidth : 0,
              maxWidth: paneWidth,
              height: '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}

