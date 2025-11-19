'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Drawer types that can be opened
 */
export type DrawerType =
  | 'account'
  | 'login'
  | 'chat'
  | 'destination'
  | 'trips'
  | 'saved-places'
  | 'visited-places'
  | 'settings'
  | 'poi'
  | 'trip-view'
  | 'map'
  | 'create-trip'
  | null;

interface DrawerContextType {
  /** Currently open drawer type, or null if no drawer is open */
  currentDrawer: DrawerType;
  /** Open a specific drawer (automatically closes any other open drawer) */
  openDrawer: (type: DrawerType) => void;
  /** Close the currently open drawer */
  closeDrawer: () => void;
  /** Check if a specific drawer is open */
  isDrawerOpen: (type: DrawerType) => boolean;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider manages global drawer state
 * Ensures only one drawer can be open at a time
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [openDrawer, setOpenDrawer] = useState<DrawerType>(null);

  const openDrawerHandler = useCallback((type: DrawerType) => {
    setOpenDrawer(type);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpenDrawer(null);
  }, []);

  const isDrawerOpen = useCallback(
    (type: DrawerType) => {
      return openDrawer === type;
    },
    [openDrawer]
  );

  return (
    <DrawerContext.Provider
      value={{
        currentDrawer: openDrawer,
        openDrawer: openDrawerHandler,
        closeDrawer,
        isDrawerOpen,
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

/**
 * Hook to access drawer context
 * @throws Error if used outside DrawerProvider
 */
export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}

