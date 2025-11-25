"use client";

import { useEffect, useState } from "react";

/**
 * Responsive helper hook that reports whether the viewport
 * is at least the provided `minWidth`. Defaults to desktop breakpoint (1280px).
 */
export function useIsDesktop(minWidth = 1280) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(`(min-width: ${minWidth}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    // Sync on mount in case SSR mismatch
    setIsDesktop(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [minWidth]);

  return isDesktop;
}

