'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useDrawerStore, type DrawerType as StoreDrawerType } from '@/lib/stores/drawer-store';

/**
 * Drawer types that can be opened
 * @deprecated Use DrawerType from '@/lib/stores/drawer-store' instead
 */
export type DrawerType = StoreDrawerType;

/**
 * Drawer animation state for coordinating transitions
 */
export type DrawerAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

/**
 * Drawer data for passing context between drawers
 */
export type DrawerData = Record<string, unknown>;

interface DrawerContextType {
  /** Active drawer key, or null if no drawer is open */
  activeDrawer: DrawerType;
  /** Parent drawer to return to */
  parentDrawer: DrawerType;
  /** Open a specific drawer (automatically closes any other open drawer) */
  openDrawer: (type: DrawerType, parent?: DrawerType, data?: DrawerData) => void;
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
  /** Get drawer data */
  getDrawerData: <T = unknown>(key: string) => T | undefined;
  /** Set drawer data */
  setDrawerData: (key: string, value: unknown) => void;
  /** Clear all drawer data */
  clearDrawerData: () => void;
  /** History stack for drawer navigation */
  historyStack: DrawerType[];
  /** Animation state for the current drawer */
  animationState: DrawerAnimationState;
  /** Set animation state (for drawer components) */
  setAnimationState: (state: DrawerAnimationState) => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider manages global drawer state
 *
 * This provider now wraps the unified drawer-store for backward compatibility.
 * New code should use useDrawerStore directly from '@/lib/stores/drawer-store'.
 *
 * @deprecated Consider using useDrawerStore directly for new code
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  // Use the unified drawer store
  const store = useDrawerStore();

  // Local animation state (not in store yet)
  const [animationState, setAnimationState] = useState<DrawerAnimationState>('exited');

  // Map store state to context interface
  const activeDrawer = store.drawer;
  const parentDrawer = store.parentDrawer;
  const historyStack = store.historyStack;

  const openDrawer = useCallback(
    (type: DrawerType, parent?: DrawerType, data?: DrawerData) => {
      if (parent) {
        store.openWithParent(type as string, parent as string, data);
      } else {
        store.openDrawer(type as string, data);
      }
      setAnimationState('entering');
    },
    [store]
  );

  const toggleDrawer = useCallback(
    (type: DrawerType) => {
      if (store.drawer === type) {
        setAnimationState('exiting');
        setTimeout(() => {
          store.closeDrawer();
          setAnimationState('exited');
        }, 200);
      } else {
        store.openDrawer(type as string);
        setAnimationState('entering');
      }
    },
    [store]
  );

  const closeDrawer = useCallback(() => {
    setAnimationState('exiting');
    // Delay actual close to allow animation
    setTimeout(() => {
      store.closeDrawer();
      setAnimationState('exited');
    }, 200);
  }, [store]);

  const goBack = useCallback(() => {
    store.goBack();
  }, [store]);

  const isDrawerOpen = useCallback(
    (type: DrawerType) => {
      return store.drawer === type;
    },
    [store.drawer]
  );

  const getDrawerData = useCallback(<T = unknown>(key: string): T | undefined => {
    return store.getDrawerData<T>(key);
  }, [store]);

  const setDrawerData = useCallback((key: string, value: unknown) => {
    store.setDrawerData(key, value);
  }, [store]);

  const clearDrawerData = useCallback(() => {
    store.clearDrawerData();
  }, [store]);

  const canGoBack = store.canGoBack();

  const value = useMemo(() => ({
    activeDrawer,
    parentDrawer,
    openDrawer,
    toggleDrawer,
    closeDrawer,
    goBack,
    isDrawerOpen,
    canGoBack,
    getDrawerData,
    setDrawerData,
    clearDrawerData,
    historyStack,
    animationState,
    setAnimationState,
  }), [
    activeDrawer,
    parentDrawer,
    openDrawer,
    toggleDrawer,
    closeDrawer,
    goBack,
    isDrawerOpen,
    canGoBack,
    getDrawerData,
    setDrawerData,
    clearDrawerData,
    historyStack,
    animationState,
  ]);

  return (
    <DrawerContext.Provider value={value}>
      {children}
    </DrawerContext.Provider>
  );
}

/**
 * Hook to access drawer context
 *
 * This hook provides backward compatibility with the old DrawerContext API.
 * For new code, consider using useDrawerStore directly from '@/lib/stores/drawer-store'.
 *
 * @throws Error if used outside DrawerProvider
 */
export function useDrawer() {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}


