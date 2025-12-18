'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useDrawerStore, DrawerType } from '@/lib/stores/drawer-store';

/**
 * Legacy Drawer types re-exported for compatibility
 */
export type { DrawerType };

/**
 * Drawer animation state for compatibility
 */
export type DrawerAnimationState = 'entering' | 'entered' | 'exiting' | 'exited';

/**
 * Drawer data for passing context between drawers
 */
export type DrawerData = Record<string, unknown>;

// Define the shape of the context
interface DrawerContextType {
  activeDrawer: DrawerType;
  parentDrawer: DrawerType;
  openDrawer: (type: DrawerType, parent?: DrawerType, data?: DrawerData) => void;
  toggleDrawer: (type: DrawerType) => void;
  closeDrawer: () => void;
  goBack: () => void;
  isDrawerOpen: (type: DrawerType) => boolean;
  canGoBack: boolean;
  getDrawerData: <T = unknown>(key: string) => T | undefined;
  setDrawerData: (key: string, value: unknown) => void;
  clearDrawerData: () => void;
  historyStack: DrawerType[];
  animationState: DrawerAnimationState;
  setAnimationState: (state: DrawerAnimationState) => void;
}

// Create context with default undefined
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * ADAPTER: DrawerProvider
 * This component is now a no-op wrapper or just provides the context
 * mapped to the zustand store.
 *
 * However, since useDrawer is a hook, we can just implement useDrawer
 * to return values from the store directly, bypassing the Provider requirement.
 *
 * But existing code expects <DrawerProvider> to exist in the tree if they use useContext directly.
 * Since we removed DrawerProvider from layout, any code using useContext(DrawerContext) will fail
 * if we don't handle it.
 *
 * The best approach here is to make `useDrawer` a standalone hook that doesn't rely on Context,
 * but matches the interface.
 */
export function DrawerProvider({ children }: { children: ReactNode }) {
  // We render children directly. The state is global in Zustand.
  return <>{children}</>;
}

/**
 * ADAPTER: useDrawer Hook
 * Maps the legacy Context API to the new Zustand store.
 */
export function useDrawer(): DrawerContextType {
  const store = useDrawerStore();

  return {
    activeDrawer: store.drawer,
    parentDrawer: null, // Deprecated concept in new store, mapped to null
    openDrawer: (type, parent, data) => store.openDrawer(type, data),
    toggleDrawer: (type) => store.toggleDrawer(type),
    closeDrawer: () => store.closeDrawer(),
    goBack: () => store.goBack(),
    isDrawerOpen: (type) => store.isDrawerOpen(type),
    canGoBack: store.historyStack.length > 0,

    // Data helpers - map to store props
    getDrawerData: <T>(key: string) => store.props[key] as T,
    setDrawerData: (key, value) => {
       // This is a bit hacky as we modify props in place, but okay for legacy compat
       store.props[key] = value;
    },
    clearDrawerData: () => { store.props = {} },

    // History stack mapping
    historyStack: store.historyStack.map(h => h.type),

    // Animation state - approximate mapping
    animationState: store.isOpen ? 'entered' : 'exited',
    setAnimationState: () => {}, // No-op
  };
}
