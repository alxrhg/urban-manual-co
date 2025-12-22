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
  /** Editorial variant - uses terracotta background with white text */
  variant?: 'default' | 'editorial';
}

/**
 * DrawerShell - Editorial-inspired drawer container
 *
 * Inspired by print magazines and conscious design aesthetics.
 * Features a clean, minimal layout with warm terracotta accents.
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
  variant = 'default',
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
    small: { width: '380px', mobileHeight: '50vh' },
    medium: { width: '440px', mobileHeight: '85vh' },
    large: { width: '520px', mobileHeight: '92vh' },
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

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && canGoBack && handleBack) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          handleBack();
          return;
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
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

      if ((info.offset.x > threshold || velocityX > 400) && canGoBack) {
        handleBack();
      } else if ((info.offset.x > threshold * 1.5 || velocityX > 600) && !canGoBack) {
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

  // Editorial styling - clean, minimal, magazine-like
  const isEditorial = variant === 'editorial';

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
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40"
          />

          {/* Drawer - Print collateral style with thick border, no radius */}
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
            dragElastic={0.1}
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
              fixed z-50 flex flex-col overflow-hidden
              bg-[var(--editorial-bg)]
              border-[2px] border-[var(--editorial-text-primary)]
              ${position === 'bottom'
                ? 'inset-x-0 bottom-0 md:right-5 md:left-auto md:top-5 md:bottom-5'
                : 'right-0 top-0 bottom-0 md:right-5 md:top-5 md:bottom-5'
              }
              ${className}
            `}
            style={{
              width: position === 'bottom' ? '100%' : width,
              maxWidth: position === 'bottom' ? '100%' : `min(${width}, calc(100vw - 2.5rem))`,
              height: position === 'bottom' ? mobileHeight : '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            }}
            role="dialog"
            aria-modal="true"
          >
            {/* Drag Handle (mobile only) - Sharp rectangle style */}
            {position === 'bottom' && (
              <div className="flex-shrink-0 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing md:hidden bg-[var(--editorial-bg)]">
                <div className="w-10 h-0.5 bg-[var(--editorial-text-tertiary)]" />
              </div>
            )}

            {/* Navigation Controls - Minimal, just icons */}
            <div className="absolute top-6 left-8 right-8 z-20 flex items-center justify-between pointer-events-none">
              {canGoBack && handleBack ? (
                <button
                  onClick={handleBack}
                  className="pointer-events-auto p-1 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                  aria-label="Go back"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={onClose}
                className="pointer-events-auto p-1 text-[var(--editorial-text-tertiary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <main
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              {children}
            </main>

            {/* Footer */}
            {footerContent && (
              <footer className="flex-shrink-0 px-8 py-5 border-t border-[var(--editorial-border)] bg-[var(--editorial-bg)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
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
