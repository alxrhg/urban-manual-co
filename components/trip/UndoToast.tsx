'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, X } from 'lucide-react';

interface UndoAction {
  id: string;
  message: string;
  undo: () => void;
  timeout: number;
}

interface UndoContextType {
  showUndo: (message: string, undoFn: () => void, timeout?: number) => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

/**
 * Hook to access undo functionality
 */
export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within UndoProvider');
  }
  return context;
}

/**
 * UndoProvider - Provides undo functionality to the app
 */
export function UndoProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<UndoAction | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Show undo toast
  const showUndo = useCallback((message: string, undoFn: () => void, timeout = 5000) => {
    const id = `undo-${Date.now()}`;
    setAction({ id, message, undo: undoFn, timeout });
    setTimeLeft(timeout);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!action || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          setAction(null);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [action, timeLeft]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (action) {
      action.undo();
      setAction(null);
    }
  }, [action]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setAction(null);
  }, []);

  return (
    <UndoContext.Provider value={{ showUndo }}>
      {children}
      <UndoToast
        action={action}
        timeLeft={timeLeft}
        onUndo={handleUndo}
        onDismiss={handleDismiss}
      />
    </UndoContext.Provider>
  );
}

/**
 * UndoToast - Visual toast with undo button
 */
function UndoToast({
  action,
  timeLeft,
  onUndo,
  onDismiss,
}: {
  action: UndoAction | null;
  timeLeft: number;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!action) return null;

  const progress = (timeLeft / action.timeout) * 100;

  return (
    <AnimatePresence>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)]"
        >
          <div className="bg-gray-900 dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Progress bar */}
            <div className="h-0.5 bg-gray-700">
              <div
                className="h-full bg-white/30 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Content */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-[13px] text-white">
                {action.message}
              </span>

              <button
                onClick={onUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>

              <button
                onClick={onDismiss}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UndoToast;
