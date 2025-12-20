'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Link2 } from 'lucide-react';

/**
 * CMS Form Components
 *
 * A set of clean, minimal form components designed for CMS interfaces.
 * Features:
 * - Labels with "Required" indicator on the right
 * - Auto-generated slugs with URL preview
 * - Clean date picker with calendar icon
 * - Consistent, minimal styling
 */

// Shared styles
const inputBaseStyles = "w-full px-4 py-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-gray-300 dark:focus:border-gray-700 transition-all";

const labelStyles = "text-sm font-normal text-gray-500 dark:text-gray-400";

// ============================================
// CMS Form Field
// ============================================

interface CMSFormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  helperText?: string;
}

export function CMSFormField({
  label,
  required = false,
  children,
  className,
  helperText
}: CMSFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className={labelStyles}>{label}</label>
        {required && (
          <span className="text-sm text-gray-400 dark:text-gray-500">Required</span>
        )}
      </div>
      {children}
      {helperText && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

// ============================================
// CMS Input
// ============================================

interface CMSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  helperText?: string;
}

export const CMSInput = React.forwardRef<HTMLInputElement, CMSInputProps>(
  ({ label, required, helperText, className, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        className={cn(inputBaseStyles, className)}
        {...props}
      />
    );

    if (!label) return input;

    return (
      <CMSFormField label={label} required={required} helperText={helperText}>
        {input}
      </CMSFormField>
    );
  }
);
CMSInput.displayName = 'CMSInput';

// ============================================
// CMS Textarea
// ============================================

interface CMSTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  helperText?: string;
}

export const CMSTextarea = React.forwardRef<HTMLTextAreaElement, CMSTextareaProps>(
  ({ label, required, helperText, className, rows = 4, ...props }, ref) => {
    const textarea = (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          inputBaseStyles,
          "resize-y min-h-[100px]",
          className
        )}
        {...props}
      />
    );

    if (!label) return textarea;

    return (
      <CMSFormField label={label} required={required} helperText={helperText}>
        {textarea}
      </CMSFormField>
    );
  }
);
CMSTextarea.displayName = 'CMSTextarea';

// ============================================
// CMS Slug Field
// ============================================

interface CMSSlugFieldProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  sourceValue?: string;
  baseUrl?: string;
  autoGenerate?: boolean;
  className?: string;
}

export function CMSSlugField({
  label = 'Slug',
  required = false,
  value,
  onChange,
  sourceValue,
  baseUrl = 'yoursite.url',
  autoGenerate = true,
  className,
}: CMSSlugFieldProps) {
  // Generate slug from source value
  const generateSlug = React.useCallback((text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  // Auto-generate slug when source changes (only if slug is empty or matches previous auto-generated)
  const prevSourceRef = React.useRef<string>('');
  React.useEffect(() => {
    if (autoGenerate && sourceValue) {
      const prevSlug = generateSlug(prevSourceRef.current);
      const newSlug = generateSlug(sourceValue);

      // Update slug if it's empty or if it matches the previously auto-generated value
      if (!value || value === prevSlug) {
        onChange(newSlug);
      }
      prevSourceRef.current = sourceValue;
    }
  }, [sourceValue, autoGenerate, generateSlug, onChange, value]);

  return (
    <CMSFormField label={label} required={required} className={className}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={sourceValue ? generateSlug(sourceValue) : 'url-slug'}
        className={cn(inputBaseStyles, "text-gray-400 dark:text-gray-500")}
      />
      {value && (
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-400 dark:text-gray-500">
          <Link2 className="h-4 w-4" />
          <span>{baseUrl}/{value}</span>
        </div>
      )}
    </CMSFormField>
  );
}

// ============================================
// CMS Date Picker
// ============================================

interface CMSDatePickerProps {
  label?: string;
  required?: boolean;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

export function CMSDatePicker({
  label = 'Date',
  required = false,
  value,
  onChange,
  className,
  placeholder = 'Select date',
}: CMSDatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      onChange(new Date(dateValue));
    } else {
      onChange(null);
    }
  };

  const toInputValue = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  return (
    <CMSFormField label={label} required={required} className={className}>
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.showPicker()}
          className={cn(
            inputBaseStyles,
            "text-left flex items-center gap-3 cursor-pointer"
          )}
        >
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={value ? "text-gray-900 dark:text-white" : "text-gray-400"}>
            {value ? formatDate(value) : placeholder}
          </span>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={toInputValue(value)}
          onChange={handleDateChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
    </CMSFormField>
  );
}

// ============================================
// CMS Select
// ============================================

interface CMSSelectOption {
  value: string;
  label: string;
}

interface CMSSelectProps {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: CMSSelectOption[];
  placeholder?: string;
  className?: string;
}

export function CMSSelect({
  label,
  required = false,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className,
}: CMSSelectProps) {
  const select = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        inputBaseStyles,
        "appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M6%208.825L1.175%204%202.238%202.938%206%206.7l3.763-3.762L10.825%204%206%208.825z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10",
        !value && "text-gray-400"
      )}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return select;

  return (
    <CMSFormField label={label} required={required} className={className}>
      {select}
    </CMSFormField>
  );
}

// ============================================
// CMS Toggle / Switch
// ============================================

interface CMSToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function CMSToggle({
  label,
  description,
  checked,
  onChange,
  className,
}: CMSToggleProps) {
  return (
    <div className={cn("flex items-center justify-between py-3", className)}>
      <div className="space-y-0.5">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked
            ? "bg-black dark:bg-white"
            : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

// ============================================
// CMS Section
// ============================================

interface CMSSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function CMSSection({
  title,
  description,
  children,
  className
}: CMSSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}

// ============================================
// CMS Divider
// ============================================

export function CMSDivider({ className }: { className?: string }) {
  return (
    <div className={cn("border-t border-gray-100 dark:border-gray-800 my-6", className)} />
  );
}
