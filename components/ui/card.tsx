import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  /** Enable hover lift effect (subtle shadow + translate) */
  hoverable?: boolean;
  /** Disable all transitions (for performance in lists) */
  noTransition?: boolean;
};

function Card({ className, children, onClick, hoverable, noTransition }: CardProps) {
  // Auto-enable hoverable when onClick is provided
  const shouldHover = hoverable ?? !!onClick;

  const baseClasses = cn(
    "rounded-2xl border border-gray-200 dark:border-gray-800",
    "bg-white dark:bg-gray-900",
    "text-gray-900 dark:text-white",
    "overflow-hidden",
    // Transitions
    !noTransition && "transition-all duration-200 ease-out",
    // Hover effects
    shouldHover && [
      "hover:-translate-y-0.5",
      "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
      "hover:border-gray-300 dark:hover:border-gray-700",
    ],
    // Active/press state
    onClick && [
      "cursor-pointer text-left w-full",
      "active:scale-[0.99] active:shadow-md",
    ],
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-slot="card"
        onClick={onClick}
        className={baseClasses}
      >
        {children}
      </button>
    );
  }

  return (
    <div data-slot="card" className={baseClasses}>
      {children}
    </div>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
