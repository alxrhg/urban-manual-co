import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * TripButton - A styled button component for trip features
 * Follows design system patterns with trip-specific variants
 */

const tripButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 rounded-full",
        secondary:
          "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full",
        ghost:
          "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors",
        danger:
          "bg-red-600 text-white hover:bg-red-700 rounded-full",
        dangerOutline:
          "border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full",
        pill:
          "px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
        pillActive:
          "px-2.5 py-1 rounded-full text-xs font-medium bg-gray-900 text-white dark:bg-white dark:text-gray-900",
        icon:
          "p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors",
      },
      size: {
        default: "py-2.5 px-4",
        sm: "py-2 px-3 text-xs",
        lg: "py-3 px-6",
        icon: "p-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

interface TripButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tripButtonVariants> {
  asChild?: boolean;
}

const TripButton = React.forwardRef<HTMLButtonElement, TripButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(tripButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
TripButton.displayName = "TripButton";

export { TripButton, tripButtonVariants };
