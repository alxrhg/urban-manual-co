'use client';

import { useEffect, ReactNode, useRef, useState, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';
import { useSplitPane } from '@/contexts/SplitPaneContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mobileVariant?: 'bottom' | 'side';
  desktopWidth?: string;
  zIndex?: number;
  showBackdrop?: boolean;
  backdropOpacity?: string;
  position?: 'right' | 'left';
  style?: 'glassy' | 'solid';
  mobileWidth?: string;
  desktopSpacing?: string;
  mobileHeight?: string;
  mobileMaxHeight?: string;
  mobileBorderRadius?: string;
  mobileExpanded?: boolean;
  keepStateOnClose?: boolean;
  fullScreen?: boolean;
}

const DEFAULT_DESKTOP_WIDTH = 420;

function getNumericWidth(width?: string) {
  if (!width) return DEFAULT_DESKTOP_WIDTH;
  const numeric = parseInt(width.replace('px', ''), 10);
  return Number.isFinite(numeric) ? numeric : DEFAULT_DESKTOP_WIDTH;
}

/**
 * Universal Drawer Component - Redesigned
 * 
 * Improvements:
 * - Better body scroll locking (no layout shift)
 * - Smooth animations with proper timing
 * - Better mobile gestures
 * - Focus management for accessibility
 * - Performance optimizations
 * - Consistent behavior across all breakpoints
 * - Fixed: Separate refs for each drawer variant to prevent conflicts
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  mobileVariant = 'bottom',
  desktopWidth = '420px',
  zIndex = 50,
  showBackdrop = true,
  backdropOpacity = '15',
  position = 'right',
  style = 'solid',
  mobileWidth = 'max-w-md',
  desktopSpacing = 'right-4 top-4 bottom-4',
  mobileHeight,
  mobileMaxHeight,
  mobileBorderRadius,
  mobileExpanded = false,
  keepStateOnClose = false,
  fullScreen = false,
}: DrawerProps) {
  // Separate refs for each drawer variant to prevent conflicts
  const mobileBottomRef = useRef<HTMLDivElement>(null);
  const mobileSideRef = useRef<HTMLDivElement>(null);
  const tabletRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paneId = useId();
  const { panelNode, openPane, closePane, activePaneId } = useSplitPane();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const numericDesktopWidth = getNumericWidth(desktopWidth);
  const shouldUseSplitPane = Boolean(panelNode) && isDesktop && !fullScreen;

  // Cleanup animation timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldUseSplitPane) {
      if (activePaneId === paneId) {
        closePane(paneId);
      }
      return;
    }

    if (isOpen) {
      openPane(paneId, numericDesktopWidth);
    } else if (activePaneId === paneId) {
      closePane(paneId);
    }

    return () => {
      if (activePaneId === paneId) {
        closePane(paneId);
      }
    };
  }, [shouldUseSplitPane, isOpen, openPane, closePane, paneId, numericDesktopWidth, activePaneId]);

  // Get the currently visible drawer element - memoized to prevent stale closures
  const getCurrentDrawer = useCallback((): HTMLDivElement | null => {
    if (typeof window === 'undefined') return null;

    if (shouldUseSplitPane && splitPaneRef.current) {
      return splitPaneRef.current;
    }

    if (mobileVariant === 'bottom' && mobileBottomRef.current) {
      return mobileBottomRef.current;
    }
    if (mobileVariant === 'side' && mobileSideRef.current) {
      return mobileSideRef.current;
    }
    const width = window.innerWidth;
    if (tabletRef.current && width >= 768 && width < 1024) {
      return tabletRef.current;
    }
    if (desktopRef.current && width >= 1024) {
      return desktopRef.current;
    }
    // Fallback: return first available
    return (
      mobileBottomRef.current ||
      mobileSideRef.current ||
      tabletRef.current ||
      desktopRef.current ||
      splitPaneRef.current
    );
  }, [mobileVariant, shouldUseSplitPane]);

  // Improved body scroll locking (prevents layout shift)
  useEffect(() => {
    if (!isOpen || shouldUseSplitPane) {
      return;
    }

    // Save current scroll position
    scrollPositionRef.current = window.scrollY;
    
    // Lock scroll without layout shift
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPositionRef.current}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    // Prevent iOS bounce
    document.body.style.touchAction = 'none';

    return () => {
      // Restore scroll position
      const scrollY = scrollPositionRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
  }, [isOpen, shouldUseSplitPane]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      // Save previous focus
      previousActiveElementRef.current = document.activeElement as HTMLElement;

      // Use a timeout to ensure drawer is rendered
      const timeoutId = setTimeout(() => {
        const drawer = getCurrentDrawer();
        if (drawer) {
          // Focus the drawer
          const focusableElement = drawer.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (focusableElement) {
            focusableElement.focus();
          } else {
            drawer.focus();
          }
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } else if (previousActiveElementRef.current) {
      // Restore focus when closing
      const timeoutId = setTimeout(() => {
        if (previousActiveElementRef.current) {
          previousActiveElementRef.current.focus();
          previousActiveElementRef.current = null;
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, getCurrentDrawer]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isAnimating) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isAnimating]);

  // Swipe gestures for mobile
  useEffect(() => {
    if (!isOpen || shouldUseSplitPane) return;

    // Get drawer element - use a small delay to ensure refs are set
    const getDrawer = () => getCurrentDrawer();

    let startX: number | null = null;
    let startY: number | null = null;
    let currentX: number | null = null;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return;

      const drawer = getDrawer();
      if (!drawer) return;

      currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      // Determine if this is a horizontal swipe
      if (!isDragging && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isDragging = true;
        e.preventDefault();
      }

      if (isDragging && mobileVariant === 'bottom') {
        // Bottom sheet: swipe down to close
        if (diffY > 0) {
          const translateY = Math.min(diffY, drawer.offsetHeight);
          drawer.style.transform = `translateY(${translateY}px)`;
        }
      } else if (isDragging && mobileVariant === 'side') {
        // Side drawer: swipe in direction to close
        const swipeDirection = position === 'right' ? diffX : -diffX;
        if (swipeDirection > 0) {
          const translateX = Math.min(swipeDirection, drawer.offsetWidth);
          drawer.style.transform = position === 'right'
            ? `translateX(${translateX}px)`
            : `translateX(-${translateX}px)`;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging || startX === null || currentX === null) {
        startX = null;
        startY = null;
        currentX = null;
        return;
      }

      const drawer = getDrawer();
      if (!drawer) {
        startX = null;
        startY = null;
        currentX = null;
        return;
      }

      const diffX = currentX - startX;
      const diffY = startY ? (e.changedTouches[0].clientY - startY) : 0;

      if (mobileVariant === 'bottom' && diffY > drawer.offsetHeight * 0.25) {
        // Swiped down more than 25% - close
        setIsAnimating(true);
        onClose();
        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 300);
      } else if (mobileVariant === 'side') {
        const swipeDirection = position === 'right' ? diffX : -diffX;
        if (swipeDirection > drawer.offsetWidth * 0.25) {
          // Swiped more than 25% - close
          setIsAnimating(true);
          onClose();
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 300);
        } else {
          // Snap back
          drawer.style.transform = '';
        }
      } else {
        // Snap back
        drawer.style.transform = '';
      }

      startX = null;
      startY = null;
      currentX = null;
      isDragging = false;
    };

    // Attach listeners after a small delay to ensure drawer is rendered
    const timeoutId = setTimeout(() => {
      const drawer = getDrawer();
      if (drawer) {
        drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
        drawer.addEventListener('touchmove', handleTouchMove, { passive: false });
        drawer.addEventListener('touchend', handleTouchEnd);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const drawer = getDrawer();
      if (drawer) {
        drawer.removeEventListener('touchstart', handleTouchStart);
        drawer.removeEventListener('touchmove', handleTouchMove);
        drawer.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isOpen, mobileVariant, position, onClose, getCurrentDrawer, shouldUseSplitPane]);

  // Determine background classes based on style
  const backgroundClasses = style === 'glassy' 
    ? `${DRAWER_STYLES.glassyBackground} ${position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight}`
    : 'bg-white dark:bg-gray-950';
  
  const borderClasses = style === 'glassy'
    ? (position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight)
    : (position === 'right' ? 'border-l border-gray-200 dark:border-gray-800' : 'border-r border-gray-200 dark:border-gray-800');

  const shadowClasses = style === 'solid' ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/5' : '';

  // Header background
  const headerBackground = style === 'glassy'
    ? DRAWER_STYLES.headerBackground
    : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm';

  const computedMobileHeight =
    mobileHeight ?? 'calc(96vh - env(safe-area-inset-bottom) - 1rem)';
  const computedMobileMaxHeight =
    mobileMaxHeight ?? 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 0.5rem)';
  const peekOffset = 'clamp(3.5rem, 32vh, 14rem)';
  const bottomSheetTransform = !isOpen
    ? 'translate3d(0, 120%, 0) scale(0.98)'
    : mobileExpanded
    ? 'translate3d(0, 0, 0) scale(1)'
    : `translate3d(0, ${peekOffset}, 0) scale(0.985)`;
  const radiusClass = mobileBorderRadius ?? 'rounded-[32px]';
  const shouldRenderBackdrop = showBackdrop && !shouldUseSplitPane;

  // Don't render if closed and not keeping state
  if (!isOpen && !keepStateOnClose) return null;

  // Common header component
  const renderHeader = () => {
    if (!title && !headerContent) return null;
    
    return (
      <div className={`flex-shrink-0 h-14 px-6 flex items-center justify-between ${headerBackground}`}>
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
            <div className="w-9" /> {/* Spacer for centering */}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {shouldRenderBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-300 ease-out ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            zIndex: zIndex - 10,
            backdropFilter: 'blur(0px)',
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer - Bottom Sheet */}
      {mobileVariant === 'bottom' && (
        <div
          ref={mobileBottomRef}
          className={`md:hidden fixed inset-x-[10px] bottom-[10px] transform transition-transform duration-300 ease-out will-change-transform flex flex-col ${backgroundClasses} ${DRAWER_STYLES.glassyBorderTop} w-[calc(100%-20px)] max-w-full overflow-hidden overscroll-contain ${radiusClass} ${
            !isOpen ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
          }`}
          style={{
            zIndex,
            maxHeight: computedMobileMaxHeight,
            height: mobileHeight ? mobileHeight : computedMobileHeight,
            transform: isOpen ? bottomSheetTransform : 'translate3d(0, 120%, 0) scale(0.98)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `drawer-title-${title}` : undefined}
          tabIndex={-1}
        >
          {/* Drag handle for bottom sheet */}
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          </div>

          {renderHeader()}

          {/* Content - Independent scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full overscroll-contain">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 ${DRAWER_STYLES.glassyBorderTop} ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer - Side Drawer */}
      {mobileVariant === 'side' && (
        <div
          ref={mobileSideRef}
          className={`md:hidden fixed ${position === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0 w-full ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-300 ease-out ${
            isOpen 
              ? 'translate-x-0 opacity-100' 
              : (position === 'right' ? 'translate-x-full opacity-0' : '-translate-x-full opacity-0')
          } overflow-hidden flex flex-col`}
          style={{ zIndex }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `drawer-title-${title}` : undefined}
          tabIndex={-1}
        >
          {renderHeader()}

          {/* Content - Independent scroll */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Desktop Drawer - Split Pane */}
      {shouldUseSplitPane && panelNode && createPortal(
        <div
          ref={splitPaneRef}
          className={`flex flex-col w-full h-full ${backgroundClasses} ${shadowClasses} ${borderClasses} rounded-[32px] overflow-hidden transition-all duration-300 ease-out`}
          role="dialog"
          aria-modal="false"
          aria-labelledby={title ? `drawer-title-${title}` : undefined}
          tabIndex={-1}
        >
          {renderHeader()}

          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {footerContent && (
            <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
              {footerContent}
            </div>
          )}
        </div>,
        panelNode
      )}

      {/* Desktop Drawer - Tablet (md) */}
      <div
        ref={tabletRef}
        className={`hidden md:flex lg:hidden fixed ${desktopSpacing} rounded-2xl ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-300 ease-out ${
          isOpen 
            ? 'translate-x-0 opacity-100' 
            : (position === 'right' ? 'translate-x-[calc(100%+2rem)] opacity-0' : '-translate-x-[calc(100%+2rem)] opacity-0')
        } overflow-hidden flex-col`}
        style={{ 
          zIndex, 
          width: '70%',
          maxWidth: 'calc(100vw - 2rem)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `drawer-title-${title}` : undefined}
        tabIndex={-1}
      >
        {renderHeader()}

        {/* Content - Independent scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
            {footerContent}
          </div>
        )}
      </div>

      {/* Desktop Drawer - Large screens (lg+) */}
      {!shouldUseSplitPane && (
        <div
          ref={desktopRef}
          className={`hidden lg:flex fixed ${
            fullScreen 
              ? 'inset-0 rounded-none' 
              : `${desktopSpacing} rounded-2xl`
          } ${backgroundClasses} ${shadowClasses} ${!fullScreen ? borderClasses : ''} z-50 transform transition-transform duration-300 ease-out ${
            isOpen 
              ? 'translate-x-0 opacity-100' 
              : fullScreen
              ? 'opacity-0'
              : (position === 'right' ? 'translate-x-[calc(100%+2rem)] opacity-0' : '-translate-x-[calc(100%+2rem)] opacity-0')
          } overflow-hidden flex-col`}
          style={{ 
            zIndex, 
            width: fullScreen ? '100%' : desktopWidth,
            maxWidth: fullScreen ? '100%' : 'calc(100vw - 2rem)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `drawer-title-${title}` : undefined}
          tabIndex={-1}
        >
          {renderHeader()}

          {/* Content - Independent scroll */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}
    </>
  );
}
