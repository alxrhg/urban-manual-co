/**
 * Toast utility using Sonner
 * Provides a simple API for showing toast notifications
 * Also provides backward compatibility with window.showToast
 */
import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  description?: string;
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
