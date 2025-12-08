'use client';

import { useEffect, useRef, useState, useCallback, memo, ReactNode } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { DrawerSize, DrawerPosition } from './types';

interface DrawerShellProps {
  isOpen: boolean;
  size: DrawerSize;
  position: DrawerPosition;
  onClose: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  title?: string;
  subtitle?: string;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Unique key to track scroll position (e.g., destination slug) */
  scrollKey?: string;
  /** Callback to save scroll position before navigation */
  onSaveScrollPosition?: (position: number) => void;
  /** Scroll position to restore */
  restoreScrollPosition?: number;
}

/**
 * DrawerShell - Universal drawer container
 *
 * A flexible drawer shell that handles:
 * - Responsive positioning (right on desktop, bottom on mobile)
 * - Gesture-based interactions
 * - Smooth animations
 * - Size variants
 * - Header/footer slots
 *
 * Design follows the homepage intelligence aesthetic with
 * subtle gradients, blur effects, and fluid interactions.
 */
const DrawerShell = memo(function DrawerShell({
  isOpen,
  size,
  position,
  onClose,
  onBack,
  canGoBack = false,
  title,
  subtitle,
  headerContent,
  footerContent,
  children,
  className = '',
  scrollKey,
  onSaveScrollPosition,
  restoreScrollPosition,
}: DrawerShellProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Save scroll position before back navigation
  const handleBack = useCallback(() => {
    if (contentRef.current && onSaveScrollPosition) {
      onSaveScrollPosition(contentRef.current.scrollTop);
    }
    onBack?.();
  }, [onBack, onSaveScrollPosition]);

  // Restore scroll position when it changes
  useEffect(() => {
    if (contentRef.current && restoreScrollPosition !== undefined && restoreScrollPosition > 0) {
      // Small delay to ensure content is rendered
      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({ top: restoreScrollPosition, behavior: 'instant' });
      });
    }
  }, [restoreScrollPosition, scrollKey]);

  // Reset scroll position when opening new content
  useEffect(() => {
    if (contentRef.current && scrollKey && !restoreScrollPosition) {
      contentRef.current.scrollTop = 0;
    }
  }, [scrollKey, restoreScrollPosition]);

  // Size configurations
  const sizeConfig = {
    small: { width: '360px', mobileHeight: '50vh' },
    medium: { width: '420px', mobileHeight: '85vh' },
    large: { width: '540px', mobileHeight: '92vh' },
    full: { width: '100%', mobileHeight: '100vh' },
  };

  const { width, mobileHeight } = sizeConfig[size];

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape - close drawer
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Backspace or Left Arrow - go back if possible
      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && canGoBack && handleBack) {
        // Only if not focused on an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          handleBack();
          return;
        }
      }

      // Cmd/Ctrl + S - save (if there's a save action - bubble up)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        // Dispatch custom event for components to handle
        window.dispatchEvent(new CustomEvent('drawer:save'));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isOpen, onClose, canGoBack, handleBack]);

  // Handle drag end for mobile bottom sheet
  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 100;
      const velocity = info.velocity.y;

      if (info.offset.y > threshold || velocity > 500) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle horizontal swipe gesture for right drawer
  const handleHorizontalDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const threshold = 80;
      const velocityX = info.velocity.x;

      // Swipe right to go back (if can go back)
      if ((info.offset.x > threshold || velocityX > 400) && canGoBack) {
        handleBack();
      }
      // Swipe right to close (if at root level)
      else if ((info.offset.x > threshold * 1.5 || velocityX > 600) && !canGoBack) {
        onClose();
      }
    },
    [onClose, handleBack, canGoBack]
  );

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const drawerVariants = {
    hidden: position === 'bottom'
      ? { y: '100%' }
      : { x: '100%' },
    visible: position === 'bottom'
      ? { y: 0 }
      : { x: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Drawer - Mobile Bottom Sheet or Right Panel */}
          <motion.div
            ref={drawerRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={drawerVariants}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag={position === 'bottom' ? 'y' : 'x'}
            dragConstraints={position === 'bottom' ? { top: 0, bottom: 0 } : { left: 0, right: 0 }}
            dragElastic={0.2}
            dragDirectionLock
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(e, info) => {
              setIsDragging(false);
              if (position === 'bottom') {
                handleDragEnd(e, info);
              } else {
                handleHorizontalDragEnd(e, info);
              }
            }}
            className={`
              fixed z-50 flex flex-col
              bg-white dark:bg-gray-900
              shadow-2xl
              ${position === 'bottom'
                ? 'inset-x-0 bottom-0 rounded-t-[24px] md:right-4 md:left-auto md:top-4 md:bottom-4 md:rounded-2xl'
                : 'right-0 top-0 bottom-0'
              }
              ${className}
            `}
            style={{
              width: position === 'bottom' ? '100%' : width,
              maxWidth: position === 'bottom' ? '100%' : `min(${width}, calc(100vw - 2rem))`,
              height: position === 'bottom' ? mobileHeight : '100%',
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Drag Handle (mobile only) */}
            {position === 'bottom' && (
              <div className="flex-shrink-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing md:hidden">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
            )}

            {/* Header */}
            <header className="flex-shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              {headerContent || (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {canGoBack && handleBack && (
                      <button
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        aria-label="Go back"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-500" />
                      </button>
                    )}
                    <div className="min-w-0">
                      {title && (
                        <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white truncate">
                          {title}
                        </h2>
                      )}
                      {subtitle && (
                        <p className="text-[13px] text-gray-500 truncate">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              )}
            </header>

            {/* Content */}
            <main ref={contentRef} className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </main>

            {/* Footer */}
            {footerContent && (
              <footer className="flex-shrink-0 px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {footerContent}
              </footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default DrawerShell;
