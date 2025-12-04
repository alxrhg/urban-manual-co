import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Unified Button Component
 *
 * This is the primary button component for the application.
 * Use this instead of:
 * - UMPillButton (use variant="pill" or variant="pill-primary")
 * - TripButton (use appropriate variant)
 *
 * Variants:
 * - default: Primary black/white button
 * - destructive: Red delete/danger button
 * - outline: Bordered transparent button
 * - secondary: Bordered white button
 * - ghost: Minimal hover-only button
 * - muted: Subtle bordered button
 * - subtle: Text-only button with hover
 * - pill: Rounded pill-shaped button
 * - pill-primary: Primary colored pill button
 * - pill-active: Active state pill button
 * - danger: Red background button
 * - danger-outline: Red text with border
 * - link: Underlined link style
 *
 * Sizes:
 * - default: h-11, standard padding
 * - sm: Smaller with rounded-2xl
 * - lg: Larger with rounded-2xl
 * - xs: Extra small
 * - pill: Compact pill size (h-11, px-5, rounded-full)
 * - icon: Square icon button
 * - icon-sm: Small square icon button
 * - icon-lg: Large square icon button
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Core variants
        default: "bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-200",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-xl",
        outline:
          "border border-gray-200 dark:border-gray-800 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-800 dark:text-white",
        secondary:
          "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800",
        ghost:
          "hover:bg-gray-100 dark:hover:bg-gray-800",
        muted:
          "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800",
        subtle:
          "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800",

        // Pill variants (consolidated from UMPillButton)
        pill:
          "rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800",
        "pill-primary":
          "rounded-full border border-black bg-black text-white hover:bg-gray-900 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200",
        "pill-active":
          "rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-medium",

        // Danger variants (consolidated from TripButton)
        danger:
          "bg-red-600 text-white hover:bg-red-700 rounded-full",
        "danger-outline":
          "border border-gray-200 dark:border-gray-700 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full",

        // Link variant
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-11 rounded-2xl gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-7 has-[>svg]:px-5",
        xs: "h-11 rounded-xl px-3 text-xs gap-1.5 has-[>svg]:px-2.5",
        // Pill size (from UMPillButton: h-[44px] = h-11, px-5, rounded-3xl)
        pill: "h-11 px-5 rounded-full",
        // Icon sizes
        icon: "size-11",
        "icon-sm": "size-11",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
