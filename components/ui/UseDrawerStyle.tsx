"use client";

import { useTheme } from "next-themes";

/**
 * Determines whether drawer should be "solid" or "glassy"
 * based on active theme.
 * 
 * Light Mode  → solid
 * Dark Mode   → glassy
 */
export function useDrawerStyle() {
  const { theme } = useTheme();
  return theme === "dark" ? "glassy" : "solid";
}

