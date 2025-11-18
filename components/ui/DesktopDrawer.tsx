'use client';

import { CSSProperties, useRef } from 'react';
import { X } from 'lucide-react';
import { DRAWER_STYLES } from '@/lib/drawer-styles';
import { DrawerProps } from './Drawer';
import { useEscapeKey } from '@/hooks/useEscapeKey';

export function DesktopDrawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  desktopWidth = '420px',
  zIndex = 50,
  position = 'right',
  style = 'solid',
  desktopSpacing = 'right-4 top-4 bottom-4',
  customBorderRadius,
  customShadow,
  customBlur,
  customBackground,
  customBorder,
  customMargin,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEscapeKey(isOpen, onClose);

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

  const sharedInlineStyles: CSSProperties = {
    zIndex,
    ...(customBackground
      ? {
          background: customBackground,
          backdropFilter: customBlur ? `blur(${customBlur})` : undefined,
          WebkitBackdropFilter: customBlur ? `blur(${customBlur})` : undefined,
        }
      : {}),
    ...(customBorderRadius
      ? {
          borderTopLeftRadius: customBorderRadius.topLeft,
          borderTopRightRadius: customBorderRadius.topRight,
          borderBottomLeftRadius: customBorderRadius.bottomLeft,
          borderBottomRightRadius: customBorderRadius.bottomRight,
        }
      : {}),
    ...(customBorder
      ? {
          borderStyle: 'solid',
          borderColor: customBorder.color ?? 'rgba(255,255,255,0.12)',
          borderWidth: customBorder.thickness ?? '1px',
        }
      : {}),
    ...(customShadow ? { boxShadow: customShadow } : {}),
    ...(customMargin?.top ? { top: customMargin.top } : {}),
    ...(customMargin?.right ? { right: customMargin.right } : {}),
    ...(customMargin?.bottom ? { bottom: customMargin.bottom } : {}),
    ...(customMargin?.left ? { left: customMargin.left } : {}),
  };

  const appliedBackgroundClasses = customBackground ? '' : backgroundClasses;
  const appliedBorderClasses = customBorder ? '' : borderClasses;
  const appliedShadowClasses = customShadow ? '' : shadowClasses;

  return (
    <>
      {/* Desktop Drawer - Side Drawer with responsive widths */}
      <div
        ref={drawerRef}
        className={`hidden md:flex lg:hidden fixed ${desktopSpacing} rounded-2xl ${appliedBackgroundClasses} ${appliedShadowClasses} ${appliedBorderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } overflow-hidden flex-col`}
        style={{ 
          ...sharedInlineStyles,
          width: '70%', // Tablet: 70% width
          maxWidth: 'calc(100vw - 2rem)',
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
        ref={drawerRef}
        className={`hidden lg:flex fixed ${desktopSpacing} rounded-2xl ${appliedBackgroundClasses} ${appliedShadowClasses} ${appliedBorderClasses} z-50 transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : (position === 'right' ? 'translate-x-[calc(100%+2rem)]' : '-translate-x-[calc(100%+2rem)]')
        } overflow-hidden flex-col`}
        style={{ 
          ...sharedInlineStyles,
          width: desktopWidth, // Desktop: fixed width (420px)
          maxWidth: 'calc(100vw - 2rem)',
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
