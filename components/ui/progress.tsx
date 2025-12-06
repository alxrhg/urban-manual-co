"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Show indeterminate loading animation */
  indeterminate?: boolean
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, size = "default", indeterminate = false, ...props }, ref) => {
  const sizeClasses = {
    sm: "h-1",
    default: "h-2",
    lg: "h-3",
  }

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full flex-1 rounded-full bg-black dark:bg-white",
          // Spring-like transition for smooth value changes
          "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          // Indeterminate animation
          indeterminate && "animate-progress-indeterminate w-1/3"
        )}
        style={
          indeterminate
            ? undefined
            : { transform: `translateX(-${100 - (value || 0)}%)` }
        }
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

/**
 * Circular progress variant
 */
interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  size?: "sm" | "default" | "lg"
  strokeWidth?: number
}

function CircularProgress({
  value = 0,
  size = "default",
  strokeWidth,
  className,
  ...props
}: CircularProgressProps) {
  const sizeValues = {
    sm: { size: 24, stroke: 2.5 },
    default: { size: 40, stroke: 3 },
    lg: { size: 64, stroke: 4 },
  }

  const { size: svgSize, stroke: defaultStroke } = sizeValues[size]
  const finalStroke = strokeWidth ?? defaultStroke
  const radius = (svgSize - finalStroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative", className)}
      style={{ width: svgSize, height: svgSize }}
      {...props}
    >
      <svg
        className="-rotate-90"
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        {/* Background circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={finalStroke}
          className="text-gray-100 dark:text-gray-800"
        />
        {/* Progress circle */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={finalStroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-black dark:text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        />
      </svg>
    </div>
  )
}

export { Progress, CircularProgress }
