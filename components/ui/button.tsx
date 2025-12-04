import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
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
        pill:
          "rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-medium text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-11 rounded-2xl gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-12 rounded-2xl px-7 has-[>svg]:px-5",
        xs: "h-11 rounded-xl px-3 text-xs gap-1.5 has-[>svg]:px-2.5",
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

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a loading spinner and disables the button */
  loading?: boolean;
  /** Text to show while loading (optional, defaults to hiding children) */
  loadingText?: string;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {loadingText ? (
            <span>{loadingText}</span>
          ) : (
            <span className="sr-only">Loading</span>
          )}
          {!loadingText && children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
