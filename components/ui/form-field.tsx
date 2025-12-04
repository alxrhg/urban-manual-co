/**
 * Form Field Component with Validation
 *
 * Provides real-time validation feedback for form inputs.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button, type buttonVariants } from './button';
import type { VariantProps } from 'class-variance-authority';

// Validation rules
export interface ValidationRule {
  validate: (value: string) => boolean;
  message: string;
}

// Common validators
export const validators = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = 'Please enter a valid email'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true; // Let required handle empty
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  minLength: (
    min: number,
    message = `Must be at least ${min} characters`
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return value.length >= min;
    },
    message,
  }),

  maxLength: (
    max: number,
    message = `Must be no more than ${max} characters`
  ): ValidationRule => ({
    validate: (value) => value.length <= max,
    message,
  }),

  pattern: (
    regex: RegExp,
    message = 'Invalid format'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  url: (message = 'Please enter a valid URL'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  passwordStrength: (
    message = 'Password must contain uppercase, lowercase, number, and be 8+ characters'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return (
        value.length >= 8 &&
        /[A-Z]/.test(value) &&
        /[a-z]/.test(value) &&
        /[0-9]/.test(value)
      );
    },
    message,
  }),

  match: (
    getOtherValue: () => string,
    message = 'Values do not match'
  ): ValidationRule => ({
    validate: (value) => value === getOtherValue(),
    message,
  }),

  username: (
    message = 'Username can only contain letters, numbers, underscores, and hyphens'
  ): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^[a-zA-Z0-9_-]+$/.test(value);
    },
    message,
  }),

  date: (message = 'Please enter a valid date (YYYY-MM-DD)'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
    },
    message,
  }),
};

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Show validation state */
  showValidation?: boolean;
  /** Validate on blur instead of change */
  validateOnBlur?: boolean;
  /** External error message (from server) */
  error?: string;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  /** Whether the field should show as required visually */
  required?: boolean;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      className,
      label,
      helperText,
      rules = [],
      showValidation = true,
      validateOnBlur = false,
      error: externalError,
      onValidationChange,
      onChange,
      onBlur,
      value,
      required,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      (value as string) || ''
    );
    const [touched, setTouched] = React.useState(false);
    const [errors, setErrors] = React.useState<string[]>([]);
    const [isDirty, setIsDirty] = React.useState(false);

    const currentValue = value !== undefined ? (value as string) : internalValue;

    // Run validation
    const validate = React.useCallback(
      (val: string): string[] => {
        const validationErrors: string[] = [];
        for (const rule of rules) {
          if (!rule.validate(val)) {
            validationErrors.push(rule.message);
          }
        }
        return validationErrors;
      },
      [rules]
    );

    // Handle change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        setIsDirty(true);

        if (!validateOnBlur && touched) {
          const newErrors = validate(newValue);
          setErrors(newErrors);
          onValidationChange?.(newErrors.length === 0, newErrors);
        }

        onChange?.(e);
      },
      [validateOnBlur, touched, validate, onChange, onValidationChange]
    );

    // Handle blur
    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setTouched(true);
        const newErrors = validate(e.target.value);
        setErrors(newErrors);
        onValidationChange?.(newErrors.length === 0, newErrors);
        onBlur?.(e);
      },
      [validate, onBlur, onValidationChange]
    );

    // Determine validation state
    const hasError = externalError || (touched && errors.length > 0);
    const isValid = touched && !hasError && isDirty && errors.length === 0;
    const displayError = externalError || (touched ? errors[0] : undefined);

    const inputId = props.id || props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {(required || rules.some((r) => r.message.toLowerCase().includes('required'))) && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              [displayError && errorId, helperText && helperId]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn(
              'pr-10',
              hasError &&
                'border-red-500 dark:border-red-500 focus-visible:ring-red-500',
              isValid &&
                showValidation &&
                'border-green-500 dark:border-green-500 focus-visible:ring-green-500'
            )}
            {...props}
          />

          {/* Validation icon */}
          {showValidation && touched && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {hasError ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : isValid ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : null}
            </div>
          )}
        </div>

        {/* Error message */}
        {displayError && (
          <p
            id={errorId}
            className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            {displayError}
          </p>
        )}

        {/* Helper text */}
        {helperText && !displayError && (
          <p
            id={helperId}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

/**
 * Password field with strength indicator
 */
export const PasswordField = React.forwardRef<
  HTMLInputElement,
  Omit<FormFieldProps, 'type'> & { showStrength?: boolean }
>(({ showStrength = true, rules = [], ...props }, ref) => {
  const [value, setValue] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  // Calculate password strength
  const strength = React.useMemo(() => {
    if (!value) return 0;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 4);
  }, [value]);

  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [
    'bg-red-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
  ];

  return (
    <div className="space-y-2">
      <div className="relative">
        <FormField
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          rules={rules}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-10 top-[38px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
          tabIndex={-1}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* Strength indicator */}
      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((level) => (
              <div
                key={level}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  level < strength
                    ? strengthColors[strength - 1]
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Password strength: {strengthLabels[strength - 1] || 'Too weak'}
          </p>
        </div>
      )}
    </div>
  );
});

PasswordField.displayName = 'PasswordField';

/**
 * Textarea field with validation
 */
interface TextareaFieldProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Field label */
  label?: string;
  /** Helper text shown below textarea */
  helperText?: string;
  /** Validation rules */
  rules?: ValidationRule[];
  /** Show validation state */
  showValidation?: boolean;
  /** Validate on blur instead of change */
  validateOnBlur?: boolean;
  /** External error message (from server) */
  error?: string;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: string[]) => void;
  /** Show character count */
  showCount?: boolean;
}

export const TextareaField = React.forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
  (
    {
      className,
      label,
      helperText,
      rules = [],
      showValidation = true,
      validateOnBlur = false,
      error: externalError,
      onValidationChange,
      onChange,
      onBlur,
      value,
      required,
      maxLength,
      showCount = false,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      (value as string) || ''
    );
    const [touched, setTouched] = React.useState(false);
    const [errors, setErrors] = React.useState<string[]>([]);
    const [isDirty, setIsDirty] = React.useState(false);

    const currentValue = value !== undefined ? (value as string) : internalValue;

    // Run validation
    const validate = React.useCallback(
      (val: string): string[] => {
        const validationErrors: string[] = [];
        for (const rule of rules) {
          if (!rule.validate(val)) {
            validationErrors.push(rule.message);
          }
        }
        return validationErrors;
      },
      [rules]
    );

    // Handle change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setInternalValue(newValue);
        setIsDirty(true);

        if (!validateOnBlur && touched) {
          const newErrors = validate(newValue);
          setErrors(newErrors);
          onValidationChange?.(newErrors.length === 0, newErrors);
        }

        onChange?.(e);
      },
      [validateOnBlur, touched, validate, onChange, onValidationChange]
    );

    // Handle blur
    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        setTouched(true);
        const newErrors = validate(e.target.value);
        setErrors(newErrors);
        onValidationChange?.(newErrors.length === 0, newErrors);
        onBlur?.(e);
      },
      [validate, onBlur, onValidationChange]
    );

    // Determine validation state
    const hasError = externalError || (touched && errors.length > 0);
    const isValid = touched && !hasError && isDirty && errors.length === 0;
    const displayError = externalError || (touched ? errors[0] : undefined);

    const inputId = props.id || props.name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className={cn('space-y-1.5', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {required && (
              <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
            )}
          </label>
        )}

        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            value={currentValue}
            onChange={handleChange}
            onBlur={handleBlur}
            maxLength={maxLength}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              [displayError && errorId, helperText && helperId]
                .filter(Boolean)
                .join(' ') || undefined
            }
            className={cn(
              'flex min-h-[80px] w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-none',
              hasError &&
                'border-red-500 dark:border-red-500 focus-visible:ring-red-500',
              isValid &&
                showValidation &&
                'border-green-500 dark:border-green-500 focus-visible:ring-green-500'
            )}
            {...props}
          />
        </div>

        {/* Character count and/or error */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
            {/* Error message */}
            {displayError && (
              <p
                id={errorId}
                className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {displayError}
              </p>
            )}

            {/* Helper text */}
            {helperText && !displayError && (
              <p
                id={helperId}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {helperText}
              </p>
            )}
          </div>

          {/* Character count */}
          {(showCount || maxLength) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {currentValue.length}
              {maxLength && `/${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

TextareaField.displayName = 'TextareaField';

/**
 * Submit button with loading state
 */
interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Loading state */
  isLoading?: boolean;
  /** Text to show while loading */
  loadingText?: string;
  /** The default children text */
  children: React.ReactNode;
}

export function SubmitButton({
  isLoading = false,
  loadingText,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={cn('relative', className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * Form error summary for displaying multiple errors
 */
interface FormErrorSummaryProps {
  errors: string[];
  className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      className={cn(
        'p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          {errors.length === 1 ? (
            <p className="text-sm text-red-600 dark:text-red-400">{errors[0]}</p>
          ) : (
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-0.5">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Form success message
 */
interface FormSuccessMessageProps {
  message: string;
  className?: string;
}

export function FormSuccessMessage({ message, className }: FormSuccessMessageProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
      </div>
    </div>
  );
}
