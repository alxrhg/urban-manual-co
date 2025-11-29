'use client';

import * as React from 'react';
import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton } from '../IconButton';

/**
 * Drawer Composition System
 *
 * A flexible, composable drawer component with consistent styling.
 *
 * Usage:
 * <Drawer open={isOpen} onOpenChange={setIsOpen}>
 *   <Drawer.Header title="Settings" />
 *   <Drawer.Body>
 *     {content}
 *   </Drawer.Body>
 *   <Drawer.Footer>
 *     <Button>Save</Button>
 *   </Drawer.Footer>
 * </Drawer>
 */

// =============================================================================
// CONTEXT
// =============================================================================

interface DrawerContextValue {
  open: boolean;
  onClose: () => void;
  position: 'left' | 'right';
  variant: 'side' | 'bottom';
}

const DrawerContext = createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('Drawer components must be used within a Drawer');
  }
  return context;
}

// =============================================================================
// DRAWER ROOT
// =============================================================================

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Children - use Drawer.Header, Drawer.Body, Drawer.Footer */
  children: React.ReactNode;
  /** Position of the drawer */
  position?: 'left' | 'right';
  /** Variant - side panel or bottom sheet */
  variant?: 'side' | 'bottom';
  /** Width on desktop */
  width?: string;
  /** Z-index */
  zIndex?: number;
  /** Show backdrop overlay */
  showBackdrop?: boolean;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Lock body scroll when open */
  lockScroll?: boolean;
  /** Additional class for the drawer panel */
  className?: string;
}

function DrawerRoot({
  open,
  onOpenChange,
  children,
  position = 'right',
  variant = 'side',
  width = '420px',
  zIndex = 50,
  showBackdrop = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  lockScroll = true,
  className,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Gesture state for bottom sheet
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const startTimeRef = useRef(0);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Body scroll lock
  useEffect(() => {
    if (!lockScroll) return;

    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.touchAction = 'none';
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
  }, [open, lockScroll]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const timeoutId = setTimeout(() => {
        const focusable = drawerRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, handleClose]);

  // Bottom sheet gestures
  useEffect(() => {
    if (!open || variant !== 'bottom') return;

    const drawer = drawerRef.current;
    const handle = drawer?.querySelector('.drawer-handle') as HTMLElement;
    if (!drawer || !handle) return;

    const handleTouchStart = (e: TouchEvent) => {
      isDraggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      lastYRef.current = e.touches[0].clientY;
      startTimeRef.current = Date.now();
      setIsDragging(true);
      drawer.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;

      const clientY = e.touches[0].clientY;
      const deltaY = clientY - startYRef.current;
      lastYRef.current = clientY;

      if (deltaY > 0) {
        drawer.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        setDragOffset(deltaY);
      } else {
        const resistedY = deltaY * 0.2;
        drawer.style.transform = `translate3d(0, ${resistedY}px, 0)`;
        setDragOffset(resistedY);
      }

      if (e.target === handle || handle.contains(e.target as Node)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      drawer.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';

      const timeDiff = Date.now() - startTimeRef.current;
      const distY = lastYRef.current - startYRef.current;
      const velocity = distY / timeDiff;

      if (distY > 150 || (distY > 50 && velocity > 0.5)) {
        handleClose();
      } else {
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
  }, [open, variant, handleClose]);

  const contextValue: DrawerContextValue = {
    open,
    onClose: handleClose,
    position,
    variant,
  };

  // Determine if we should use bottom sheet on mobile
  const isMobileBottomSheet = variant === 'bottom';

  return (
    <DrawerContext.Provider value={contextValue}>
      {/* Backdrop */}
      {showBackdrop && (
        <div
          className={cn(
            'fixed inset-0 bg-black/20 dark:bg-black/40',
            'transition-opacity duration-300 ease-smooth',
            open ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          style={{ zIndex: zIndex - 1 }}
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed flex flex-col',
          'bg-white dark:bg-um-slate-950',
          'shadow-drawer',
          'transition-transform duration-500 ease-smooth',
          // Side drawer styles
          variant === 'side' && [
            'top-4 bottom-4',
            position === 'right' ? 'right-4' : 'left-4',
            'rounded-drawer',
            'border border-um-gray-200 dark:border-um-slate-800',
            open
              ? 'translate-x-0'
              : position === 'right'
              ? 'translate-x-[110%]'
              : '-translate-x-[110%]',
          ],
          // Bottom sheet styles (mobile)
          variant === 'bottom' && [
            'inset-x-0 bottom-0',
            'rounded-t-drawer-mobile',
            'shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]',
            open ? 'translate-y-0' : 'translate-y-full',
          ],
          className
        )}
        style={{
          zIndex,
          width: variant === 'side' ? width : '100%',
          maxWidth: variant === 'side' ? 'calc(100vw - 2rem)' : '100%',
          maxHeight: variant === 'bottom' ? '96vh' : undefined,
        }}
      >
        {/* Bottom sheet drag handle */}
        {variant === 'bottom' && (
          <div className="drawer-handle flex-shrink-0 w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none bg-inherit rounded-t-drawer-mobile">
            <div className="w-10 h-1.5 rounded-full bg-um-gray-300 dark:bg-um-slate-600 mt-2" />
          </div>
        )}

        {children}
      </div>
    </DrawerContext.Provider>
  );
}

// =============================================================================
// DRAWER HEADER
// =============================================================================

export interface DrawerHeaderProps {
  /** Title text */
  title?: string;
  /** Custom content (overrides title) */
  children?: React.ReactNode;
  /** Show close button */
  showClose?: boolean;
  /** Custom close handler (defaults to context onClose) */
  onClose?: () => void;
  /** Additional class */
  className?: string;
}

function DrawerHeader({
  title,
  children,
  showClose = true,
  onClose,
  className,
}: DrawerHeaderProps) {
  const { onClose: contextOnClose, variant } = useDrawerContext();
  const handleClose = onClose || contextOnClose;

  return (
    <div
      className={cn(
        'flex-shrink-0 min-h-14 px-6 flex items-center justify-between',
        'bg-white/95 dark:bg-um-slate-950/95 backdrop-blur-sm',
        'border-b border-um-gray-100 dark:border-um-slate-800',
        variant === 'bottom' && 'pt-0',
        className
      )}
    >
      {children || (
        <>
          {/* Spacer for centering */}
          <div className="w-9" />

          {/* Title */}
          {title && (
            <h2 className="text-[15px] font-semibold text-um-gray-900 dark:text-white flex-1 text-center px-2 truncate">
              {title}
            </h2>
          )}

          {/* Close button */}
          {showClose && (
            <IconButton
              variant="default"
              size="sm"
              rounded="full"
              onClick={handleClose}
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// DRAWER BODY
// =============================================================================

export interface DrawerBodyProps {
  /** Content */
  children: React.ReactNode;
  /** Enable scrolling */
  scroll?: boolean;
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional class */
  className?: string;
}

function DrawerBody({
  children,
  scroll = true,
  padding = 'md',
  className,
}: DrawerBodyProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={cn(
        'flex-1',
        scroll && 'overflow-y-auto overflow-x-hidden overscroll-contain',
        paddingClasses[padding],
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// DRAWER FOOTER
// =============================================================================

export interface DrawerFooterProps {
  /** Footer content (typically buttons) */
  children: React.ReactNode;
  /** Border on top */
  bordered?: boolean;
  /** Padding preset */
  padding?: 'sm' | 'md' | 'lg';
  /** Additional class */
  className?: string;
}

function DrawerFooter({
  children,
  bordered = true,
  padding = 'md',
  className,
}: DrawerFooterProps) {
  const paddingClasses = {
    sm: 'px-4 py-3',
    md: 'px-6 py-4',
    lg: 'px-8 py-5',
  };

  return (
    <div
      className={cn(
        'flex-shrink-0',
        'bg-white/95 dark:bg-um-slate-950/95 backdrop-blur-sm',
        bordered && 'border-t border-um-gray-100 dark:border-um-slate-800',
        paddingClasses[padding],
        'pb-[calc(1rem+env(safe-area-inset-bottom))]',
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// DRAWER SECTION
// =============================================================================

export interface DrawerSectionProps {
  /** Section title */
  title?: string;
  /** Section content */
  children: React.ReactNode;
  /** Additional class */
  className?: string;
}

function DrawerSection({ title, children, className }: DrawerSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-xs font-medium text-um-gray-500 dark:text-um-slate-500 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// =============================================================================
// DRAWER DIVIDER
// =============================================================================

function DrawerDivider({ className }: { className?: string }) {
  return (
    <hr
      className={cn(
        'border-t border-um-gray-100 dark:border-um-slate-800 my-4',
        className
      )}
    />
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const Drawer = Object.assign(DrawerRoot, {
  Header: DrawerHeader,
  Body: DrawerBody,
  Footer: DrawerFooter,
  Section: DrawerSection,
  Divider: DrawerDivider,
});

export {
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerSection,
  DrawerDivider,
};
