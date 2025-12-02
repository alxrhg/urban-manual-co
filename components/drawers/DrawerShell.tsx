'use client';

import { useRef, useEffect, useState, useCallback, ReactNode } from 'react';
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type DrawerConfig, type DrawerSize } from '@/lib/stores/drawer-store';
import { DRAWER_STYLES } from '@/lib/drawer-styles';

// ============================================================================
// Types
// ============================================================================

interface DrawerShellProps {
  drawer: DrawerConfig;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  zIndex?: number;
  isTopmost?: boolean;
}

// ============================================================================
// Size Configuration
// ============================================================================

function getSizeWidth(size: DrawerSize): string {
  switch (size) {
    case 'sm': return '320px';
    case 'md': return '420px';
    case 'lg': return '560px';
    case 'xl': return '720px';
    case 'full': return '100%';
    default: return '420px';
  }
}

// ============================================================================
// Animation Variants
// ============================================================================

const overlayVariants = {
  initial: (custom: { isMobile: boolean }) => ({
    x: custom.isMobile ? 0 : '100%',
    y: custom.isMobile ? '100%' : 0,
    opacity: 1,
  }),
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  },
  exit: (custom: { isMobile: boolean }) => ({
    x: custom.isMobile ? 0 : '100%',
    y: custom.isMobile ? '100%' : 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300,
      mass: 0.8,
    },
  }),
};

const fullscreenVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

// ============================================================================
// Drawer Shell Component
// ============================================================================

export function DrawerShell({
  drawer,
  title,
  children,
  onClose,
  onBack,
  zIndex = 50,
  isTopmost = true,
}: DrawerShellProps) {
  const { displayMode, size, width, showBackdrop, animationState } = drawer;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const controls = useAnimation();
  const y = useMotionValue(0);
  const dragProgress = useTransform(y, [0, 300], [0, 1]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Focus management
  useEffect(() => {
    if (isTopmost && containerRef.current) {
      const focusableElement = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElement) {
        focusableElement.focus();
      } else {
        containerRef.current.focus();
      }
    }
  }, [isTopmost]);

  // Handle drag end for mobile bottom sheet
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { velocity, offset } = info;

      // Close if dragged down significantly or flicked fast
      if (offset.y > 100 || (offset.y > 50 && velocity.y > 500)) {
        controls.start({
          y: '100%',
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        }).then(onClose);
      } else {
        // Snap back
        controls.start({
          y: 0,
          transition: { type: 'spring', damping: 30, stiffness: 300 },
        });
      }
    },
    [controls, onClose]
  );

  // Computed styles
  const computedWidth = width || getSizeWidth(size);

  // Mobile bottom sheet
  if (displayMode === 'overlay' && isMobile) {
    return (
      <motion.div
        ref={containerRef}
        className={cn(
          'fixed inset-x-0 bottom-0',
          'flex flex-col',
          'bg-white dark:bg-gray-950',
          'rounded-t-[28px]',
          'shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]',
          'focus:outline-none'
        )}
        style={{
          zIndex,
          maxHeight: '96vh',
          height: 'auto',
        }}
        custom={{ isMobile: true }}
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Drag Handle */}
        <div className="flex-shrink-0 w-full h-7 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none">
          <div className="w-10 h-1.5 rounded-full bg-gray-300/80 dark:bg-gray-600/80" />
        </div>

        {/* Header */}
        {(title || onBack) && (
          <MobileHeader
            title={title}
            onClose={onClose}
            onBack={onBack}
          />
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </motion.div>
    );
  }

  // Desktop side drawer or fullscreen
  if (displayMode === 'fullscreen') {
    return (
      <motion.div
        ref={containerRef}
        className={cn(
          'fixed inset-0',
          'flex flex-col',
          'bg-white dark:bg-gray-950',
          'focus:outline-none'
        )}
        style={{ zIndex }}
        variants={fullscreenVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <DesktopHeader
          title={title}
          onClose={onClose}
          onBack={onBack}
          isFullscreen
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </motion.div>
    );
  }

  // Desktop side drawer
  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'fixed top-4 bottom-4 right-4',
        'flex flex-col',
        'bg-white dark:bg-gray-950',
        'rounded-2xl',
        'border border-gray-200 dark:border-gray-800',
        'shadow-2xl ring-1 ring-black/5 dark:ring-white/5',
        'focus:outline-none'
      )}
      style={{
        zIndex,
        width: computedWidth,
        maxWidth: 'calc(100vw - 2rem)',
      }}
      custom={{ isMobile: false }}
      variants={overlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Header */}
      <DesktopHeader
        title={title}
        onClose={onClose}
        onBack={onBack}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Header Components
// ============================================================================

interface HeaderProps {
  title?: string;
  onClose: () => void;
  onBack?: () => void;
  isFullscreen?: boolean;
}

function MobileHeader({ title, onClose, onBack }: HeaderProps) {
  return (
    <div className="flex-shrink-0 min-h-[3.5rem] px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50">
      {/* Back button or spacer */}
      {onBack ? (
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors -ml-1"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      ) : (
        <div className="w-9" />
      )}

      {/* Title */}
      {title && (
        <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white flex-1 text-center px-2 truncate">
          {title}
        </h2>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
}

function DesktopHeader({ title, onClose, onBack, isFullscreen }: HeaderProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 min-h-[3.5rem] px-4 flex items-center justify-between',
        'border-b border-gray-200/80 dark:border-gray-800/80',
        'bg-gray-50/50 dark:bg-gray-900/50',
        isFullscreen ? '' : 'rounded-t-2xl'
      )}
    >
      {/* Left side: back button or spacer */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        )}

        {title && (
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
            {title}
          </h2>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
}

export default DrawerShell;
