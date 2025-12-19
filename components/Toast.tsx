/**
 * Toast notification component
 * Apple-style non-intrusive notifications
 */
'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slide in animation
    const slideInTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss
    let slideOutTimer: NodeJS.Timeout | null = null;
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      slideOutTimer = setTimeout(onClose, 300); // Wait for slide-out animation
    }, duration);

    return () => {
      clearTimeout(slideInTimer);
      clearTimeout(dismissTimer);
      if (slideOutTimer) clearTimeout(slideOutTimer);
    };
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  // Monochromatic palette with subtle semantic differences
  const colors = {
    success: 'bg-gray-900 dark:bg-white border border-gray-800 dark:border-gray-200',
    error: 'bg-gray-900 dark:bg-white border border-gray-800 dark:border-gray-200',
    warning: 'bg-gray-800 dark:bg-gray-100 border border-gray-700 dark:border-gray-300',
    info: 'bg-gray-900 dark:bg-white border border-gray-800 dark:border-gray-200',
  };

  const textColors = {
    success: 'text-white dark:text-gray-900',
    error: 'text-white dark:text-gray-900',
    warning: 'text-white dark:text-gray-900',
    info: 'text-white dark:text-gray-900',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`${colors[type]} ${textColors[type]} rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 min-w-[280px] max-w-md`}
      >
        {icons[type]}
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="hover:opacity-70 transition-opacity"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Toast container for managing multiple toasts
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
  }>>([]);

  // Expose global toast function
  useEffect(() => {
    (window as any).showToast = (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type, duration }]);
    };

    return () => {
      delete (window as any).showToast;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 72}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

// TypeScript declaration for global showToast
declare global {
  interface Window {
    showToast?: (message: string, type?: ToastType, duration?: number) => void;
  }
}
