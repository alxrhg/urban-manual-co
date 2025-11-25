'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSplitPaneState, useDrawerStore } from '@/lib/stores/drawer-store';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

interface SplitPaneLayoutProps {
  children: ReactNode;
  drawerContent?: ReactNode;
}

/**
 * SplitPaneLayout - Main layout component that supports split-pane drawer mode
 *
 * On desktop (lg+): Renders content in a two-pane layout when drawer is open
 * On mobile/tablet: Drawer uses overlay mode (handled by DrawerOverlay)
 *
 * The layout adjusts the main content area to make room for the drawer panel
 * when in split-pane mode.
 */
export function SplitPaneLayout({ children, drawerContent }: SplitPaneLayoutProps) {
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

  // Only show split pane on desktop
  const shouldShowSplit = showSplitPanel && isDesktop;

  return (
    <div className="relative flex h-full w-full">
      {/* Left-positioned drawer panel */}
      {position === 'left' && shouldShowSplit && (
        <DrawerPanel position="left" width={splitPaneWidth}>
          {drawerContent}
        </DrawerPanel>
      )}

      {/* Main content area - adjusts based on split pane */}
      <div
        className="flex-1 min-w-0 transition-all duration-300 ease-out"
        style={{
          // Adjust margin/padding based on split pane state
          marginLeft: shouldShowSplit && position === 'left' ? splitPaneWidth : 0,
          marginRight: shouldShowSplit && position === 'right' ? splitPaneWidth : 0,
        }}
      >
        {children}
      </div>

      {/* Right-positioned drawer panel */}
      {position === 'right' && shouldShowSplit && (
        <DrawerPanel position="right" width={splitPaneWidth}>
          {drawerContent}
        </DrawerPanel>
      )}
    </div>
  );
}

interface DrawerPanelProps {
  children: ReactNode;
  position: 'left' | 'right';
  width: string;
}

/**
 * DrawerPanel - The actual drawer panel component for split-pane mode
 *
 * Features:
 * - Fixed position with smooth transitions
 * - Glassmorphism styling for consistency
 * - Proper z-index management
 * - Independent scrolling
 */
export function DrawerPanel({ children, position, width }: DrawerPanelProps) {
  const { closeDrawer } = useDrawerStore();
  const { showSplitPanel } = useSplitPaneState();

  const positionClasses = position === 'right'
    ? 'right-0 border-l'
    : 'left-0 border-r';

  const transformClasses = showSplitPanel
    ? 'translate-x-0 opacity-100'
    : position === 'right'
    ? 'translate-x-full opacity-0'
    : '-translate-x-full opacity-0';

  return (
    <div
      className={`
        fixed top-0 bottom-0 z-40
        ${positionClasses}
        ${DRAWER_STYLES.glassyBackground}
        border-gray-200/30 dark:border-gray-800/30
        shadow-lg
        transition-all duration-300 ease-out
        ${transformClasses}
        flex flex-col
        overflow-hidden
      `}
      style={{ width }}
      role="complementary"
      aria-label="Drawer panel"
    >
      {/* Panel content with independent scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </div>
    </div>
  );
}

/**
 * SplitPaneContent - Wrapper for main page content in split-pane layouts
 *
 * Use this to wrap your main content when using split-pane drawers.
 * It handles the margin/padding adjustments automatically.
 */
export function SplitPaneContent({ children }: { children: ReactNode }) {
  const { showSplitPanel, splitPaneWidth, position } = useSplitPaneState();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const shouldShowSplit = showSplitPanel && isDesktop;

  return (
    <div
      className="transition-all duration-300 ease-out"
      style={{
        marginRight: shouldShowSplit && position === 'right' ? splitPaneWidth : 0,
        marginLeft: shouldShowSplit && position === 'left' ? splitPaneWidth : 0,
      }}
    >
      {children}
    </div>
  );
}

export default SplitPaneLayout;
