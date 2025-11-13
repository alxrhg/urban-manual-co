'use client';

import type { HTMLAttributes } from "react";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChip {
  id: string;
  label: string;
  active?: boolean;
  onToggle?: (id: string) => void;
}

export interface AdminFilterBarProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  chips?: FilterChip[];
  busy?: boolean;
}

export function AdminFilterBar({
  value,
  placeholder = 'Search records…',
  onChange,
  chips = [],
  busy = false,
  className,
  ...props
}: AdminFilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[1rem] border border-slate-200/70 bg-white/70 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900/50',
        className
      )}
      {...props}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[0.9rem] border border-transparent bg-slate-50/70 py-2.5 pl-10 pr-4 text-sm font-medium tracking-wide text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-0 dark:bg-slate-950/40 dark:text-white"
        />
        {busy && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => chip.onToggle?.(chip.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition-colors',
                chip.active
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-slate-300 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
