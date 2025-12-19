'use client';

import * as React from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared auth component styles - centralized to ensure consistency across auth surfaces.
 * These components provide mobile-optimized touch targets and responsive sizing.
 */

// Shared style constants for auth components
const AUTH_INPUT_CLASSES =
  'w-full px-4 py-4 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all duration-200 text-base sm:text-sm text-gray-900 dark:text-white min-h-[56px] sm:min-h-[48px] placeholder:text-gray-400 dark:placeholder:text-gray-500';

const AUTH_PRIMARY_BUTTON_CLASSES =
  'w-full px-6 py-4 sm:py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm sm:text-base font-medium disabled:opacity-50 min-h-[56px] sm:min-h-[48px] shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2';

const AUTH_SECONDARY_BUTTON_CLASSES =
  'w-full px-6 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]';

const AUTH_LABEL_CLASSES = 'block text-sm font-medium mb-2 text-gray-900 dark:text-white';

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ className, label, hint, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label htmlFor={id} className={AUTH_LABEL_CLASSES}>
            {label}
          </label>
        )}
        <input
          id={id}
          className={cn(AUTH_INPUT_CLASSES, className)}
          ref={ref}
          {...props}
        />
        {hint && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{hint}</p>
        )}
      </div>
    );
  }
);
AuthInput.displayName = 'AuthInput';

export interface AuthPasswordInputProps extends Omit<AuthInputProps, 'type'> {
  showPassword?: boolean;
  onTogglePassword?: () => void;
}

export const AuthPasswordInput = React.forwardRef<HTMLInputElement, AuthPasswordInputProps>(
  ({ className, label, hint, id, showPassword, onTogglePassword, ...props }, ref) => {
    const [internalShowPassword, setInternalShowPassword] = React.useState(false);
    const isControlled = showPassword !== undefined && onTogglePassword !== undefined;
    const passwordVisible = isControlled ? showPassword : internalShowPassword;

    const handleToggle = () => {
      if (isControlled) {
        onTogglePassword?.();
      } else {
        setInternalShowPassword(!internalShowPassword);
      }
    };

    return (
      <div>
        {label && (
          <label htmlFor={id} className={AUTH_LABEL_CLASSES}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            type={passwordVisible ? 'text' : 'password'}
            className={cn(AUTH_INPUT_CLASSES, 'pr-14', className)}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={handleToggle}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            {passwordVisible ? (
              <EyeOff className="w-5 h-5 sm:w-4 sm:h-4" />
            ) : (
              <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
            )}
          </button>
        </div>
        {hint && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{hint}</p>
        )}
      </div>
    );
  }
);
AuthPasswordInput.displayName = 'AuthPasswordInput';

export interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

export const AuthButton = React.forwardRef<HTMLButtonElement, AuthButtonProps>(
  ({ className, children, loading, loadingText, disabled, variant = 'primary', ...props }, ref) => {
    const baseClasses = variant === 'primary' ? AUTH_PRIMARY_BUTTON_CLASSES : AUTH_SECONDARY_BUTTON_CLASSES;

    return (
      <button
        className={cn(baseClasses, className)}
        disabled={disabled || loading}
        ref={ref}
        aria-busy={loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {loading ? loadingText || children : children}
      </button>
    );
  }
);
AuthButton.displayName = 'AuthButton';

export interface AuthDividerProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthDivider({ children, className }: AuthDividerProps) {
  return (
    <div className={cn('relative my-6 sm:my-5', className)}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200/80 dark:border-gray-800/80" />
      </div>
      <div className="relative flex justify-center text-xs tracking-wider">
        <span className="px-4 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 font-medium">
          {children}
        </span>
      </div>
    </div>
  );
}

// Export style constants for cases where direct class usage is needed
export const authStyles = {
  input: AUTH_INPUT_CLASSES,
  primaryButton: AUTH_PRIMARY_BUTTON_CLASSES,
  secondaryButton: AUTH_SECONDARY_BUTTON_CLASSES,
  label: AUTH_LABEL_CLASSES,
} as const;
