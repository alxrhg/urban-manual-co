'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onSubmit'> {
  label?: string;
  pending?: boolean;
  pendingLabel?: string;
  onSubmit?: (value: string) => void;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { label = 'Search query', pending = false, pendingLabel = 'Searching', onSubmit, className, onKeyDown, ...rest },
  ref,
) {
  const inputId = rest.id ?? rest.name ?? 'search-field';

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...rest}
        id={inputId}
        ref={ref}
        aria-label={label}
        aria-busy={pending}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === 'Enter' && !event.shiftKey && onSubmit) {
            event.preventDefault();
            onSubmit(typeof rest.value === 'string' ? rest.value : String(rest.value ?? ''));
          }
        }}
        className={clsx(
          'w-full text-left text-xs uppercase tracking-[2px] font-medium placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none bg-transparent border-none text-black dark:text-white transition-all duration-300 placeholder:opacity-60 focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/40 rounded-none',
          pending ? 'pl-7' : '',
          className,
        )}
      />
      {pending && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" role="status" aria-live="polite">
          <Loader2 className="w-4 h-4 animate-spin" aria-label={pendingLabel} />
        </div>
      )}
    </div>
  );
});
