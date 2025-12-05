'use client';

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * TripTabs - A styled tabs component for trip features
 * Built on Radix UI Tabs with design system styling
 */

function TripTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="trip-tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TripTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="trip-tabs-list"
      className={cn(
        "px-4 py-3 flex gap-2 text-xs border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide",
        className
      )}
      {...props}
    />
  );
}

interface TripTabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  icon?: React.ReactNode;
}

function TripTabsTrigger({
  className,
  icon,
  children,
  ...props
}: TripTabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="trip-tabs-trigger"
      className={cn(
        "transition-all whitespace-nowrap flex items-center gap-1.5",
        "px-3 py-2 rounded-full",
        "font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300",
        "data-[state=active]:text-gray-900 dark:data-[state=active]:text-white",
        "data-[state=active]:bg-gray-900 dark:data-[state=active]:bg-white",
        "data-[state=active]:text-white dark:data-[state=active]:text-gray-900",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </TabsPrimitive.Trigger>
  );
}

function TripTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="trip-tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { TripTabs, TripTabsList, TripTabsTrigger, TripTabsContent };
