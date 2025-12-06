'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface ChristmasThemeContextType {
  isChristmasMode: boolean;
  toggleChristmasMode: () => void;
  setChristmasMode: (enabled: boolean) => void;
}

const ChristmasThemeContext = createContext<ChristmasThemeContextType | undefined>(undefined);

const CHRISTMAS_STORAGE_KEY = 'urban-manual-christmas-mode';

export function ChristmasThemeProvider({ children }: { children: ReactNode }) {
  const [isChristmasMode, setIsChristmasMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(CHRISTMAS_STORAGE_KEY);
    if (stored === 'true') {
      setIsChristmasMode(true);
    }
    setIsHydrated(true);
  }, []);

  // Update localStorage and body class when mode changes
  useEffect(() => {
    if (!isHydrated) return;

    localStorage.setItem(CHRISTMAS_STORAGE_KEY, String(isChristmasMode));

    if (isChristmasMode) {
      document.documentElement.classList.add('christmas-mode');
      document.body.classList.add('christmas-mode');
    } else {
      document.documentElement.classList.remove('christmas-mode');
      document.body.classList.remove('christmas-mode');
    }
  }, [isChristmasMode, isHydrated]);

  const toggleChristmasMode = useCallback(() => {
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
        setChristmasMode
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
