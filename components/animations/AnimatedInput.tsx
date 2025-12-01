'use client';

import { forwardRef, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRING, DURATION, EASE } from '@/lib/animations';
import { Check, AlertCircle, X } from 'lucide-react';

interface AnimatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: boolean;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'filled' | 'underline';
  clearable?: boolean;
  onClear?: () => void;
}

/**
 * AnimatedInput - Input with micro-interactions
 *
 * Features:
 * - Floating label animation
 * - Focus ring animation
 * - Error shake animation
 * - Success checkmark animation
 * - Clearable with animated X button
 */
export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      size = 'md',
      variant = 'default',
      clearable = false,
      onClear,
      className = '',
      value,
      onChange,
      onFocus,
      onBlur,
      disabled,
      ...props
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!value);
    const [shouldShake, setShouldShake] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Merge refs
    const mergedRef = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    // Trigger shake on error
    useEffect(() => {
      if (error && !shouldReduceMotion) {
        setShouldShake(true);
        const timer = setTimeout(() => setShouldShake(false), 500);
        return () => clearTimeout(timer);
      }
    }, [error, shouldReduceMotion]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      onChange?.(e);
    };

    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = '';
        inputRef.current.focus();
        setHasValue(false);
      }
      onClear?.();
    };

    const sizeStyles = {
      sm: 'h-9 text-sm px-3',
      md: 'h-11 text-sm px-4',
      lg: 'h-12 text-base px-4',
    };

    const variantStyles = {
      default:
        'bg-white dark:bg-gray-900 border rounded-xl',
      filled:
        'bg-gray-100 dark:bg-gray-800 border-transparent rounded-xl',
      underline:
        'bg-transparent border-b border-t-0 border-l-0 border-r-0 rounded-none px-0',
    };

    const borderColor = error
      ? 'border-red-500 focus:border-red-500'
      : success
      ? 'border-green-500 focus:border-green-500'
      : 'border-gray-200 dark:border-gray-800 focus:border-gray-900 dark:focus:border-white';

    const Wrapper = shouldReduceMotion ? 'div' : motion.div;
    const wrapperProps = shouldReduceMotion
      ? {}
      : {
          animate: shouldShake ? { x: [0, -10, 10, -10, 10, 0] } : {},
          transition: { duration: 0.4 },
        };

    return (
      <div className="relative w-full">
        <Wrapper {...wrapperProps}>
          {/* Label */}
          {label && (
            <motion.label
              className={cn(
                'absolute left-4 pointer-events-none transition-colors',
                variant === 'underline' && 'left-0',
                isFocused || hasValue
                  ? 'text-xs -top-2 bg-white dark:bg-gray-900 px-1 text-gray-600 dark:text-gray-400'
                  : cn(
                      'text-gray-400 dark:text-gray-500',
                      size === 'sm' && 'top-2',
                      size === 'md' && 'top-3',
                      size === 'lg' && 'top-3.5'
                    ),
                error && 'text-red-500',
                success && 'text-green-500'
              )}
              initial={false}
              animate={{
                y: isFocused || hasValue ? 0 : 0,
                scale: isFocused || hasValue ? 0.85 : 1,
                originX: 0,
              }}
              transition={{ duration: DURATION.fast, ease: EASE.out }}
            >
              {label}
            </motion.label>
          )}

          {/* Input */}
          <input
            ref={mergedRef}
            className={cn(
              'w-full transition-all duration-200 outline-none',
              sizeStyles[size],
              variantStyles[variant],
              borderColor,
              'focus:ring-2 focus:ring-offset-0',
              error
                ? 'focus:ring-red-500/20'
                : success
                ? 'focus:ring-green-500/20'
                : 'focus:ring-gray-900/10 dark:focus:ring-white/10',
              disabled && 'opacity-50 cursor-not-allowed',
              (clearable || success || error) && 'pr-10',
              className
            )}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            {...props}
          />

          {/* Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <AnimatePresence mode="wait">
              {success && !error && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={SPRING.bouncy}
                >
                  <Check className="h-4 w-4 text-green-500" />
                </motion.div>
              )}
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={SPRING.bouncy}
                >
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </motion.div>
              )}
              {clearable && hasValue && !success && !error && (
                <motion.button
                  key="clear"
                  type="button"
                  onClick={handleClear}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </Wrapper>

        {/* Error/Hint message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              className="text-xs text-red-500 mt-1 ml-1"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: DURATION.fast }}
            >
              {error}
            </motion.p>
          )}
          {hint && !error && (
            <motion.p
              key="hint"
              className="text-xs text-gray-400 mt-1 ml-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

export default AnimatedInput;
