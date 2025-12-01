import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TripInput - A styled input component for trip features
 * Extends the design system Input with trip-specific styling
 */

export interface TripInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
}

const TripInput = React.forwardRef<HTMLInputElement, TripInputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700",
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm",
          "placeholder:text-gray-400 dark:placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
          "transition-all disabled:opacity-50 disabled:cursor-not-allowed",
          variant === "search" && "pl-10 rounded-xl bg-gray-50 dark:bg-gray-900",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
TripInput.displayName = "TripInput";

export interface TripLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const TripLabel = React.forwardRef<HTMLLabelElement, TripLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        className={cn(
          "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
TripLabel.displayName = "TripLabel";

export interface TripFormFieldProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

function TripFormField({ label, children, className }: TripFormFieldProps) {
  return (
    <div className={className}>
      {label && <TripLabel>{label}</TripLabel>}
      {children}
    </div>
  );
}

export { TripInput, TripLabel, TripFormField };
