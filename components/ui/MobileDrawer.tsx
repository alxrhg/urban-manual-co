'use client';

import { useEffect, ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';
import { DrawerProps } from './Drawer';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export function MobileDrawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  mobileVariant = 'bottom',
  zIndex = 50,
  position = 'right',
  style = 'solid',
  mobileWidth = 'max-w-md',
  mobileHeight,
  mobileMaxHeight,
  mobileBorderRadius,
  mobileExpanded = false,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);

  useEscapeKey(isOpen, onClose);

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

  // Header background: solid (no gradient)
  const headerBackground = style === 'glassy'
    ? DRAWER_STYLES.headerBackground
    : 'bg-white dark:bg-gray-950';

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

  return (
    <>
      {/* Mobile Drawer - Bottom Sheet */}
      {mobileVariant === 'bottom' && (
        <div
          ref={drawerRef}
          className={`md:hidden fixed inset-[10px] transform transition-transform duration-[220ms] ease-out will-change-transform flex flex-col ${backgroundClasses} ${DRAWER_STYLES.glassyBorderTop} w-[calc(100%-20px)] max-w-full overflow-hidden overscroll-contain ${radiusClass} ${
            mobileExpanded ? 'drawer-expanded' : 'drawer-collapsed'
          } ${!isOpen ? 'translate-y-full' : ''}`}
          style={{
            zIndex,
            maxHeight: 'calc(100vh - 20px)',
            height: mobileHeight ? `calc(${mobileHeight} - 20px)` : 'calc(96vh - env(safe-area-inset-bottom) - 1rem - 20px)',
            transform: isOpen ? bottomSheetTransform : 'translate3d(0, 120%, 0) scale(0.98)',
          }}
        >
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
            <div className={`flex-shrink-0 ${DRAWER_STYLES.glassyBorderTop} ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white dark:bg-gray-950'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer - Side Drawer */}
      {mobileVariant === 'side' && (
        <div
          ref={drawerRef}
          className={`md:hidden fixed ${position === 'right' ? 'right-0' : 'left-0'} top-0 bottom-0 w-full ${backgroundClasses} ${borderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
            isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-full' : '-translate-x-full')
          } overflow-hidden flex flex-col`}
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
            <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white dark:bg-gray-950'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}
    </>
  );
}
