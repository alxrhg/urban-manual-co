'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mobileVariant?: 'bottom' | 'side'; // Mobile drawer variant
  desktopWidth?: string;
  zIndex?: number;
  showBackdrop?: boolean;
  backdropOpacity?: string;
  position?: 'right' | 'left'; // For side drawer
  style?: 'glassy' | 'solid'; // Background style
  mobileWidth?: string; // For side drawer on mobile
  desktopSpacing?: string; // Spacing for desktop side drawer (e.g., 'right-4 top-4 bottom-4')
  mobileHeight?: string; // Height for the mobile bottom sheet
  mobileMaxHeight?: string; // Max height for the mobile bottom sheet
  mobileBorderRadius?: string; // Custom border radius for the mobile bottom sheet
  mobileExpanded?: boolean; // Whether the sheet should be fully expanded
}

/**
 * Universal Drawer Component
 * 
 * A reusable drawer component that handles:
 * - Mobile: Bottom sheet (default) or side drawer
 * - Desktop: Side drawer only (no bottom sheets on desktop)
 * - Backdrop with click-to-close
 * - Body scroll lock
 * - Escape key handling
 * - Smooth animations
 * - Spacing on all four sides for side drawers
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  mobileVariant = 'bottom',
  desktopWidth = '440px',
  zIndex = 50,
  showBackdrop = true,
  backdropOpacity = '50',
  position = 'right',
  style = 'solid',
  mobileWidth = 'max-w-md',
  desktopSpacing = 'right-4 top-4 bottom-4',
  mobileHeight,
  mobileMaxHeight,
  mobileBorderRadius,
  mobileExpanded = false,
}: DrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
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

  if (!isOpen) return null;

  // Determine background classes based on style
  const backgroundClasses = style === 'glassy' 
    ? `${DRAWER_STYLES.glassyBackground} ${position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight}`
    : 'bg-white dark:bg-gray-950';
  
  const borderClasses = style === 'glassy'
    ? (position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight)
    : (position === 'right' ? 'border-l border-gray-200 dark:border-gray-800' : 'border-r border-gray-200 dark:border-gray-800');

  const shadowClasses = style === 'solid' ? 'shadow-2xl ring-1 ring-black/5' : '';

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
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
            zIndex: zIndex - 10,
          }}
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer - Bottom Sheet */}
      {mobileVariant === 'bottom' && (
        <div
          className={`md:hidden fixed inset-x-4 bottom-4 transform transition-transform duration-500 ease-[cubic-bezier(0.18,0.89,0.32,1.28)] will-change-transform flex flex-col ${backgroundClasses} ${DRAWER_STYLES.glassyBorderTop} w-[calc(100%-2rem)] max-w-full overflow-hidden overscroll-contain ${radiusClass} ${
            mobileExpanded ? 'drawer-expanded' : 'drawer-collapsed'
          }`}
          style={{
            zIndex,
            maxHeight: computedMobileMaxHeight,
            height: computedMobileHeight,
            transform: bottomSheetTransform,
          }}
        >
          {/* Header */}
          {(title || headerContent) && (
            <div className={`flex-shrink-0 px-6 py-4 flex items-center justify-between ${DRAWER_STYLES.headerBackground}`}>
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
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white flex-1 text-center">
                      {title}
                    </h2>
                  )}
                  <div className="w-9" /> {/* Spacer for centering */}
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 ${DRAWER_STYLES.glassyBorderTop} ${DRAWER_STYLES.footerBackground}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Mobile Drawer - Side Drawer */}
      {mobileVariant === 'side' && (
        <div
          className={`md:hidden fixed ${position === 'right' ? 'right-4' : 'left-4'} top-4 bottom-4 rounded-2xl w-full ${mobileWidth} ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-full' : '-translate-x-full')
          } overflow-hidden flex flex-col`}
          style={{ zIndex }}
        >
          {/* Header */}
          {(title || headerContent) && (
            <div className={`flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between ${style === 'glassy' ? DRAWER_STYLES.headerBackground : 'bg-transparent'}`}>
              {headerContent || (
                <>
                  {title && (
                    <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{title}</h2>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 flex items-center justify-center hover:opacity-70 transition-opacity"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Footer */}
          {footerContent && (
            <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-transparent'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Desktop Drawer - Always Side Drawer with spacing */}
      <div
        className={`hidden md:flex fixed ${desktopSpacing} rounded-2xl ${backgroundClasses} ${shadowClasses} ${borderClasses} z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } overflow-hidden flex-col`}
        style={{ zIndex, width: desktopWidth, maxWidth: 'calc(100vw - 2rem)' }}
      >
        {/* Header */}
        {(title || headerContent) && (
          <div className={`flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between relative ${style === 'glassy' ? DRAWER_STYLES.headerBackground : 'bg-transparent'}`}>
            {headerContent || (
              <>
                {title && (
                  <h2 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{title}</h2>
                )}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-900 dark:text-gray-100" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-transparent'}`}>
            {footerContent}
          </div>
        )}
      </div>
    </>
  );
}
