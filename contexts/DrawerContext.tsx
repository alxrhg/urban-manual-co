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
  /** Active drawer key, or null if no drawer is open */
  activeDrawer: DrawerType;
  /** Parent drawer to return to */
  parentDrawer: DrawerType;
  /** Open a specific drawer (automatically closes any other open drawer) */
  openDrawer: (type: DrawerType, parent?: DrawerType) => void;
  /** Toggle a specific drawer (opens it or closes if already active) */
  toggleDrawer: (type: DrawerType) => void;
  /** Close the currently open drawer */
  closeDrawer: () => void;
  /** Go back to parent drawer */
  goBack: () => void;
  /** Check if a specific drawer is open */
  isDrawerOpen: (type: DrawerType) => boolean;
  /** Check if there's a parent drawer to go back to */
  canGoBack: boolean;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider manages global drawer state
 * Ensures only one drawer can be open at a time
 * Supports parent drawer for back navigation
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [parentDrawer, setParentDrawer] = useState<DrawerType>(null);

  const openDrawer = useCallback(
    (type: DrawerType, parent?: DrawerType) => {
      setParentDrawer(parent || null);
      setActiveDrawer(type);
    },
    []
  );

  const toggleDrawer = useCallback(
    (type: DrawerType) => {
      setActiveDrawer((current) => {
        if (current === type) {
          setParentDrawer(null);
          return null;
        }
        return type;
      });
    },
    []
  );

  const closeDrawer = useCallback(() => {
    setActiveDrawer(null);
    setParentDrawer(null);
  }, []);

  const goBack = useCallback(() => {
    if (parentDrawer) {
      setActiveDrawer(parentDrawer);
      setParentDrawer(null);
    } else {
      setActiveDrawer(null);
    }
  }, [parentDrawer]);

  const isDrawerOpen = useCallback(
    (type: DrawerType) => {
      return activeDrawer === type;
    },
    [activeDrawer]
  );

  const canGoBack = parentDrawer !== null;

  return (
    <DrawerContext.Provider
      value={{
        activeDrawer,
        parentDrawer,
        openDrawer,
        toggleDrawer,
        closeDrawer,
        goBack,
        isDrawerOpen,
        canGoBack,
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


