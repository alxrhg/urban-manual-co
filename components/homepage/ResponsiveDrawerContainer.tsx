'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useHomepageData } from './HomepageDataProvider';
import { InlineDestinationDrawer } from './InlineDestinationDrawer';
import { DestinationDrawer } from './DestinationDrawer';

/**
 * Responsive Drawer Container
 *
 * Handles responsive layout switching between:
 * - Desktop (≥1024px): Inline split pane layout
 * - Mobile/Tablet (<1024px): Overlay drawer
 *
 * This component wraps the main content and conditionally renders
 * either the split pane or overlay drawer based on screen size.
 */

interface ResponsiveDrawerContainerProps {
  children: ReactNode;
  /** Breakpoint for split pane mode (default: 1280px) */
  breakpoint?: number;
  /** Width of the detail pane in pixels (default: 420px) */
  detailWidth?: number;
}

export function ResponsiveDrawerContainer({
  children,
  breakpoint = 1280,
  detailWidth = 420,
}: ResponsiveDrawerContainerProps) {
  const { isDrawerOpen, selectedDestination } = useHomepageData();
  const [isSplitPaneMode, setIsSplitPaneMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check screen size and update mode
  useEffect(() => {
    setMounted(true);

    const checkScreenSize = () => {
      setIsSplitPaneMode(window.innerWidth >= breakpoint);
    };

    // Initial check
    checkScreenSize();

    // Listen for resize
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [breakpoint]);

  // Don't render anything until mounted (to avoid hydration mismatch)
  if (!mounted) {
    return <>{children}</>;
  }

  const showSplitPane = isSplitPaneMode && isDrawerOpen && selectedDestination;

  return (
    <>
      {/* Main Content Area */}
      <div
        className="transition-all duration-300 ease-out"
        style={{
          marginRight: showSplitPane ? `${detailWidth}px` : 0,
        }}
      >
        {children}
      </div>

      {/* Inline Detail Pane (desktop) */}
      {isSplitPaneMode && (
        <div
          className={`
            fixed top-0 right-0 h-full z-40
            bg-white dark:bg-[#1c1c1e]
            border-l border-gray-200 dark:border-white/10
            shadow-2xl
            transform transition-transform duration-300 ease-out
            ${showSplitPane ? 'translate-x-0' : 'translate-x-full'}
          `}
          style={{ width: `${detailWidth}px` }}
        >
          <InlineDestinationDrawer />
        </div>
      )}

      {/* Overlay Drawer (mobile/tablet) */}
      {!isSplitPaneMode && <DestinationDrawer />}
    </>
  );
}

export default ResponsiveDrawerContainer;
