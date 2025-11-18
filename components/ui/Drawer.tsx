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
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);

  // Prevent body scroll when drawer is open (but keep page visible)
  useEffect(() => {
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
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
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

    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleTouchStart = (e: TouchEvent) => {
      startXRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startXRef.current === null) return;
      const currentX = e.touches[0].clientX;
      const diffX = currentX - startXRef.current;

      // Only allow swipe right (positive diffX)
      if (diffX > 0) {
        const translateX = Math.min(diffX, drawer.offsetWidth);
        drawer.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (startXRef.current === null) return;
      const currentX = e.changedTouches[0].clientX;
      const diffX = currentX - startXRef.current;

      // If swiped more than 30% of drawer width, close
      if (diffX > drawer.offsetWidth * 0.3) {
        onClose();
      } else {
        // Snap back
        drawer.style.transform = '';
      }
      startXRef.current = null;
    };

    drawer.addEventListener('touchstart', handleTouchStart);
    drawer.addEventListener('touchmove', handleTouchMove);
    drawer.addEventListener('touchend', handleTouchEnd);

    return () => {
      drawer.removeEventListener('touchstart', handleTouchStart);
      drawer.removeEventListener('touchmove', handleTouchMove);
      drawer.removeEventListener('touchend', handleTouchEnd);
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
      {showBackdrop && (
        <div
          id="drawer-overlay"
          className={`fixed inset-0 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            backdropFilter: isOpen ? 'blur(18px)' : 'none',
            WebkitBackdropFilter: isOpen ? 'blur(18px)' : 'none',
            zIndex: 999,
          }}
          onClick={onClose}
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
        className={`hidden lg:flex fixed ${customMargin ? '' : desktopSpacing} ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } ${!isOpen ? 'pointer-events-none' : ''} overflow-hidden flex-col`}
        style={{ 
          zIndex, 
          width: desktopWidth, // Desktop: fixed width (420px)
          maxWidth: 'calc(100vw - 2rem)',
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
