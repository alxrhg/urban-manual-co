'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface UMPillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary';
  className?: string;
  icon?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export default function UMPillButton({
  children,
  onClick,
  variant = 'default',
  className,
  icon,
  disabled = false,
  type = 'button',
}: UMPillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-2 px-5 h-[40px] rounded-3xl border transition-all',
        'font-medium text-sm',
        variant === 'default' &&
          'border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-gray-950 dark:text-neutral-200 dark:hover:bg-gray-900',
        variant === 'primary' &&
          'bg-black text-white border-black hover:bg-neutral-900 dark:bg-white dark:text-black dark:border-white dark:hover:bg-neutral-100',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="text-[15px]">{icon}</span>}
      {children}
    </button>
  );
}

