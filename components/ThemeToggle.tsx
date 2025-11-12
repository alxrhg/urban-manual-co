"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Laptop2, MoonStar, Sun, Check } from "lucide-react"

import { cn } from "@/lib/utils"

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: MoonStar },
  { value: "system", label: "System", icon: Laptop2 },
] as const

type ThemeOption = (typeof THEME_OPTIONS)[number]

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const activeTheme = mounted ? theme ?? "system" : "system"
  const activeOption: ThemeOption =
    THEME_OPTIONS.find(option => option.value === activeTheme) ?? THEME_OPTIONS[0]
  const ActiveIcon = activeOption.icon

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-white dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:ring-white dark:focus:ring-offset-gray-900",
            className,
          )}
          aria-label="Toggle theme"
        >
          <span className="sr-only">Toggle theme</span>
          {mounted ? (
            <ActiveIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-44 rounded-2xl border border-gray-200 bg-white/95 p-2 shadow-2xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
        >
          <DropdownMenu.Label className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Theme
          </DropdownMenu.Label>
          {THEME_OPTIONS.map(option => {
            const Icon = option.icon
            const isActive = option.value === activeTheme

            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => setTheme(option.value)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus:bg-gray-800",
                  isActive && "bg-gray-900 text-white dark:bg-gray-100/10 dark:text-white",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1">{option.label}</span>
                <span className="flex h-5 w-5 items-center justify-center">
                  {isActive && <Check className="h-4 w-4" aria-hidden="true" />}
                </span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
