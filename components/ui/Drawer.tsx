'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

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
  tier?: 'tier1' | 'tier2' | 'tier3';
  showHandle?: boolean;
  position?: 'right' | 'left';
  style?: 'glassy' | 'solid';
  mobileWidth?: string;
  desktopSpacing?: string;
  mobileHeight?: string;
  mobileMaxHeight?: string;
  mobileBorderRadius?: string;
  mobileExpanded?: boolean;
  keepStateOnClose?: boolean; // New: Keep state when drawer closes
  customBorderRadius?: { topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string };
  customShadow?: string;
  customBlur?: string;
  customMargin?: { top?: string; right?: string; bottom?: string; left?: string };
  customBackground?: string;
  customBorder?: { color?: string; thickness?: string };
  subtitle?: string; // For Tier 3 header subtitle
  noOverlay?: boolean; // For Tier 3 - no overlay but backdrop blur
}

/**
 * Universal Drawer Component
 * 
 * Philosophy: "Drawers behave like pulling out a phone from your pocket."
 * - Every quick action is handled in a drawer; every deep action goes to a full page.
 * - Drawers never float; they slide from the right and sit above content.
 * - Smooth horizontal slide animation (220ms ease-out).
 * - Page scroll locked but visible.
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
  backdropOpacity = '15', // 0.15 opacity = 15/100
  position = 'right',
  style = 'solid',
  mobileWidth = 'max-w-md',
  desktopSpacing = 'right-4 top-4 bottom-4',
  mobileHeight,
  mobileMaxHeight,
  mobileBorderRadius,
  mobileExpanded = false,
  keepStateOnClose = true,
  tier = 'tier1',
  showHandle = false,
  customBorderRadius,
  customShadow,
  customBlur,
  customMargin,
  customBackground,
  customBorder,
  subtitle,
  noOverlay = false,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);

  // Prevent body scroll when drawer is open (but keep page visible)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    try {
      if (isOpen) {
        // Lock scroll but keep page visible
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    } catch (error) {
      console.error('[Drawer] Error managing body scroll:', error);
    }
    
    return () => {
      try {
        if (typeof document !== 'undefined') {
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.width = '';
        }
      } catch (error) {
        console.error('[Drawer] Error cleaning up body scroll:', error);
      }
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Swipe right to dismiss (mobile)
  useEffect(() => {
    if (!isOpen || mobileVariant !== 'bottom') return;

    let cleanup: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    // Use a timeout to ensure the drawer is fully painted before accessing it
    timeoutId = setTimeout(() => {
      const drawer = drawerRef.current;
      if (!drawer) return;

      const handleTouchStart = (e: TouchEvent) => {
        try {
          if (e.touches && e.touches.length > 0) {
            startXRef.current = e.touches[0].clientX;
          }
        } catch (error) {
          console.error('[Drawer] Error in handleTouchStart:', error);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        try {
          if (startXRef.current === null || !drawer) return;
          if (!e.touches || e.touches.length === 0) return;
          
          const currentX = e.touches[0].clientX;
          const diffX = currentX - startXRef.current;
          const drawerWidth = drawer.offsetWidth || 0;

          // Only allow swipe right (positive diffX) and ensure drawer width is valid
          if (diffX > 0 && drawerWidth > 0) {
            const translateX = Math.min(diffX, drawerWidth);
            drawer.style.transform = `translateX(${translateX}px)`;
          }
        } catch (error) {
          console.error('[Drawer] Error in handleTouchMove:', error);
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        try {
          if (startXRef.current === null || !drawer) {
            startXRef.current = null;
            return;
          }
          
          if (!e.changedTouches || e.changedTouches.length === 0) {
            startXRef.current = null;
            return;
          }
          
          const currentX = e.changedTouches[0].clientX;
          const diffX = currentX - startXRef.current;
          const drawerWidth = drawer.offsetWidth || 0;

          // If swiped more than 30% of drawer width, close
          if (drawerWidth > 0 && diffX > drawerWidth * 0.3) {
            onClose();
          } else {
            // Snap back
            drawer.style.transform = '';
          }
          startXRef.current = null;
        } catch (error) {
          console.error('[Drawer] Error in handleTouchEnd:', error);
          startXRef.current = null;
        }
      };

      drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
      drawer.addEventListener('touchmove', handleTouchMove, { passive: true });
      drawer.addEventListener('touchend', handleTouchEnd, { passive: true });

      cleanup = () => {
        drawer.removeEventListener('touchstart', handleTouchStart);
        drawer.removeEventListener('touchmove', handleTouchMove);
        drawer.removeEventListener('touchend', handleTouchEnd);
      };
    }, 0); // Use setTimeout to ensure DOM is ready

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
      // Reset transform if drawer is still mounted
      const drawer = drawerRef.current;
      if (drawer) {
        try {
          drawer.style.transform = '';
        } catch (error) {
          console.error('[Drawer] Error resetting transform:', error);
        }
      }
      startXRef.current = null;
    };
  }, [isOpen, mobileVariant, onClose]);

  // Determine background classes based on style
  const backgroundClasses = style === 'glassy' 
    ? `${DRAWER_STYLES.glassyBackground} ${position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight}`
    : 'bg-white dark:bg-gray-950';
  
  const borderClasses = style === 'glassy'
    ? (position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight)
    : (position === 'right' ? 'border-l border-gray-200 dark:border-gray-800' : 'border-r border-gray-200 dark:border-gray-800');

  const shadowClasses = style === 'solid' ? 'shadow-2xl ring-1 ring-black/5' : '';

  // Header background: blurred/translucent
  const headerBackground = style === 'glassy'
    ? DRAWER_STYLES.headerBackground
    : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md';

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

  // Don't unmount if keepStateOnClose is true
  if (!isOpen && !keepStateOnClose) return null;

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && !noOverlay && (
        <div
          id="drawer-overlay"
          className={`fixed inset-0 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${(parseInt(backdropOpacity) || 15) / 100})`,
            backdropFilter: isOpen ? 'blur(18px)' : 'none',
            WebkitBackdropFilter: isOpen ? 'blur(18px)' : 'none',
            zIndex: Math.max(1, zIndex - 1), // Backdrop should be below drawer content, ensure positive
          }}
          onClick={onClose}
        />
      )}
      {/* Backdrop blur only (no overlay) for Tier 3 */}
      {showBackdrop && noOverlay && (
        <div
          className={`fixed inset-0 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backdropFilter: isOpen ? 'blur(12px)' : 'none',
            WebkitBackdropFilter: isOpen ? 'blur(12px)' : 'none',
            zIndex: Math.max(1, zIndex - 1),
            pointerEvents: 'none', // Don't block clicks
          }}
        />
      )}

      {/* Mobile Drawer - Bottom Sheet */}
      {mobileVariant === 'bottom' && (
        <div
          id={tier === 'tier1' ? 'drawer-tier-1' : tier === 'tier2' ? 'drawer-tier-2' : tier === 'tier3' ? 'drawer-tier-3' : undefined}
          ref={drawerRef}
          className={`md:hidden fixed inset-[10px] transform transition-transform duration-[220ms] ease-out will-change-transform flex flex-col ${backgroundClasses} ${DRAWER_STYLES.glassyBorderTop} w-[calc(100%-20px)] max-w-full overflow-hidden overscroll-contain ${radiusClass} ${
            mobileExpanded ? 'drawer-expanded' : 'drawer-collapsed'
          } ${!isOpen ? 'translate-y-full pointer-events-none' : ''}`}
          style={{
            zIndex,
            maxHeight: tier === 'tier1' ? '45%' : tier === 'tier2' ? '88%' : 'calc(100vh - 20px)',
            height: tier === 'tier1' ? 'auto' : (mobileHeight ? `calc(${mobileHeight} - 20px)` : 'calc(96vh - env(safe-area-inset-bottom) - 1rem - 20px)'),
            transform: isOpen ? bottomSheetTransform : 'translate3d(0, 120%, 0) scale(0.98)',
            borderRadius: customBorderRadius 
              ? `${customBorderRadius.topLeft || '0'} ${customBorderRadius.topRight || '0'} ${customBorderRadius.bottomRight || '0'} ${customBorderRadius.bottomLeft || '0'}`
              : (tier === 'tier1' || tier === 'tier2' ? '22px' : undefined),
            boxShadow: customShadow || (DRAWER_STYLES.shadow.enabled ? DRAWER_STYLES.shadow.value : undefined),
            backgroundColor: customBackground || (tier === 'tier1' ? DRAWER_STYLES.darkMode.tier1Bg : tier === 'tier2' ? DRAWER_STYLES.darkMode.tier2Bg : undefined),
            backdropFilter: customBlur ? `blur(${customBlur})` : undefined,
            WebkitBackdropFilter: customBlur ? `blur(${customBlur})` : undefined,
            border: customBorder ? `${customBorder.thickness || '1px'} solid ${customBorder.color || 'rgba(255,255,255,0.08)'}` : undefined,
          }}
        >
          {/* Handle */}
          {showHandle && (
            <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>
          )}
          {/* Header - 56px height, blurred */}
          {(title || headerContent) && (
            <div className={`flex-shrink-0 h-14 px-6 flex items-center justify-between ${headerBackground} border-b border-gray-200/50 dark:border-gray-800/50`}>
              {headerContent || (
                <>
                  <button
                    onClick={onClose}
                    className="p-2 flex items-center justify-center hover:opacity-70 transition-opacity touch-manipulation"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                  </button>
                  {title && (
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">
                      {title}
                    </h2>
                  )}
                  <div className="w-9" /> {/* Spacer for centering */}
                </>
              )}
            </div>
          )}

          {/* Content - Independent scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 ${DRAWER_STYLES.glassyBorderTop} ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer - Side Drawer */}
      {mobileVariant === 'side' && (
        <>
          {/* Backdrop for side drawer */}
          {showBackdrop !== false && (
            <div
              className={`fixed inset-0 transition-opacity duration-[220ms] ${
                isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              style={{
                backgroundColor: `rgba(0, 0, 0, ${(parseInt(backdropOpacity || '50') || 50) / 100})`,
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                zIndex: Math.max(1, zIndex - 1), // Backdrop should be below drawer content, ensure positive
              }}
              onClick={onClose}
            />
          )}
          <div
            ref={drawerRef}
            className={`md:hidden fixed ${position === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0 w-full ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
              isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-full' : '-translate-x-full')
            } ${!isOpen ? 'pointer-events-none' : ''} overflow-hidden flex flex-col`}
            style={{ zIndex }}
          >
          {/* Header - 56px height, blurred */}
          {(title || headerContent) && (
            <div className={`flex-shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between ${headerBackground}`}>
              {headerContent || (
                <>
                  <button
                    onClick={onClose}
                    className="p-2 flex items-center justify-center hover:opacity-70 transition-opacity"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                  </button>
                  {title && (
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">
                      {title}
                    </h2>
                  )}
                  <div className="w-9" />
                </>
              )}
            </div>
          )}

          {/* Content - Independent scroll */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{
              padding: tier === 'tier3' ? '28px' : undefined,
              maxWidth: tier === 'tier3' ? '360px' : undefined,
              margin: tier === 'tier3' ? '0 auto' : undefined,
            }}
          >
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div 
              className={`flex-shrink-0 border-t ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'}`}
              style={{
                borderTop: tier === 'tier3' ? '1px solid rgba(255,255,255,0.12)' : undefined,
                padding: tier === 'tier3' ? '20px' : undefined,
                boxShadow: tier === 'tier3' ? '0 -12px 32px rgba(0,0,0,0.35)' : undefined,
                position: tier === 'tier3' ? 'sticky' : undefined,
                bottom: tier === 'tier3' ? 0 : undefined,
                backgroundColor: tier === 'tier3' ? 'rgba(10,10,10,0.92)' : undefined,
              }}
            >
              {footerContent}
            </div>
          )}
        </div>
        </>
      )}

      {/* Desktop Drawer - Side Drawer with responsive widths */}
      <div
        id={tier === 'tier1' ? 'drawer-tier-1' : tier === 'tier2' ? 'drawer-tier-2' : tier === 'tier3' ? 'drawer-tier-3' : undefined}
        ref={drawerRef}
        className={`hidden md:flex lg:hidden fixed ${desktopSpacing} ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } ${!isOpen ? 'pointer-events-none' : ''} overflow-hidden flex-col`}
        style={{ 
          zIndex, 
          width: '70%', // Tablet: 70% width
          maxWidth: 'calc(100vw - 2rem)',
          borderRadius: customBorderRadius 
            ? `${customBorderRadius.topLeft || '0'} ${customBorderRadius.topRight || '0'} ${customBorderRadius.bottomRight || '0'} ${customBorderRadius.bottomLeft || '0'}`
            : '1rem',
          boxShadow: customShadow || undefined,
          backdropFilter: customBlur ? `blur(${customBlur})` : undefined,
          WebkitBackdropFilter: customBlur ? `blur(${customBlur})` : undefined,
          backgroundColor: customBackground || undefined,
          border: customBorder ? `${customBorder.thickness || '1px'} solid ${customBorder.color || 'rgba(255,255,255,0.08)'}` : undefined,
        }}
      >
        {/* Header - 56px height, blurred */}
        {(title || headerContent) && (
          <div className={`flex-shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between relative ${headerBackground}`}>
            {headerContent || (
              <>
                <button
                  onClick={onClose}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
                </button>
                {title && (
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">
                    {title}
                  </h2>
                )}
                <div className="w-8" />
              </>
            )}
          </div>
        )}

        {/* Content - Independent scroll */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'}`}>
            {footerContent}
          </div>
        )}
      </div>

      {/* Desktop Drawer - Fixed width for large screens */}
      <div
        id={tier === 'tier1' ? 'drawer-tier-1' : tier === 'tier2' ? 'drawer-tier-2' : tier === 'tier3' ? 'drawer-tier-3' : undefined}
        ref={drawerRef}
        className={`hidden lg:flex fixed ${customMargin ? '' : desktopSpacing} ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform ${
          tier === 'tier2' ? 'duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)]' : 'duration-[220ms] ease-out'
        } ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } ${!isOpen ? 'pointer-events-none' : ''} overflow-hidden flex-col`}
        style={{ 
          zIndex, 
          width: tier === 'tier2' ? '92vw' : tier === 'tier3' ? '420px' : desktopWidth, // Desktop: fixed width (420px) or 92vw for tier2, 420px for tier3
          maxWidth: tier === 'tier2' ? '480px' : tier === 'tier3' ? '420px' : 'calc(100vw - 2rem)',
          height: tier === 'tier2' || tier === 'tier3' ? '100vh' : undefined,
          top: customMargin?.top ? customMargin.top : (customMargin ? undefined : '1rem'),
          right: customMargin?.right ? customMargin.right : (customMargin ? undefined : (position === 'right' ? '1rem' : undefined)),
          bottom: customMargin?.bottom ? customMargin.bottom : (customMargin ? undefined : '1rem'),
          left: customMargin?.left ? customMargin.left : (customMargin ? undefined : (position === 'left' ? '1rem' : undefined)),
          borderRadius: customBorderRadius 
            ? `${customBorderRadius.topLeft || '0'} ${customBorderRadius.topRight || '0'} ${customBorderRadius.bottomRight || '0'} ${customBorderRadius.bottomLeft || '0'}`
            : '1rem',
          boxShadow: customShadow || undefined,
          backdropFilter: customBlur ? `blur(${customBlur})` : undefined,
          WebkitBackdropFilter: customBlur ? `blur(${customBlur})` : undefined,
          backgroundColor: customBackground || undefined,
          border: customBorder ? `${customBorder.thickness || '1px'} solid ${customBorder.color || 'rgba(255,255,255,0.08)'}` : undefined,
        }}
      >
        {/* Header - 56px height, blurred */}
        {(title || headerContent) && (
          <div className={`flex-shrink-0 h-14 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between relative ${headerBackground}`}>
            {headerContent || (
              <>
                <button
                  onClick={onClose}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
                </button>
                {title && (
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center">
                    {title}
                  </h2>
                )}
                <div className="w-8" />
              </>
            )}
          </div>
        )}

        {/* Content - Independent scroll */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md'}`}>
            {footerContent}
          </div>
        )}
      </div>

    </>
  );
}
