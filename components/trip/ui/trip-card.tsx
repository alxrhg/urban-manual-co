import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * TripCard - A styled card component for trip features
 * Built on top of design system patterns with shadcn/ui-style composability
 */

interface TripCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive";
}

function TripCard({ className, variant = "default", ...props }: TripCardProps) {
  return (
    <div
      data-slot="trip-card"
      className={cn(
        "border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900",
        variant === "interactive" && "hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer",
        className
      )}
      {...props}
    />
  );
}

function TripCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="trip-card-header"
      className={cn(
        "px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between",
        className
      )}
      {...props}
    />
  );
}

function TripCardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="trip-card-title"
      className={cn(
        "text-sm font-medium text-gray-900 dark:text-white",
        className
      )}
      {...props}
    />
  );
}

function TripCardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="trip-card-content"
      className={cn("p-4", className)}
      {...props}
    />
  );
}

function TripCardSection({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="trip-card-section"
      className={cn("space-y-4", className)}
      {...props}
    />
  );
}

function TripCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="trip-card-footer"
      className={cn(
        "pt-3 border-t border-gray-100 dark:border-gray-800",
        className
      )}
      {...props}
    />
  );
}

export {
  TripCard,
  TripCardHeader,
  TripCardTitle,
  TripCardContent,
  TripCardSection,
  TripCardFooter,
};
