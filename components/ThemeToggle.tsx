"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-3 p-2">
        <Sun className="h-4 w-4 text-stone-400" />
        <div className="h-5 w-9 rounded-full bg-stone-200 dark:bg-stone-700" />
        <Moon className="h-4 w-4 text-stone-400" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Sun
        className={`h-4 w-4 transition-colors duration-200 ${
          isDark ? "text-stone-500" : "text-amber-500"
        }`}
      />
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        aria-label="Toggle dark mode"
      />
      <Moon
        className={`h-4 w-4 transition-colors duration-200 ${
          isDark ? "text-amber-400" : "text-stone-400"
        }`}
      />
    </div>
  );
}
