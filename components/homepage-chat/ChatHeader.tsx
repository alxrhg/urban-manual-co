'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { X, Minimize2, Maximize2, Trash2, RotateCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatViewMode = 'minimized' | 'compact' | 'expanded';

interface ChatHeaderProps {
  viewMode: ChatViewMode;
  onViewModeChange: (mode: ChatViewMode) => void;
  onClose: () => void;
  onClearHistory?: () => void;
  isOnline?: boolean;
  hasMessages?: boolean;
  className?: string;
}

export const ChatHeader = memo(function ChatHeader({
  viewMode,
  onViewModeChange,
  onClose,
  onClearHistory,
  isOnline = true,
  hasMessages = false,
  className,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-800/50',
        className
      )}
    >
      {/* Left: Title and Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20">
            <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Travel AI
            </h3>
            <div className="flex items-center gap-1.5">
              <motion.div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                )}
                animate={isOnline ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Clear History */}
        {hasMessages && onClearHistory && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearHistory}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
        )}

        {/* View Mode Toggle */}
        {viewMode === 'expanded' ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('compact')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </motion.button>
        ) : viewMode === 'compact' ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewModeChange('expanded')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Expand"
          >
            <Maximize2 className="h-4 w-4" />
          </motion.button>
        ) : null}

        {/* Close */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Close"
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
});

// Context Badge - shows current search context
interface ContextBadgeProps {
  context?: {
    city?: string;
    category?: string;
    mood?: string;
  };
  onClear?: () => void;
}

export function ContextBadge({ context, onClear }: ContextBadgeProps) {
  if (!context || (!context.city && !context.category && !context.mood)) {
    return null;
  }

  const parts = [
    context.city,
    context.category,
    context.mood,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200/50 dark:border-gray-800/50">
      <span className="text-xs text-gray-500 dark:text-gray-400">Context:</span>
      <div className="flex flex-wrap gap-1">
        {parts.map((part, idx) => (
          <span
            key={idx}
            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
          >
            {part}
          </span>
        ))}
      </div>
      {onClear && (
        <button
          onClick={onClear}
          className="ml-auto text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Clear
        </button>
      )}
    </div>
  );
}
