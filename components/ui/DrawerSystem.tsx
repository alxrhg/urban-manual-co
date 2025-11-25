'use client';

import { useEffect, ReactNode, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';
import { useDrawerStore, useSplitPaneState, DrawerDisplayMode } from '@/lib/stores/drawer-store';

/**
 * DrawerSystem - Unified drawer component supporting both overlay and split-pane modes
 *
 * On mobile: Always uses overlay/bottom-sheet mode
 * On desktop: Uses split-pane mode by default, can be configured to overlay
 *
 * The component automatically detects screen size and switches between modes.
 */

interface DrawerSystemProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  /** Width for the drawer panel */
  width?: string;
  /** Force overlay mode even on desktop */
  forceOverlay?: boolean;
  /** Position of the drawer (split-pane mode) */
  position?: 'left' | 'right';
  /** Mobile variant for overlay mode */
  mobileVariant?: 'bottom' | 'side';
  /** Custom z-index */
  zIndex?: number;
  /** Visual style */
  style?: 'glassy' | 'solid';
  /** Show backdrop for overlay mode */
  showBackdrop?: boolean;
  backdropOpacity?: string;
  /** Full screen mode (overlay only) */
  fullScreen?: boolean;
}

export function DrawerSystem({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  width = '420px',
  forceOverlay = false,
  position = 'right',
  mobileVariant = 'bottom',
  zIndex = 50,
  style = 'glassy',
  showBackdrop = true,
  backdropOpacity = '15',
  fullScreen = false,
}: DrawerSystemProps) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Check for desktop breakpoint (lg: 1024px)
  useEffect(() => {
    setIsMounted(true);
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Determine if we should use split-pane mode
  const useSplitPane = isDesktop && !forceOverlay && !fullScreen;

  // Handle body scroll locking for overlay mode only
  useEffect(() => {
    if (!useSplitPane && isOpen) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else if (!useSplitPane) {
      const scrollY = scrollPositionRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen, useSplitPane]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Don't render anything on the server
  if (!isMounted) return null;

  // Get background styling
  const backgroundClasses = style === 'glassy'
    ? DRAWER_STYLES.glassyBackground
    : 'bg-white dark:bg-gray-950';

  const borderClasses = position === 'right'
    ? 'border-l border-gray-200/30 dark:border-gray-800/30'
    : 'border-r border-gray-200/30 dark:border-gray-800/30';

  // Header component
  const renderHeader = () => {
    if (!title && !headerContent) return null;

    return (
      <div className={`flex-shrink-0 h-14 px-6 flex items-center justify-between ${
        style === 'glassy' ? 'bg-transparent' : 'bg-white/95 dark:bg-gray-950/95'
      }`}>
        {headerContent || (
          <>
            <button
              onClick={onClose}
              className="p-2 flex items-center justify-center transition-opacity touch-manipulation rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5 text-gray-900 dark:text-white/90" />
            </button>
            {title && (
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center px-2">
                {title}
              </h2>
            )}
            <div className="w-9" />
          </>
        )}
      </div>
    );
  };

  // Footer component
  const renderFooter = () => {
    if (!footerContent) return null;

    return (
      <div className={`flex-shrink-0 border-t border-gray-200/20 dark:border-gray-800/20 ${
        style === 'glassy' ? 'bg-transparent' : 'bg-white/95 dark:bg-gray-950/95'
      }`}>
        {footerContent}
      </div>
    );
  };

  // Split-pane mode rendering
  if (useSplitPane) {
    const positionStyle = position === 'right'
      ? { right: 0 }
      : { left: 0 };

    const transformClass = isOpen
      ? 'translate-x-0 opacity-100'
      : position === 'right'
      ? 'translate-x-full opacity-0'
      : '-translate-x-full opacity-0';

    return (
      <div
        ref={drawerRef}
        className={`
          fixed top-0 bottom-0 z-40
          ${backgroundClasses}
          ${borderClasses}
          shadow-lg
          transition-all duration-300 ease-out
          ${transformClass}
          flex flex-col
          overflow-hidden
          lg:rounded-none
        `}
        style={{ ...positionStyle, width }}
        role="complementary"
        aria-label={title || 'Drawer panel'}
        tabIndex={-1}
      >
        {renderHeader()}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          {children}
        </div>
        {renderFooter()}
      </div>
    );
  }

  // Overlay mode rendering (mobile and forced overlay)
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-300 ease-out ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            zIndex: zIndex - 10,
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Bottom Sheet */}
      {!isDesktop && mobileVariant === 'bottom' && (
        <div
          ref={drawerRef}
          className={`
            md:hidden fixed inset-x-[10px] bottom-[10px]
            transform transition-transform duration-300 ease-out
            will-change-transform flex flex-col
            ${backgroundClasses}
            ${DRAWER_STYLES.glassyBorderTop}
            w-[calc(100%-20px)] max-w-full overflow-hidden
            overscroll-contain rounded-[32px]
            ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
          `}
          style={{
            zIndex,
            maxHeight: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 0.5rem)',
            height: 'calc(96vh - env(safe-area-inset-bottom) - 1rem)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `drawer-title-${title}` : undefined}
          tabIndex={-1}
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>
          {renderHeader()}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full overscroll-contain">
            {children}
          </div>
          {renderFooter()}
        </div>
      )}

      {/* Mobile Side Drawer */}
      {!isDesktop && mobileVariant === 'side' && (
        <div
          ref={drawerRef}
          className={`
            md:hidden fixed ${position === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0
            w-full ${backgroundClasses} ${borderClasses}
            shadow-2xl z-50 transform transition-transform duration-300 ease-out
            ${isOpen
              ? 'translate-x-0 opacity-100'
              : position === 'right'
              ? 'translate-x-full opacity-0'
              : '-translate-x-full opacity-0'
            }
            overflow-hidden flex flex-col
          `}
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          {renderHeader()}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {renderFooter()}
        </div>
      )}

      {/* Tablet Overlay (md-lg) */}
      {isDesktop && forceOverlay && !fullScreen && (
        <div
          ref={drawerRef}
          className={`
            fixed ${position === 'right' ? 'right-4' : 'left-4'} top-4 bottom-4
            rounded-2xl ${backgroundClasses} ${borderClasses}
            shadow-2xl z-50 transform transition-all duration-300 ease-out
            ${isOpen
              ? 'translate-x-0 opacity-100'
              : position === 'right'
              ? 'translate-x-[calc(100%+2rem)] opacity-0'
              : '-translate-x-[calc(100%+2rem)] opacity-0'
            }
            overflow-hidden flex flex-col
          `}
          style={{
            zIndex,
            width,
            maxWidth: 'calc(100vw - 2rem)',
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          {renderHeader()}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {renderFooter()}
        </div>
      )}

      {/* Full Screen Overlay */}
      {fullScreen && (
        <div
          ref={drawerRef}
          className={`
            fixed inset-0 ${backgroundClasses}
            z-50 transform transition-all duration-300 ease-out
            ${isOpen ? 'opacity-100' : 'opacity-0'}
            overflow-hidden flex flex-col
          `}
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          {renderHeader()}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {renderFooter()}
        </div>
      )}
    </>
  );
}

export default DrawerSystem;
