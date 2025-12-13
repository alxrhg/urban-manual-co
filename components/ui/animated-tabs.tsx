"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

/**
 * Animated Tabs - Premium tabs with sliding indicator
 * Uses framer-motion layoutId for smooth tab indicator transitions
 */

interface AnimatedTabsContextValue {
  activeTab: string;
  layoutId: string;
}

const AnimatedTabsContext = React.createContext<AnimatedTabsContextValue | null>(null);

function useAnimatedTabs() {
  const context = React.useContext(AnimatedTabsContext);
  if (!context) {
    throw new Error("useAnimatedTabs must be used within AnimatedTabs");
  }
  return context;
}

interface AnimatedTabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  /** Unique ID for the tabs group - used for framer-motion layoutId */
  layoutId?: string;
}

function AnimatedTabs({
  className,
  defaultValue,
  value,
  onValueChange,
  layoutId = "animated-tabs",
  ...props
}: AnimatedTabsProps) {
  const [activeTab, setActiveTab] = React.useState(value || defaultValue || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };

  return (
    <AnimatedTabsContext.Provider value={{ activeTab, layoutId }}>
      <TabsPrimitive.Root
        data-slot="animated-tabs"
        className={cn("flex flex-col gap-2", className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </AnimatedTabsContext.Provider>
  );
}

function AnimatedTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="animated-tabs-list"
      className={cn(
        "relative inline-flex h-10 w-fit items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400",
        className
      )}
      {...props}
    />
  );
}

interface AnimatedTabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  /** The value that identifies this tab */
  value: string;
}

function AnimatedTabsTrigger({
  className,
  value,
  children,
  ...props
}: AnimatedTabsTriggerProps) {
  const { activeTab, layoutId } = useAnimatedTabs();
  const isActive = activeTab === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="animated-tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors z-10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "duration-[200ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
        isActive
          ? "text-black dark:text-white"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
        className
      )}
      {...props}
    >
      {/* Sliding Background Indicator */}
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-white dark:bg-gray-900 shadow-sm"
          style={{ zIndex: -1 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
          }}
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  );
}

function AnimatedTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="animated-tabs-content"
      className={cn(
        "mt-2 focus-visible:outline-none",
        // Fade-in animation for content
        "animate-in fade-in-0 duration-200",
        className
      )}
      {...props}
    />
  );
}

/**
 * Underline Tabs - Alternative style with sliding underline
 */
function UnderlineTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="underline-tabs-list"
      className={cn(
        "relative inline-flex w-full items-center gap-1 border-b border-gray-200 dark:border-gray-800",
        className
      )}
      {...props}
    />
  );
}

function UnderlineTabsTrigger({
  className,
  value,
  children,
  ...props
}: AnimatedTabsTriggerProps) {
  const { activeTab, layoutId } = useAnimatedTabs();
  const isActive = activeTab === value;

  return (
    <TabsPrimitive.Trigger
      data-slot="underline-tabs-trigger"
      value={value}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "duration-[200ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)]",
        isActive
          ? "text-black dark:text-white"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
        className
      )}
      {...props}
    >
      {children}
      {/* Sliding Underline Indicator */}
      {isActive && (
        <motion.span
          layoutId={`${layoutId}-underline`}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
          }}
        />
      )}
    </TabsPrimitive.Trigger>
  );
}

export {
  AnimatedTabs,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  AnimatedTabsContent,
  UnderlineTabsList,
  UnderlineTabsTrigger,
};
