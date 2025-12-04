import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input component with size variants
 *
 * Sizes:
 * - sm: Small input (h-9, text-xs)
 * - default: Standard input (h-11, text-sm)
 * - lg: Large input (h-12, text-base)
 *
 * This is the unified input component. Use this instead of TripInput.
 */
const inputVariants = cva(
  "flex w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 transition-colors file:border-0 file:bg-transparent file:font-medium file:text-black dark:file:text-white disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      inputSize: {
        sm: "h-9 px-2.5 py-1.5 text-xs file:text-xs",
        default: "h-11 px-3 py-2 text-sm file:text-sm",
        lg: "h-12 px-4 py-2.5 text-base file:text-base",
      },
    },
    defaultVariants: {
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ inputSize }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

