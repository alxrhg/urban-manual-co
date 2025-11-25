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
      <div className={clsx(
        'lg:grid lg:grid-cols-[minmax(0,1fr)_auto]',
        isPaneOpen ? 'lg:gap-8' : 'lg:gap-0'
      )}>
        <div className="min-w-0">{children}</div>
        <div className="hidden lg:block">
          <div
            ref={paneRef}
            className={clsx(
              'sticky top-28 flex flex-col transition-[width,opacity,transform] duration-300 ease-out',
              isPaneOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6 pointer-events-none'
            )}
            style={{
              width: isPaneOpen ? paneWidth : 0,
              maxWidth: paneWidth,
              minHeight: isPaneOpen ? '60vh' : 0,
              height: isPaneOpen ? 'calc(100vh - 7rem)' : 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}

