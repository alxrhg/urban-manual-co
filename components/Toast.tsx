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
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for slide-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  return (
    <div
      className={`fixed top-6 right-6 z-[100] max-w-sm transform transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-3 rounded-[1.25rem] border px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] backdrop-blur supports-[backdrop-filter]:backdrop-blur-lg ${
          {
            success: 'border-emerald-200/70 bg-white/90 text-slate-900 dark:border-emerald-400/40 dark:bg-slate-900/80 dark:text-white',
            error: 'border-rose-200/80 bg-white/90 text-slate-900 dark:border-rose-400/50 dark:bg-slate-900/80 dark:text-white',
            warning: 'border-amber-200/80 bg-white/90 text-slate-900 dark:border-amber-300/50 dark:bg-slate-900/80 dark:text-white',
            info: 'border-slate-200/80 bg-white/90 text-slate-900 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-white',
          }[type]
        }`}
      >
        {icons[type]}
        <span className="flex-1 text-sm font-medium leading-tight tracking-tight">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-current/30 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-black dark:text-slate-300 dark:hover:text-white"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
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
