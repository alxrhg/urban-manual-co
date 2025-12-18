/**
 * Drawer Navigation Hook
 *
 * Enhanced drawer navigation with history stack support.
 * Works with DrawerContext to provide better navigation experience.
 */

'use client';

import { useCallback, useState } from 'react';
import { useDrawerStore, type DrawerType } from '@/lib/stores/drawer-store';

interface DrawerHistoryEntry {
  type: DrawerType;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface UseDrawerNavigationOptions {
  /** Maximum history stack size */
  maxHistorySize?: number;
}

/**
 * Hook for enhanced drawer navigation with history
 */
export function useDrawerNavigation(
  options: UseDrawerNavigationOptions = {}
) {
  const { maxHistorySize = 10 } = options;
  const drawerStore = useDrawerStore();

  // Map zustand store to legacy drawer shape expected by this hook
  // This allows us to keep the hook's API mostly compatible
  const drawer = {
    activeDrawer: drawerStore.drawer,
    openDrawer: drawerStore.openDrawer,
    closeDrawer: drawerStore.closeDrawer,
    isDrawerOpen: drawerStore.isDrawerOpen,
  };

  const [history, setHistory] = useState<DrawerHistoryEntry[]>([]);
  const [drawerData, setDrawerData] = useState<Record<string, unknown>>({});

  /**
   * Navigate to a drawer with optional data
   */
  const navigateTo = useCallback(
    (type: DrawerType, data?: Record<string, unknown>) => {
      // Add current drawer to history if one is open
      if (drawer.activeDrawer) {
        setHistory((prev) => {
          const newHistory = [
            ...prev,
            {
              type: drawer.activeDrawer!,
              data: drawerData,
              timestamp: Date.now(),
            },
          ];
          // Trim to max size
          return newHistory.slice(-maxHistorySize);
        });
      }

      // Set new drawer data
      if (data) {
        setDrawerData(data);
      }

      // Open the drawer
      drawer.openDrawer(type, data);
    },
    [drawer, drawerData, maxHistorySize]
  );

  /**
   * Go back to previous drawer in history
   */
  const goBack = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setDrawerData(prev.data || {});
      drawer.openDrawer(prev.type, prev.data);
    } else {
      drawer.closeDrawer();
      setDrawerData({});
    }
  }, [history, drawer]);

  /**
   * Close drawer and clear history
   */
  const close = useCallback(() => {
    drawer.closeDrawer();
    setHistory([]);
    setDrawerData({});
  }, [drawer]);

  /**
   * Replace current drawer without adding to history
   */
  const replace = useCallback(
    (type: DrawerType, data?: Record<string, unknown>) => {
      if (data) {
        setDrawerData(data);
      }
      drawer.openDrawer(type, data);
    },
    [drawer]
  );

  /**
   * Get specific data from drawer data
   */
  const getData = useCallback(
    <T>(key: string, defaultValue?: T): T | undefined => {
      return (drawerData[key] as T) ?? defaultValue;
    },
    [drawerData]
  );

  /**
   * Update drawer data without navigating
   */
  const setData = useCallback(
    (key: string, value: unknown) => {
      setDrawerData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return {
    // Direct access to underlying context (spread first so custom props override)
    ...drawer,

    // Navigation (override drawer methods with enhanced versions)
    navigateTo,
    goBack,
    close,
    replace,

    // State
    isOpen: drawer.activeDrawer !== null,
    canGoBack: history.length > 0,
    historyLength: history.length,

    // Data
    data: drawerData,
    getData,
    setData,
  };
}

/**
 * Type-safe drawer data for common drawer types
 */
export interface DrawerDataTypes {
  destination: {
    slug: string;
    name?: string;
  };
  'trip-view': {
    tripId: string;
    isEditing?: boolean;
  };
  poi: {
    poiId: string;
    mode: 'view' | 'edit';
  };
}

/**
 * Type-safe navigation helper
 */
export function createDrawerNavigator<T extends keyof DrawerDataTypes>() {
  return {
    open: (
      drawer: ReturnType<typeof useDrawerNavigation>,
      type: T,
      data: DrawerDataTypes[T]
    ) => {
      drawer.navigateTo(type as DrawerType, data);
    },
    getData: (
      drawer: ReturnType<typeof useDrawerNavigation>,
      type: T
    ): DrawerDataTypes[T] | undefined => {
      if (drawer.activeDrawer !== type) return undefined;
      return drawer.data as DrawerDataTypes[T];
    },
  };
}
