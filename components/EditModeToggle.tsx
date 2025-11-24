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
        group relative inline-flex items-center gap-2 rounded-xl border
        transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2
        dark:focus:ring-gray-400/30 dark:focus:ring-offset-gray-900
        ${active
          ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/25 hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/30 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 dark:hover:bg-gray-200'
          : 'bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
        }
        ${size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
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
