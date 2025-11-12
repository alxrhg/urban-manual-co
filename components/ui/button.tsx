import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-sm whitespace-nowrap rounded-pill text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[var(--text-base)] shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--text-primary)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-primary)] aria-invalid:ring-[color:color-mix(in_srgb,var(--error)_35%,transparent)] aria-invalid:border-[color:var(--error)] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--text-primary)] text-[color:var(--bg-primary)] shadow-sm hover:shadow-md hover:opacity-90",
        destructive:
          "bg-[color:var(--error)] text-[color:var(--bg-primary)] shadow-sm hover:shadow-md hover:opacity-90 focus-visible:ring-[color:color-mix(in_srgb,var(--error)_45%,transparent)]",
        outline:
          "border border-[color:var(--border)] bg-transparent text-text-primary shadow-sm hover:bg-[color:color-mix(in_srgb,var(--bg-secondary)_80%,transparent)] hover:shadow-md",
        secondary:
          "bg-surface-secondary text-text-primary shadow-sm hover:shadow-md hover:opacity-90",
        ghost:
          "hover:bg-[color:color-mix(in_srgb,var(--bg-secondary)_65%,transparent)] hover:scale-[1.02]",
        link: "text-text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-[calc(var(--space-2xl)-var(--space-sm))] px-lg py-sm has-[>svg]:px-md",
        sm: "h-[calc(var(--space-xl)+var(--space-xs))] gap-[var(--space-xs)] rounded-pill px-md has-[>svg]:px-sm",
        lg: "h-[calc(var(--space-2xl)-var(--space-xs))] px-xl has-[>svg]:px-lg",
        icon: "size-[calc(var(--space-2xl)-var(--space-sm))]",
        "icon-sm": "size-[calc(var(--space-xl)+var(--space-xs))]",
        "icon-lg": "size-[calc(var(--space-2xl)-var(--space-xs))]",
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
