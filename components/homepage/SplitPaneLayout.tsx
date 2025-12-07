'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useHomepageData } from './HomepageDataProvider';

/**
 * Split Pane Layout - Apple Design System
 *
 * Creates an inline split-pane layout where:
 * - Main content (left/full) shows the grid or map
 * - Detail pane (right) shows destination details inline
 * - Smooth transitions when drawer opens/closes
 * - Responsive: On mobile, falls back to overlay drawer
 *
 * Inspired by Apple Mail, Finder, and Notes apps.
 */

interface SplitPaneLayoutProps {
  children: ReactNode;
  detailPane?: ReactNode;
  /** Minimum screen width to show split pane (default: 1024px) */
  breakpoint?: number;
  /** Width of the detail pane (default: 420px) */
  detailWidth?: number;
}

export function SplitPaneLayout({
  children,
  detailPane,
  breakpoint = 1024,
  detailWidth = 420,
}: SplitPaneLayoutProps) {
  const { isDrawerOpen, selectedDestination } = useHomepageData();
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if we should use split pane based on screen width
  const shouldUseSplitPane = typeof window !== 'undefined' && window.innerWidth >= breakpoint;

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      // Force re-render on resize (handled by state in parent if needed)
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showDetailPane = isDrawerOpen && selectedDestination && shouldUseSplitPane;

  return (
    <div
      ref={containerRef}
      className="relative flex w-full transition-all duration-300 ease-out"
    >
      {/* Main Content Pane */}
      <div
        className="w-full min-w-0 transition-all duration-300 ease-out"
        style={{
          marginRight: showDetailPane ? `${detailWidth}px` : 0,
        }}
      >
        {children}
      </div>

      {/* Detail Pane - Fixed position on right */}
      <div
        className={`
          fixed top-0 right-0 h-full z-40
          bg-white dark:bg-[#1c1c1e]
          border-l border-gray-200 dark:border-white/10
          shadow-xl
          transform transition-transform duration-300 ease-out
          ${showDetailPane ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: `${detailWidth}px` }}
      >
        {detailPane}
      </div>
    </div>
  );
}

export default SplitPaneLayout;
