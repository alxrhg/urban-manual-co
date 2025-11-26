'use client';

import { useEffect, ReactNode, useRef, useState, useCallback } from 'react';
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

/**
 * Universal Drawer Component - Redesigned Mobile Behavior
 * 
 * Improvements:
 * - Fluid 1:1 touch tracking for bottom sheet
 * - Velocity-based dismissal
 * - Proper safe area handling
 * - Spring-like animations
 * - Better backdrop transitions
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
  // Refs
  const mobileBottomRef = useRef<HTMLDivElement>(null);
  const mobileSideRef = useRef<HTMLDivElement>(null);
  const tabletRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  
  // Gesture State
  const isDraggingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const lastYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Get the currently visible drawer element
  const getCurrentDrawer = useCallback((): HTMLDivElement | null => {
    if (typeof window === 'undefined') return null;

    if (mobileVariant === 'bottom' && window.innerWidth < 768) {
      return mobileBottomRef.current;
    }
    if (mobileVariant === 'side' && window.innerWidth < 768) {
      return mobileSideRef.current;
    }
    const width = window.innerWidth;
    if (width >= 768 && width < 1024) {
      return tabletRef.current;
    }
    if (width >= 1024) {
      return desktopRef.current;
    }
    return null;
  }, [mobileVariant]);

  // Body Scroll Locking
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.touchAction = 'none'; // Prevent body scroll on mobile
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.touchAction = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Focus Management
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      const timeoutId = setTimeout(() => {
        const drawer = getCurrentDrawer();
        if (drawer) {
          const focusableElement = drawer.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElement) focusableElement.focus();
          else drawer.focus();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (previousActiveElementRef.current) {
      const timeoutId = setTimeout(() => {
        if (previousActiveElementRef.current) {
          previousActiveElementRef.current.focus();
          previousActiveElementRef.current = null;
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, getCurrentDrawer]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Mobile Bottom Sheet Gestures
  useEffect(() => {
    if (!isOpen || mobileVariant !== 'bottom') return;

    const drawer = mobileBottomRef.current;
    const handle = drawer?.querySelector('.drawer-handle') as HTMLElement;
    
    if (!drawer || !handle) return;

    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      lastYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      setIsDragging(true);
      // Disable transition during drag for instant response
      drawer.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      
      const clientY = e.touches[0].clientY;
      const deltaY = clientY - startYRef.current;
      lastYRef.current = clientY;

      // Only allow dragging downwards or slightly upwards (resistance)
      if (deltaY > 0) {
        drawer.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        setDragOffset(deltaY);
      } else {
        // Resistance when pulling up
        const resistedY = deltaY * 0.2;
        drawer.style.transform = `translate3d(0, ${resistedY}px, 0)`;
        setDragOffset(resistedY);
      }
      
      // Prevent scrolling content while dragging handle
      if (e.target === handle || handle.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      // Re-enable transition for snap animation
      drawer.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

      const endTime = Date.now();
      const timeDiff = endTime - startTimeRef.current;
      const distY = lastYRef.current - startYRef.current;
      const velocity = distY / timeDiff;

      // Close if dragged down significantly or flicked down fast
      if (distY > 150 || (distY > 50 && velocity > 0.5)) {
        onClose();
        // Force transform to off-screen to ensure smooth exit animation start
        // The state change to isOpen=false will trigger the CSS transition to final closed state
      } else {
        // Snap back to open
        drawer.style.transform = '';
        setDragOffset(0);
      }
    };

    handle.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      handle.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, mobileVariant, onClose]);

  // Styling
  const backgroundClasses = style === 'glassy' 
    ? `${DRAWER_STYLES.glassyBackground} ${position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight}`
    : 'bg-white dark:bg-gray-950';
  
  const borderClasses = style === 'glassy'
    ? (position === 'right' ? DRAWER_STYLES.glassyBorderLeft : DRAWER_STYLES.glassyBorderRight)
    : (position === 'right' ? 'border-l border-gray-200 dark:border-gray-800' : 'border-r border-gray-200 dark:border-gray-800');

  const shadowClasses = style === 'solid' ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/5' : '';
  
  const headerBackground = style === 'glassy'
    ? DRAWER_STYLES.headerBackground
    : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm';

  // Mobile Height Calculation
  const computedMobileHeight = mobileHeight ?? 'calc(96vh - env(safe-area-inset-bottom) - 1rem)';
  const computedMobileMaxHeight = mobileMaxHeight ?? 'calc(100vh - env(safe-area-inset-top) - 0.5rem)';
  
  // Radius
  const radiusClass = mobileBorderRadius ?? 'rounded-t-[32px]'; // Only round top corners for bottom sheet

  if (!isOpen && !keepStateOnClose) return null;

  const renderHeader = () => {
    if (!title && !headerContent) return null;
    return (
      <div className={`flex-shrink-0 h-14 px-6 flex items-center justify-between ${headerBackground} border-b border-black/5 dark:border-white/5`}>
        {headerContent || (
          <>
            <div className="w-9" /> {/* Spacer */}
            {title && (
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex-1 text-center px-2">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="p-2 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={`fixed inset-0 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
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
      {mobileVariant === 'bottom' && (
        <div
          ref={mobileBottomRef}
          className={`md:hidden fixed inset-x-0 bottom-0 transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${backgroundClasses} w-full overflow-hidden ${radiusClass} ${
            !isOpen ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{
            zIndex,
            maxHeight: computedMobileMaxHeight,
            height: isOpen ? (isDragging ? undefined : computedMobileHeight) : computedMobileHeight, // Allow dynamic height during drag if needed
            // When dragging, transform is handled by JS. When not dragging, it's handled by CSS class + empty inline style.
            transform: !isOpen ? 'translate3d(0, 100%, 0)' : undefined, 
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Drag Handle Area - Larger touch target */}
          <div className="drawer-handle flex-shrink-0 w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-inherit z-10 relative">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 opacity-50" />
          </div>

          {renderHeader()}

          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full overscroll-contain relative">
            {children}
          </div>

          {footerContent && (
            <div className={`flex-shrink-0 border-t border-gray-100 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white dark:bg-gray-950'}`}>
              {footerContent}
            </div>
          )}
        </div>
      )}

      {/* Side Drawer (Mobile Side & Desktop) */}
      {(mobileVariant === 'side' || typeof window !== 'undefined' && window.innerWidth >= 768) && (
        <div
          ref={window.innerWidth >= 1024 ? desktopRef : (window.innerWidth >= 768 ? tabletRef : mobileSideRef)}
          className={`
            fixed 
            ${window.innerWidth >= 768 
              ? `${desktopSpacing} rounded-2xl` 
              : `top-0 bottom-0 w-full ${position === 'right' ? 'right-0' : 'left-0'}`
            }
            ${backgroundClasses} ${shadowClasses} ${window.innerWidth >= 768 ? borderClasses : ''}
            z-50 transform transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
            flex flex-col overflow-hidden
            ${isOpen 
              ? 'translate-x-0 opacity-100' 
              : (position === 'right' ? 'translate-x-[110%]' : '-translate-x-[110%]')
            }
            ${fullScreen && window.innerWidth >= 1024 ? 'inset-0 !rounded-none !w-full !max-w-none !translate-x-0' : ''}
            ${fullScreen && window.innerWidth >= 1024 && !isOpen ? '!opacity-0 pointer-events-none' : ''}
          `}
          style={{ 
            zIndex, 
            width: window.innerWidth >= 1024 && !fullScreen ? desktopWidth : (window.innerWidth >= 768 ? '70%' : '100%'),
            maxWidth: window.innerWidth >= 768 && !fullScreen ? 'calc(100vw - 2rem)' : '100%',
          }}
          role="dialog"
          aria-modal="true"
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
        </div>
      )}
    </>
  );
}
