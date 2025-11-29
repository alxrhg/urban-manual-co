/**
 * Dismissible Alert Component
 *
 * Alert with auto-dismiss, retry functionality, and smooth animations.
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';

const dismissibleAlertVariants = cva(
  'relative w-full rounded-2xl border px-4 py-3 text-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100',
        success:
          'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
        error:
          'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
        warning:
          'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const icons = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export interface DismissibleAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dismissibleAlertVariants> {
  /** Alert title */
  title?: string;
  /** Alert message */
  message: string;
  /** Auto-dismiss after duration (ms). Set to 0 to disable */
  autoDismiss?: number;
  /** Show dismiss button */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Show retry button */
  showRetry?: boolean;
  /** Retry callback */
  onRetry?: () => void;
  /** Whether retry is in progress */
  retrying?: boolean;
  /** Icon override */
  icon?: React.ReactNode;
}

export function DismissibleAlert({
  className,
  variant = 'default',
  title,
  message,
  autoDismiss = 5000,
  dismissible = true,
  onDismiss,
  showRetry = false,
  onRetry,
  retrying = false,
  icon,
  ...props
}: DismissibleAlertProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExiting, setIsExiting] = React.useState(false);
  const [progress, setProgress] = React.useState(100);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = React.useRef<number>(0);

  const IconComponent = icons[variant || 'default'];

  // Handle dismiss
  const handleDismiss = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  // Auto-dismiss timer
  React.useEffect(() => {
    if (autoDismiss <= 0) return;

    startTimeRef.current = Date.now();

    // Progress animation
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / autoDismiss) * 100);
      setProgress(remaining);
    }, 50);

    // Dismiss timer
    timerRef.current = setTimeout(handleDismiss, autoDismiss);

    return () => {
      clearInterval(progressInterval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoDismiss, handleDismiss]);

  // Pause timer on hover
  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (autoDismiss > 0 && !timerRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, autoDismiss - elapsed);
      if (remaining > 0) {
        timerRef.current = setTimeout(handleDismiss, remaining);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        dismissibleAlertVariants({ variant }),
        'overflow-hidden',
        isExiting && 'opacity-0 translate-x-4',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* Progress bar for auto-dismiss */}
      {autoDismiss > 0 && (
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {icon || <IconComponent className="h-5 w-5" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="font-medium leading-none tracking-tight mb-1">
              {title}
            </h5>
          )}
          <p className="text-sm leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Retry button */}
          {showRetry && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className={cn(
                'p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5',
                'transition-colors focus-visible:outline-none focus-visible:ring-2',
                retrying && 'animate-spin'
              )}
              aria-label="Retry"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}

          {/* Dismiss button */}
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                'p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5',
                'transition-colors focus-visible:outline-none focus-visible:ring-2'
              )}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Alert container for stacking multiple alerts
 */
interface AlertStackProps {
  alerts: Array<{
    id: string;
    variant?: DismissibleAlertProps['variant'];
    title?: string;
    message: string;
    showRetry?: boolean;
    onRetry?: () => void;
  }>;
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function AlertStack({
  alerts,
  onDismiss,
  position = 'top-right',
}: AlertStackProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none',
        positionClasses[position]
      )}
    >
      {alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <DismissibleAlert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            showRetry={alert.showRetry}
            onRetry={alert.onRetry}
            onDismiss={() => onDismiss(alert.id)}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Hook for managing alert stack
 */
export function useAlerts() {
  const [alerts, setAlerts] = React.useState<
    Array<{
      id: string;
      variant?: DismissibleAlertProps['variant'];
      title?: string;
      message: string;
      showRetry?: boolean;
      onRetry?: () => void;
    }>
  >([]);

  const showAlert = React.useCallback(
    (
      message: string,
      options?: {
        variant?: DismissibleAlertProps['variant'];
        title?: string;
        showRetry?: boolean;
        onRetry?: () => void;
      }
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      setAlerts((prev) => [
        ...prev,
        { id, message, ...options },
      ]);
      return id;
    },
    []
  );

  const dismissAlert = React.useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAlerts = React.useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    alerts,
    showAlert,
    showSuccess: (message: string, title?: string) =>
      showAlert(message, { variant: 'success', title }),
    showError: (message: string, title?: string, onRetry?: () => void) =>
      showAlert(message, { variant: 'error', title, showRetry: !!onRetry, onRetry }),
    showWarning: (message: string, title?: string) =>
      showAlert(message, { variant: 'warning', title }),
    showInfo: (message: string, title?: string) =>
      showAlert(message, { variant: 'info', title }),
    dismissAlert,
    clearAlerts,
  };
}
