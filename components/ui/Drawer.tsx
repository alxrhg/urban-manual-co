'use client';

import { useEffect, ReactNode, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

// Spring configuration for natural physics-based animations
const springConfig = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
  mass: 0.8,
};

// Smoother spring for backdrop
const backdropSpring = {
  type: 'spring' as const,
  damping: 40,
  stiffness: 400,
};

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
 * Universal Drawer Component - Redesigned Mobile Behavior & Layout
 * 
 * Improvements:
 * - Fluid 1:1 touch tracking for bottom sheet
 * - Velocity-based dismissal
 * - Proper safe area handling (extends to bottom edge)
 * - Spring-like animations
 * - Better backdrop transitions
 * - Minimal drag handle
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
  backdropOpacity = '20',
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
  const desktopRef = useRef<HTMLDivElement>(null);
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
    if (window.innerWidth >= 768) {
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

  // Mobile Height Calculation - Ensure it reaches bottom
  const computedMobileHeight = mobileHeight ?? '96vh'; // Use vh for simplicity, safe area handled by padding
  const computedMobileMaxHeight = mobileMaxHeight ?? '100vh';
  
  // Radius
  const radiusClass = mobileBorderRadius ?? 'rounded-t-[28px]';

  if (!isOpen && !keepStateOnClose) return null;

  const renderHeader = () => {
    if (!title && !headerContent) return null;
    return (
      <div className={`flex-shrink-0 min-h-[3.5rem] px-6 flex items-center justify-between ${headerBackground} border-b border-black/5 dark:border-white/5 z-20`}>
        {headerContent || (
          <>
            <div className="w-9" /> {/* Spacer */}
            {title && (
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white flex-1 text-center px-2 truncate">
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop with framer-motion */}
      <AnimatePresence>
        {showBackdrop && isOpen && (
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropSpring}
            className="fixed inset-0"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${parseInt(backdropOpacity) / 100})`,
              zIndex: zIndex - 10,
            }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile Bottom Sheet with framer-motion */}
      <AnimatePresence>
        {mobileVariant === 'bottom' && isOpen && (
          <motion.div
            key="mobile-bottom-sheet"
            ref={mobileBottomRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={springConfig}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.5 }}
            onDragEnd={(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
              // Close if dragged down significantly or flicked down fast
              if (info.offset.y > 150 || (info.offset.y > 50 && info.velocity.y > 500)) {
                onClose();
              }
            }}
            className={`md:hidden fixed inset-x-0 bottom-0 flex flex-col ${backgroundClasses} w-full ${radiusClass} shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]`}
            style={{
              zIndex,
              maxHeight: computedMobileMaxHeight,
              height: computedMobileHeight,
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Drag Handle Area */}
            <div className="drawer-handle flex-shrink-0 w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-inherit z-10 absolute top-0 left-0 right-0 rounded-t-[28px]">
              <motion.div
                className="w-10 h-1.5 rounded-full bg-gray-300/80 dark:bg-gray-600/80 mt-2"
                whileHover={{ scaleX: 1.2 }}
                whileTap={{ scaleX: 1.4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            </div>

            {/* Header space filler if handle overlaps content */}
            <div className="h-3 flex-shrink-0" />

            {renderHeader()}

            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full overscroll-contain relative pb-[env(safe-area-inset-bottom)]">
              {children}
            </div>

            {footerContent && (
              <div className={`flex-shrink-0 border-t border-gray-100 dark:border-gray-800 pb-[calc(1rem+env(safe-area-inset-bottom))] ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white dark:bg-gray-950'}`}>
                {footerContent}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Drawer (Desktop/Tablet) with framer-motion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="side-drawer"
            ref={desktopRef}
            initial={{
              x: position === 'right' ? '110%' : '-110%',
              opacity: 0,
            }}
            animate={{
              x: fullScreen ? 0 : 0,
              opacity: 1,
            }}
            exit={{
              x: position === 'right' ? '110%' : '-110%',
              opacity: 0,
            }}
            transition={springConfig}
            className={`
              hidden md:flex fixed
              ${desktopSpacing} rounded-2xl
              ${backgroundClasses} ${shadowClasses} ${borderClasses}
              z-50 flex-col overflow-hidden
              ${fullScreen ? 'inset-0 !rounded-none !w-full !max-w-none' : ''}
            `}
            style={{
              zIndex,
              width: fullScreen ? '100%' : desktopWidth,
              maxWidth: fullScreen ? '100%' : 'calc(100vw - 2rem)',
            }}
            role="dialog"
            aria-modal="true"
          >
            {renderHeader()}

            <motion.div
              className="flex-1 overflow-y-auto overscroll-contain"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, ...springConfig }}
            >
              {children}
            </motion.div>

            {footerContent && (
              <motion.div
                className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, ...springConfig }}
              >
                {footerContent}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Side Drawer with framer-motion */}
      <AnimatePresence>
        {mobileVariant === 'side' && isOpen && (
          <motion.div
            key="mobile-side-drawer"
            ref={mobileSideRef}
            initial={{
              x: position === 'right' ? '100%' : '-100%',
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: position === 'right' ? '100%' : '-100%',
              opacity: 0,
            }}
            transition={springConfig}
            className={`
              md:hidden fixed top-0 bottom-0 w-full
              ${position === 'right' ? 'right-0' : 'left-0'}
              ${backgroundClasses} ${shadowClasses}
              z-50 flex flex-col overflow-hidden
            `}
            style={{
              zIndex,
              maxWidth: mobileWidth,
            }}
            role="dialog"
            aria-modal="true"
          >
            {renderHeader()}

            <motion.div
              className="flex-1 overflow-y-auto overscroll-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {children}
            </motion.div>

            {footerContent && (
              <div className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-800 ${style === 'glassy' ? DRAWER_STYLES.footerBackground : 'bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm'}`}>
                {footerContent}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
