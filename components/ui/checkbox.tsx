'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          ref={ref}
          {...props}
          onChange={handleChange}
        />
        <div
          className={cn(
            'w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded',
            'peer-checked:bg-gray-900 peer-checked:border-gray-900',
            'peer-checked:dark:bg-gray-100 peer-checked:dark:border-gray-100',
            'peer-focus:ring-2 peer-focus:ring-gray-500 peer-focus:ring-offset-2',
            'transition-colors',
            'flex items-center justify-center',
            className
          )}
        >
          {props.checked && (
            <Check className="h-3 w-3 text-white dark:text-gray-900" />
          )}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

