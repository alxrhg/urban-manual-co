'use client';

import { useState, useRef, useEffect, useCallback, memo, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  showVoiceInput?: boolean;
  maxLength?: number;
}

export const ChatInput = memo(function ChatInput({
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = 'Ask about restaurants, hotels, cities...',
  className,
  autoFocus = false,
  showVoiceInput = false,
  maxLength = 1000,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim();
    if (!trimmedValue || isLoading || disabled) return;

    onSubmit(trimmedValue);
    setValue('');

    // Reset height after submit
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, isLoading, disabled, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleVoiceToggle = useCallback(() => {
    setIsRecording((prev) => !prev);
    // Voice recording implementation would go here
  }, []);

  const isDisabled = disabled || isLoading;
  const canSubmit = value.trim().length > 0 && !isDisabled;
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-end gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 focus-within:border-gray-300 dark:focus-within:border-gray-700 focus-within:ring-2 focus-within:ring-gray-200 dark:focus-within:ring-gray-800 transition-all">
        {/* Input Area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={cn(
              'w-full resize-none bg-transparent border-none outline-none',
              'text-sm text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[24px] max-h-[150px]'
            )}
            style={{ lineHeight: '1.5' }}
          />

          {/* Character count (when near limit) */}
          <AnimatePresence>
            {isNearLimit && (
              <motion.span
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className={cn(
                  'absolute -bottom-5 right-0 text-[10px]',
                  characterCount >= maxLength
                    ? 'text-red-500'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {characterCount}/{maxLength}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Voice Input Button */}
          {showVoiceInput && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleVoiceToggle}
              disabled={isDisabled}
              className={cn(
                'p-2 rounded-xl transition-colors',
                isRecording
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </motion.button>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={canSubmit ? { scale: 1.05 } : {}}
            whileTap={canSubmit ? { scale: 0.95 } : {}}
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'p-2.5 rounded-xl transition-all duration-200',
              canSubmit
                ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            )}
            title="Send message (Enter)"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// Compact input variant for minimized mode
interface CompactInputProps {
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
}

export function CompactInput({ onFocus, placeholder, className }: CompactInputProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onFocus}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border border-gray-200 dark:border-gray-800',
        'rounded-full shadow-lg shadow-black/5 dark:shadow-white/5',
        'text-gray-400 dark:text-gray-500 text-sm text-left',
        'hover:bg-white dark:hover:bg-gray-900',
        'hover:border-gray-300 dark:hover:border-gray-700',
        'transition-all duration-200',
        className
      )}
    >
      <Sparkles className="h-4 w-4 flex-shrink-0" />
      <span className="truncate">{placeholder || 'Ask about destinations...'}</span>
    </motion.button>
  );
}
