'use client';

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import './BottomSheet.css';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
};

const ANIMATION_DURATION = 380;

export function BottomSheet({ open, onClose, className, children }: BottomSheetProps) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    const timeout = setTimeout(() => setIsMounted(false), ANIMATION_DURATION);
    return () => clearTimeout(timeout);
  }, [open]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div
        className={clsx(
          'absolute inset-0 bg-black/70 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <div className="pointer-events-none relative flex w-full justify-center px-4 pb-4">
        <div
          className={clsx(
            'pointer-events-auto relative w-full max-w-5xl overflow-hidden rounded-t-[28px] bg-white/95 shadow-bose backdrop-blur-xl ring-1 ring-white/30 transition-transform duration-500 ease-bose dark:bg-neutral-900/95 dark:ring-white/10',
            isVisible ? 'translate-y-0' : 'translate-y-full',
            '[transform:translateX(-50%)] left-1/2 absolute',
            'max-h-[90vh] flex flex-col',
            className
          )}
          style={{ transitionDuration: `${ANIMATION_DURATION}ms` }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-4 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/70 text-2xl text-neutral-700 shadow-lg backdrop-blur-xl transition hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-neutral-200"
          >
            ×
          </button>

          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-14">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BottomSheet;
