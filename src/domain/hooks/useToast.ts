/**
 * Toast Hook
 * Easy-to-use hook for showing toast notifications
 *
 * ZERO JANK POLICY: Use safeError() instead of error() when handling caught
 * errors to ensure no raw technical details are exposed to users.
 */
'use client';

import { useCallback } from 'react';
import { ToastType } from '@/components/Toast';
import { sanitizeError, getContextualError, ErrorMessages } from '@/lib/errors/sanitize';

export function useToast() {
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3000) => {
    // Use the global showToast function from ToastContainer
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast(message, type, duration);
    } else {
      console.warn('ToastContainer not mounted. Add <ToastContainer /> to your layout.');
    }
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const warning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

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
   *   toast.safeError(error, 'Unable to save your changes');
   * }
   *
   * @example
   * // With operation context for specific messages
   * catch (error) {
   *   toast.safeError(error, undefined, 'upload', 'image');
   * }
   */
  const safeError = useCallback((
    err: unknown,
    fallbackMessage?: string,
    operation?: keyof typeof ErrorMessages,
    context?: string,
    duration?: number
  ) => {
    let message: string;

    if (operation) {
      // Use contextual error message
      message = getContextualError(operation, context);
    } else {
      // Sanitize the error
      message = sanitizeError(err, fallbackMessage);
    }

    showToast(message, 'error', duration);
  }, [showToast]);

  /**
   * Show an error for a specific operation type.
   * Provides consistent, context-aware error messages.
   *
   * @example
   * toast.operationError('save', 'profile');
   * // Shows: "Unable to save your profile. Please try again."
   */
  const operationError = useCallback((
    operation: keyof typeof ErrorMessages,
    context?: string,
    duration?: number
  ) => {
    const message = getContextualError(operation, context);
    showToast(message, 'error', duration);
  }, [showToast]);

  return {
    showToast,
    success,
    error,
    warning,
    info,
    safeError,
    operationError,
  };
}
