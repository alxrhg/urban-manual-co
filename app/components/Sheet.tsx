'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface SheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  side?: 'left' | 'right' | 'bottom';
  className?: string;
  children: React.ReactNode;
}

export function Sheet({ open, onOpenChange, side = 'right', className, children }: SheetProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 z-50 flex transition-opacity duration-200',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div
        className={clsx(
          'relative bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-800',
          'h-full w-full max-h-screen transition-transform duration-200 ease-out',
          side === 'right' && 'ml-auto max-w-xl translate-x-0',
          side === 'left' && 'mr-auto max-w-xl translate-x-0',
          side === 'bottom' && 'mt-auto max-h-[80vh]',
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export interface SheetHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function SheetHeader({ title, description, actions }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 dark:border-gray-800 p-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SheetBody({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-y-auto p-4 space-y-4">{children}</div>;
}
