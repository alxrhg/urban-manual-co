'use client';

import { forwardRef, ReactNode, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION, EASE } from '@/lib/animations';

// Omit drag-related props that conflict with Framer Motion
type OmittedDragProps = 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragEnter' | 'onDragLeave' | 'onDragExit';

interface AnimatedButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, OmittedDragProps> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  ripple?: boolean;
  className?: string;
}

/**
 * AnimatedButton - Button with micro-interactions
 *
 * Features:
 * - Scale on tap
 * - Hover glow effect
 * - Optional ripple effect
 * - Loading state animation
 * - Success state animation
 */
export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      loading = false,
      success = false,
      ripple = true,
      className = '',
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>(
      []
    );

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !shouldReduceMotion) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        setRipples((prev) => [...prev, { x, y, id }]);
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 600);
      }
      onClick?.(e);
    };

    const baseStyles =
      'relative overflow-hidden inline-flex items-center justify-center font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variantStyles = {
      default:
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800',
      primary:
        'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100',
      secondary:
        'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700',
      ghost:
        'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white',
      danger:
        'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
    };

    const sizeStyles = {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    if (shouldReduceMotion) {
      return (
        <button
          ref={ref}
          className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
          disabled={disabled || loading}
          onClick={handleClick}
          {...props}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              <span>Loading...</span>
            </span>
          ) : success ? (
            <span className="flex items-center gap-2">
              <CheckIcon />
              <span>Success!</span>
            </span>
          ) : (
            children
          )}
        </button>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled || loading}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING.snappy}
        {...props}
      >
        {/* Ripple effects */}
        <AnimatePresence>
          {ripples.map((ripple) => (
            <motion.span
              key={ripple.id}
              className="absolute rounded-full bg-current opacity-20 pointer-events-none"
              initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
              animate={{ width: 200, height: 200, x: ripple.x - 100, y: ripple.y - 100 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Content */}
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.span
              key="loading"
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: DURATION.fast }}
            >
              <LoadingSpinner />
              <span>Loading...</span>
            </motion.span>
          ) : success ? (
            <motion.span
              key="success"
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={SPRING.bouncy}
            >
              <CheckIcon />
              <span>Success!</span>
            </motion.span>
          ) : (
            <motion.span
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast }}
            >
              {children}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

// Loading Spinner
function LoadingSpinner() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </motion.svg>
  );
}

// Animated Checkmark
function CheckIcon() {
  return (
    <motion.svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M20 6L9 17l-5-5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

export default AnimatedButton;
