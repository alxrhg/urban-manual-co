import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Input variants following Lovably editorial aesthetic
 * Underline only (border-b). No background. Large text.
 */
const inputVariants = cva(
  "w-full font-body text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
  {
    variants: {
      variant: {
        // Default: Underline only style (editorial)
        default:
          "bg-transparent border-b border-gray-300 dark:border-gray-700 py-3 focus:border-black dark:focus:border-white",
        // Filled: With background
        filled:
          "bg-gray-100 dark:bg-gray-800 border-0 rounded-none px-4 py-3 focus:bg-gray-200 dark:focus:bg-gray-700",
        // Outline: Full border
        outline:
          "bg-transparent border border-gray-300 dark:border-gray-700 rounded-none px-4 py-3 focus:border-black dark:focus:border-white",
        // Pill: Rounded for search inputs
        pill:
          "bg-gray-100 dark:bg-gray-800 border-0 rounded-full px-5 py-3 focus:ring-2 focus:ring-black dark:focus:ring-white",
      },
      inputSize: {
        default: "text-sm py-3",
        sm: "text-xs py-2",
        lg: "text-base py-4",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
