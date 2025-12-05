/**
 * Toast utility using Sonner
 * Provides a simple API for showing toast notifications
 * Also provides backward compatibility with window.showToast
 *
 * ZERO JANK POLICY: Always use safeError() instead of error() when handling
 * caught errors to ensure no raw technical details are exposed to users.
 */
import { toast as sonnerToast } from 'sonner';
import {
  sanitizeError,
  getContextualError,
  ErrorMessages,
} from '@/lib/errors/sanitize';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
}

interface SafeErrorOptions extends ToastOptions {
  /** Custom fallback message if the error is technical */
  fallback?: string;
  /** Operation type for contextual error messages */
  operation?: keyof typeof ErrorMessages;
  /** Specific context within the operation */
  context?: string;
}

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  options?: ToastOptions
) {
  const { duration = 3000, action, description } = options || {};

  const toastOptions = {
    duration,
    action: action ? {
      label: action.label,
      onClick: action.onClick,
    } : undefined,
    description,
  };

  switch (type) {
    case 'success':
      return sonnerToast.success(message, toastOptions);
    case 'error':
      return sonnerToast.error(message, toastOptions);
    case 'warning':
      return sonnerToast.warning(message, toastOptions);
    case 'info':
    default:
      return sonnerToast.info(message, toastOptions);
  }
}

/**
 * Direct exports for specific toast types
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),

  /**
   * ZERO JANK POLICY: Use this for caught errors to ensure no raw
   * technical details are exposed to users.
   *
   * @example
   * // Basic usage - sanitizes the error automatically
   * catch (error) {
   *   toast.safeError(error);
   * }
   *
   * @example
   * // With custom fallback
   * catch (error) {
   *   toast.safeError(error, { fallback: 'Unable to save your changes' });
   * }
   *
   * @example
   * // With contextual message
   * catch (error) {
   *   toast.safeError(error, { operation: 'save', context: 'destination' });
   * }
   */
  safeError: (error: unknown, options?: SafeErrorOptions) => {
    let message: string;

    if (options?.operation) {
      // Use contextual error message
      message = getContextualError(options.operation, options.context);
    } else {
      // Sanitize the error
      message = sanitizeError(error, options?.fallback);
    }

    return showToast(message, 'error', options);
  },

  /**
   * Show an error for a specific operation type.
   * Provides consistent, context-aware error messages.
   *
   * @example
   * toast.operationError('save', 'profile');
   * // Shows: "Unable to save your profile. Please try again."
   *
   * @example
   * toast.operationError('upload', 'image');
   * // Shows: "Image upload failed. Please try a different image."
   */
  operationError: (
    operation: keyof typeof ErrorMessages,
    context?: string,
    options?: ToastOptions
  ) => {
    const message = getContextualError(operation, context);
    return showToast(message, 'error', options);
  },

  // Promise toast for async operations
  promise: sonnerToast.promise,
  // Dismiss a specific or all toasts
  dismiss: sonnerToast.dismiss,
  // Custom toast with JSX
  custom: sonnerToast.custom,
};

/**
 * Initialize global toast function for backward compatibility
 * Call this in a client component to enable window.showToast
 * Note: This maintains compatibility with the existing window.showToast API
 */
export function initGlobalToast() {
  if (typeof window !== 'undefined') {
    // Use any to bypass type checking for backward compatibility
    (window as any).showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
      showToast(message, type, { duration });
    };
  }
}
