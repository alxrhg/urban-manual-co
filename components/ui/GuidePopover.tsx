'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface GuidePopoverProps {
  children: React.ReactNode;
  title: string;
  description: React.ReactNode;
  defaultOpen?: boolean;
  onDismiss?: () => void;
  placement?: 'top-end' | 'bottom-end' | 'top-start' | 'bottom-start';
  className?: string;
  hideDismissButton?: boolean;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export function GuidePopover({
  children,
  title,
  description,
  defaultOpen = false,
  onDismiss,
  placement = 'top-end',
  className,
  hideDismissButton = false,
  ctaLabel,
  onCtaClick,
}: GuidePopoverProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const popoverId = useId();
  const descriptionId = `${popoverId}-description`;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
        onDismiss?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  const closePopover = () => {
    setIsOpen(false);
    onDismiss?.();
  };

  const handleCtaClick = () => {
    onCtaClick?.();
    closePopover();
  };

  return (
    <div className={clsx('relative', className)}>
      {children}
      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 max-w-xs rounded-2xl border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900',
            placement === 'top-end' && 'bottom-full right-0 mb-3',
            placement === 'bottom-end' && 'top-full right-0 mt-3',
            placement === 'top-start' && 'bottom-full left-0 mb-3',
            placement === 'bottom-start' && 'top-full left-0 mt-3',
          )}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${popoverId}-title`}
          aria-describedby={descriptionId}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id={`${popoverId}-title`} className="text-sm font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <div
                id={descriptionId}
                className="mt-1 text-xs text-gray-600 dark:text-gray-300"
              >
                {description}
              </div>
            </div>
            {!hideDismissButton && (
              <button
                type="button"
                onClick={closePopover}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Dismiss guide"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {ctaLabel && (
            <button
              type="button"
              onClick={handleCtaClick}
              className="mt-3 inline-flex items-center justify-center rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {ctaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
