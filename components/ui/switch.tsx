"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 shadow-sm transition-all outline-none cursor-pointer",
        "data-[state=checked]:bg-stone-900 dark:data-[state=checked]:bg-amber-100",
        "data-[state=unchecked]:bg-stone-200 dark:data-[state=unchecked]:bg-stone-700",
        "border-stone-300 dark:border-stone-600",
        "focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-5 rounded-full shadow-md transition-transform",
          "bg-white dark:bg-stone-200",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
