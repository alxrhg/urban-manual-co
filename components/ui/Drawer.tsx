'use client';

import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  mobileFullScreen?: boolean;
  desktopWidth?: string;
  zIndex?: number;
  showBackdrop?: boolean;
  backdropOpacity?: string;
}

/**
 * Universal Drawer Component
 * 
 * A reusable drawer component that handles:
 * - Mobile: Half-height bottom sheet (50vh)
 * - Desktop: Half-height bottom sheet (50vh)
 * - Backdrop with click-to-close
 * - Body scroll lock
 * - Escape key handling
 * - Smooth animations
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  headerContent,
  footerContent,
  mobileFullScreen = true,
  desktopWidth = '440px',
  zIndex = 50,
  showBackdrop = true,
  backdropOpacity = '50',
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

      {/* Mobile Drawer - Half height bottom sheet */}
      <div
        className={`md:hidden fixed inset-x-0 bottom-0 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } flex flex-col bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-800/20 w-full max-w-full overflow-hidden overscroll-contain rounded-t-3xl`}
        style={{ zIndex, maxHeight: '50vh', height: '50vh' }}
      >
        {/* Header */}
        {(title || headerContent) && (
          <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-transparent">
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
          <div className="flex-shrink-0 border-t border-white/20 dark:border-gray-800/20 bg-transparent">
            {footerContent}
          </div>
        )}
      </div>

      {/* Desktop Drawer - Half height bottom sheet */}
      <div
        className={`hidden md:flex fixed inset-x-0 bottom-0 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } flex-col bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-t border-white/20 dark:border-gray-800/20 w-full max-w-full overflow-hidden rounded-t-3xl`}
        style={{ zIndex, maxHeight: '50vh', height: '50vh' }}
      >
        {/* Header */}
        {(title || headerContent) && (
          <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between bg-transparent">
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
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footerContent && (
          <div className="flex-shrink-0 border-t border-white/20 dark:border-gray-800/20 bg-transparent">
            {footerContent}
          </div>
        )}
      </div>
    </>
  );
}

