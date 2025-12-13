import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  /** Enable premium hover lift effect */
  hover?: boolean;
  /** Enable glass reflection animation on hover */
  glassReflection?: boolean;
};

function Card({ className, children, onClick, hover = false, glassReflection = false }: CardProps) {
  const baseClasses = cn(
    "rounded-2xl border border-gray-200 dark:border-gray-800",
    "bg-white dark:bg-gray-900",
    "text-gray-900 dark:text-white",
    "overflow-hidden",
    // Premium micro-interactions
    hover && "card-premium-lift hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700",
    glassReflection && "card-glass-reflection",
    onClick && "cursor-pointer text-left w-full active:scale-[0.98] duration-[200ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
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
