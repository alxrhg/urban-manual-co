'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

interface ChristmasThemeContextType {
  isChristmasMode: boolean;
  toggleChristmasMode: () => void;
  setChristmasMode: (enabled: boolean) => void;
  snowAccumulation: number;
}

const ChristmasThemeContext = createContext<ChristmasThemeContextType | undefined>(undefined);

const CHRISTMAS_STORAGE_KEY = 'urban-manual-christmas-mode';

// Snow accumulation settings
const ACCUMULATION_DURATION = 60000; // 60 seconds to full accumulation
const ACCUMULATION_INTERVAL = 500; // Update every 500ms

export function ChristmasThemeProvider({ children }: { children: ReactNode }) {
  const [isChristmasMode, setIsChristmasMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [snowAccumulation, setSnowAccumulation] = useState(0);
  const accumulationStartTime = useRef<number | null>(null);

  // Check if current month is December and if it's Christmas Day
  const now = new Date();
  const isDecember = now.getMonth() === 11;
  const isChristmasDay = isDecember && now.getDate() === 25;

  // Load preference from localStorage on mount (only in December)
  useEffect(() => {
    if (isDecember) {
      const stored = localStorage.getItem(CHRISTMAS_STORAGE_KEY);

      if (isChristmasDay) {
        // On Christmas Day, default to ON unless user explicitly turned it off
        if (stored !== 'false') {
          setIsChristmasMode(true);
        }
      } else {
        // Other days in December: only enable if user explicitly turned it on
        if (stored === 'true') {
          setIsChristmasMode(true);
        }
      }
    }
    setIsHydrated(true);
  }, [isDecember, isChristmasDay]);

  // Update localStorage and body class when mode changes (only in December)
  useEffect(() => {
    if (!isHydrated) return;

    // Only apply Christmas mode in December
    const shouldApply = isChristmasMode && isDecember;

    if (isDecember) {
      localStorage.setItem(CHRISTMAS_STORAGE_KEY, String(isChristmasMode));
    }

    if (shouldApply) {
      document.documentElement.classList.add('christmas-mode');
      document.body.classList.add('christmas-mode');
    } else {
      document.documentElement.classList.remove('christmas-mode');
      document.body.classList.remove('christmas-mode');
    }
  }, [isChristmasMode, isHydrated, isDecember]);

  // Snow accumulation effect - gradually builds up over time
  useEffect(() => {
    if (!isHydrated) return;

    const shouldAccumulate = isChristmasMode && isDecember;

    if (shouldAccumulate) {
      // Start accumulation timer
      accumulationStartTime.current = Date.now();

      const updateAccumulation = () => {
        if (accumulationStartTime.current === null) return;

        const elapsed = Date.now() - accumulationStartTime.current;
        const progress = Math.min(elapsed / ACCUMULATION_DURATION, 1);

        // Use easeOutQuad for natural settling effect
        const eased = 1 - (1 - progress) * (1 - progress);

        setSnowAccumulation(eased);

        // Update CSS variable for the snow accumulation
        document.documentElement.style.setProperty('--snow-accumulation', String(eased));
      };

      // Initial update
      updateAccumulation();

      // Set interval to update accumulation
      const intervalId = setInterval(updateAccumulation, ACCUMULATION_INTERVAL);

      return () => {
        clearInterval(intervalId);
      };
    } else {
      // Reset accumulation when Christmas mode is disabled
      accumulationStartTime.current = null;
      setSnowAccumulation(0);
      document.documentElement.style.setProperty('--snow-accumulation', '0');
    }
  }, [isChristmasMode, isHydrated, isDecember]);

  const toggleChristmasMode = useCallback(() => {
    // Reset accumulation when toggling
    accumulationStartTime.current = null;
    setSnowAccumulation(0);
    setIsChristmasMode((prev: boolean) => !prev);
  }, []);

  const setChristmasMode = useCallback((enabled: boolean) => {
    setIsChristmasMode(enabled);
  }, []);

  return (
    <ChristmasThemeContext.Provider
      value={{
        isChristmasMode,
        toggleChristmasMode,
        setChristmasMode,
        snowAccumulation
      }}
    >
      {children}
    </ChristmasThemeContext.Provider>
  );
}

export function useChristmasTheme() {
  const context = useContext(ChristmasThemeContext);
  if (context === undefined) {
    throw new Error('useChristmasTheme must be used within a ChristmasThemeProvider');
  }
  return context;
}
