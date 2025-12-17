/**
 * Undo Toast Component
 *
 * Shows a temporary notification with undo option after destructive actions.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Undo2, X } from 'lucide-react';
import { useUndo, getTimeRemaining } from '@/hooks/useUndo';

interface UndoToastProps {
  /** Message to display */
  message: string;
  /** Callback to perform undo */
  onUndo: () => void | Promise<void>;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
  /** Duration before auto-dismiss (ms) */
  duration?: number;
  /** Additional class names */
  className?: string;
}

export function UndoToast({
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  className,
}: UndoToastProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isUndoing, setIsUndoing] = React.useState(false);
  const [progress, setProgress] = React.useState(100);

  // Slide in animation
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar animation
  React.useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      await onUndo();
      handleDismiss();
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'transform transition-all duration-300',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className
      )}
    >
      <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl shadow-xl overflow-hidden min-w-[300px]">
        {/* Progress bar */}
        <div
          className="h-1 bg-white/30 dark:bg-gray-900/30"
          style={{ width: `${progress}%`, transition: 'width 50ms linear' }}
        />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Message */}
          <span className="flex-1 text-sm font-medium">{message}</span>

          {/* Undo button */}
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
              'bg-white/10 dark:bg-gray-900/10 hover:bg-white/20 dark:hover:bg-gray-900/20',
              'text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/50'
            )}
          >
            {isUndoing ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            Undo
          </button>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 dark:hover:bg-gray-900/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Container for managing undo toasts
 */
interface UndoToastContainerProps {
  className?: string;
}

export function UndoToastContainer({ className }: UndoToastContainerProps) {
  const { lastAction, undo, clearAction } = useUndo();

  if (!lastAction) return null;

  return (
    <UndoToast
      message={lastAction.label}
      onUndo={undo}
      onDismiss={() => clearAction(lastAction.id)}
      duration={getTimeRemaining(lastAction)}
      className={className}
    />
  );
}
