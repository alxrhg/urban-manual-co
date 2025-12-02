"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl dark:group-[.toaster]:bg-gray-900 dark:group-[.toaster]:text-white dark:group-[.toaster]:border-gray-800",
          description: "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-black group-[.toast]:text-white group-[.toast]:rounded-full group-[.toast]:text-xs group-[.toast]:font-medium dark:group-[.toast]:bg-white dark:group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-gray-100 group-[.toast]:text-gray-500 group-[.toast]:rounded-full group-[.toast]:text-xs dark:group-[.toast]:bg-gray-800 dark:group-[.toast]:text-gray-400",
          success: "group-[.toaster]:border-green-500/20 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-900/20",
          error: "group-[.toaster]:border-red-500/20 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-900/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
