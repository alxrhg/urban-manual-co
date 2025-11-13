'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ModalBaseProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onBackdropClick?: () => void;
}

export const ModalBase = forwardRef<HTMLDivElement, ModalBaseProps>(function ModalBase(
  { isOpen, children, className, onBackdropClick, ...rest },
  ref
) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:py-10">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onBackdropClick}
      />
      <div
        ref={ref}
        className={cn('relative z-10 w-full max-w-md', className)}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
});
