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

type DrawerManagerAction =
  | { type: 'open'; drawer: DrawerType }
  | { type: 'toggle'; drawer: DrawerType }
  | { type: 'close' };

interface DrawerContextType {
  /** Active drawer key, or null if no drawer is open */
  activeDrawer: DrawerType;
  /** Open a specific drawer (automatically closes any other open drawer) */
  openDrawer: (type: DrawerType) => void;
  /** Toggle a specific drawer (opens it or closes if already active) */
  toggleDrawer: (type: DrawerType) => void;
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
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);

  const updateDrawer = useCallback((action: DrawerManagerAction) => {
    setActiveDrawer((current) => getNextDrawerState(current, action));
  }, []);

  const openDrawer = useCallback(
    (type: DrawerType) => updateDrawer({ type: 'open', drawer: type }),
    [updateDrawer]
  );

  const toggleDrawer = useCallback(
    (type: DrawerType) => updateDrawer({ type: 'toggle', drawer: type }),
    [updateDrawer]
  );

  const closeDrawer = useCallback(() => updateDrawer({ type: 'close' }), [updateDrawer]);

  const isDrawerOpen = useCallback(
    (type: DrawerType) => {
      return activeDrawer === type;
    },
    [activeDrawer]
  );

  return (
    <DrawerContext.Provider
      value={{
        activeDrawer,
        openDrawer,
        toggleDrawer,
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

export function getNextDrawerState(current: DrawerType, action: DrawerManagerAction): DrawerType {
  switch (action.type) {
    case 'open':
      return action.drawer;
    case 'toggle':
      return current === action.drawer ? null : action.drawer;
    case 'close':
      return null;
    default:
      return current;
  }
}

