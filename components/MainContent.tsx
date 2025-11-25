'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSplitPaneState } from '@/lib/stores/drawer-store';

interface MainContentProps {
  children: ReactNode;
}

/**
 * MainContent - Wrapper component that adjusts layout based on split-pane drawer state
 *
 * On desktop (lg+): Adjusts margin to make room for split-pane drawer
 * On mobile/tablet: No margin adjustment (drawer uses overlay)
 *
 * This component should wrap the main page content to enable split-pane drawer behavior.
 */
export function MainContent({ children }: MainContentProps) {
  const { showSplitPanel, splitPaneWidth, position } = useSplitPaneState();
  const [isDesktop, setIsDesktop] = useState(false);

  // Check for desktop breakpoint (lg: 1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Only apply margin adjustment on desktop when split pane is active
  const shouldAdjust = showSplitPanel && isDesktop;

  return (
    <div
      className="min-h-screen transition-all duration-300 ease-out"
      style={{
        marginRight: shouldAdjust && position === 'right' ? splitPaneWidth : 0,
        marginLeft: shouldAdjust && position === 'left' ? splitPaneWidth : 0,
      }}
    >
      {children}
    </div>
  );
}

export default MainContent;
