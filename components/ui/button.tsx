import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/15 dark:bg-[#1A1C1F] dark:text-white/90 dark:hover:bg-white/5",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 rounded-xl",
        outline:
          "border border-neutral-200 dark:border-white/15 bg-transparent hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-800 dark:text-white/90",
        secondary:
          "border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 dark:border-white/15 dark:bg-[#1A1C1F] dark:text-white/90 dark:hover:bg-white/5",
        ghost:
          "hover:bg-neutral-50 dark:hover:bg-white/5",
        muted:
          "border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#1A1C1F] text-neutral-800 dark:text-white/90 hover:bg-neutral-50 dark:hover:bg-white/5",
        subtle:
          "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white/90 hover:bg-neutral-50 dark:hover:bg-white/5",
        pill:
          "rounded-full border border-neutral-200 dark:border-white/15 bg-white dark:bg-[#1A1C1F] text-xs font-medium text-neutral-800 dark:text-white/90 hover:bg-neutral-50 dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 rounded-2xl gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-11 rounded-2xl px-7 has-[>svg]:px-5",
        xs: "h-8 rounded-xl px-3 text-xs gap-1.5 has-[>svg]:px-2.5",
        icon: "size-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
