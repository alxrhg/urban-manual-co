"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme if available, otherwise fall back to theme
  const currentTheme = resolvedTheme || theme || "dark";
  const isDark = currentTheme === "dark";

  const handleToggle = (checked: boolean) => {
    const newTheme = checked ? "dark" : "light";
    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <Sun className="h-4 w-4 text-gray-400" />
        <Switch checked={false} disabled />
        <Moon className="h-4 w-4 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Sun 
        className={`h-4 w-4 transition-colors ${
          isDark ? "text-gray-400" : "text-gray-900 dark:text-white"
        }`} 
      />
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label="Toggle theme"
      />
      <Moon 
        className={`h-4 w-4 transition-colors ${
          isDark ? "text-gray-900 dark:text-white" : "text-gray-400"
        }`} 
      />
    </div>
  );
}

