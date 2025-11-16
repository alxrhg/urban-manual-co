'use client';

import { PenSquare, ShieldCheck } from 'lucide-react';

interface EditModeToggleProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
  size?: 'default' | 'compact';
}

export function EditModeToggle({ active, onToggle, className = '', size = 'default' }: EditModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`
        group relative inline-flex items-center gap-2 rounded-full border
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-black/10 focus:ring-offset-2
        dark:focus:ring-white/20 dark:focus:ring-offset-gray-900
        ${active
          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-lg shadow-black/10 dark:shadow-white/10'
          : 'bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
        }
        ${size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
        ${className}
      `}
    >
      {active ? (
        <ShieldCheck className="h-4 w-4" />
      ) : (
        <PenSquare className="h-4 w-4" />
      )}
      <span className="font-medium tracking-tight">
        {active ? 'Editing' : 'Edit Mode'}
      </span>
      <span
        className={`
          absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.2em]
          text-gray-400 transition-opacity duration-200
          ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}
      >
        Admin
      </span>
    </button>
  );
}
