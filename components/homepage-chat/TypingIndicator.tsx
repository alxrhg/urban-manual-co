'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={`flex gap-1.5 py-1 ${className || ''}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

interface LoadingDotsProps {
  text?: string;
  className?: string;
}

export function LoadingDots({ text, className }: LoadingDotsProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {text && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{text}</span>
      )}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}
