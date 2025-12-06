import { cn } from "@/lib/utils"

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner */
  size?: "xs" | "sm" | "default" | "lg"
}

/**
 * Native-feeling spinner component
 * Uses a custom SVG with gradient for a polished look
 */
function Spinner({ className, size = "default", ...props }: SpinnerProps) {
  const sizeClasses = {
    xs: "size-3",
    sm: "size-4",
    default: "size-5",
    lg: "size-8",
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative", sizeClasses[size], className)}
      {...props}
    >
      <svg
        className="animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background track */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2.5"
          className="opacity-20"
        />
        {/* Animated arc */}
        <path
          d="M12 2C6.477 2 2 6.477 2 12"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="opacity-90"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Dots spinner variant - three bouncing dots
 */
function DotsSpinner({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex items-center gap-1", className)}
      {...props}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-current animate-bounce"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: "0.6s",
          }}
        />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * Pulse spinner variant - pulsing circle
 */
function PulseSpinner({ className, size = "default", ...props }: SpinnerProps) {
  const sizeClasses = {
    xs: "size-3",
    sm: "size-4",
    default: "size-5",
    lg: "size-8",
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative", sizeClasses[size], className)}
      {...props}
    >
      <span className="absolute inset-0 rounded-full bg-current opacity-30 animate-ping" />
      <span className="relative block size-full rounded-full bg-current opacity-80" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Spinner, DotsSpinner, PulseSpinner }
