'use client';

import { PenSquare, ShieldCheck, X } from 'lucide-react';

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
        transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-2
        active:scale-[0.98]
        ${active
          ? 'bg-black text-white border-black hover:bg-gray-900 dark:bg-white dark:text-black dark:border-white dark:hover:bg-gray-200'
          : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'}
        ${className}
      `}
    >
      {active ? (
        <>
          <ShieldCheck className="h-4 w-4" />
          <span className="font-semibold tracking-tight">
            Edit Mode
          </span>
          <X className="h-3.5 w-3.5 ml-1 opacity-70" />
        </>
      ) : (
        <>
          <PenSquare className="h-4 w-4" />
          <span className="font-medium tracking-tight">
            Edit Mode
          </span>
        </>
      )}
    </button>
  );
}
