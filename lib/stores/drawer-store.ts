import { create } from "zustand";

/**
 * Drawer Store - Unified state for drawers/panels
 *
 * displayMode:
 * - "overlay": Traditional slide-in drawer (mobile-friendly)
 * - "inline": Split-pane side panel (desktop-friendly)
 *
 * This store now consolidates all drawer functionality including:
 * - History stack for back navigation
 * - Parent drawer tracking
 * - Drawer data passing
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
  | 'trip-list'
  | 'trip-overview'
  | 'trip-overview-quick'
  | 'trip-settings'
  | 'place-selector'
  | 'add-hotel'
  | 'add-flight'
  | 'ai-suggestions'
  | 'event-detail'
  | 'map'
  | 'create-trip'
  | string
  | null;

interface DrawerState {
  // Core state
  drawer: DrawerType;
  isOpen: boolean;
  props: Record<string, unknown>;
  displayMode: "overlay" | "inline";

  // Navigation state (migrated from DrawerContext)
  parentDrawer: DrawerType;
  historyStack: DrawerType[];
  drawerData: Record<string, unknown>;

  // Actions
  openDrawer: (drawer: string, props?: Record<string, unknown>) => void;
  openInline: (drawer: string, props?: Record<string, unknown>) => void;
  openWithParent: (drawer: string, parent: string, props?: Record<string, unknown>) => void;
  closeDrawer: () => void;
  goBack: () => void;
  setDisplayMode: (mode: "overlay" | "inline") => void;

  // Data helpers
  getDrawerData: <T = unknown>(key: string) => T | undefined;
  setDrawerData: (key: string, value: unknown) => void;
  clearDrawerData: () => void;

  // Computed helpers
  isDrawerOpen: (type: string) => boolean;
  canGoBack: () => boolean;

  // Legacy support - keeping for backward compatibility
  open: boolean;
  type: string | null;
  mode: "side" | "fullscreen";
  openSide: (type: string, props?: Record<string, unknown>) => void;
  openFullscreen: (type: string, props?: Record<string, unknown>) => void;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  // Core state
  drawer: null,
  isOpen: false,
  props: {},
  displayMode: "inline", // Default to inline for desktop

  // Navigation state
  parentDrawer: null,
  historyStack: [],
  drawerData: {},

  openDrawer: (drawer, props = {}) => {
    const current = get().drawer;
    set((state) => ({
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "overlay",
      // Add current drawer to history if one is open
      historyStack: current ? [...state.historyStack, current] : state.historyStack,
      drawerData: { ...state.drawerData, ...props },
    }));
  },

  openInline: (drawer, props = {}) => {
    const current = get().drawer;
    set((state) => ({
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "inline",
      historyStack: current ? [...state.historyStack, current] : state.historyStack,
      drawerData: { ...state.drawerData, ...props },
    }));
  },

  openWithParent: (drawer, parent, props = {}) => {
    set((state) => ({
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "overlay",
      parentDrawer: parent,
      drawerData: { ...state.drawerData, ...props },
    }));
  },

  closeDrawer: () =>
    set({
      drawer: null,
      isOpen: false,
      props: {},
      open: false,
      type: null,
      parentDrawer: null,
      historyStack: [],
    }),

  goBack: () => {
    const { historyStack, parentDrawer } = get();
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      set({
        drawer: prev,
        type: prev,
        historyStack: historyStack.slice(0, -1),
      });
    } else if (parentDrawer) {
      set({
        drawer: parentDrawer,
        type: parentDrawer,
        parentDrawer: null,
      });
    } else {
      get().closeDrawer();
    }
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),

  // Data helpers
  getDrawerData: <T = unknown>(key: string): T | undefined => {
    return get().drawerData[key] as T | undefined;
  },

  setDrawerData: (key: string, value: unknown) => {
    set((state) => ({
      drawerData: { ...state.drawerData, [key]: value },
    }));
  },

  clearDrawerData: () => set({ drawerData: {} }),

  // Computed helpers
  isDrawerOpen: (type: string) => get().drawer === type,
  canGoBack: () => get().historyStack.length > 0 || get().parentDrawer !== null,

  // Legacy support
  open: false,
  type: null,
  mode: "side",
  openSide: (type: string, props = {}) => {
    // Use inline mode on desktop, overlay on mobile
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const current = get().drawer;
    set((state) => ({
      open: true,
      type,
      props,
      mode: "side",
      drawer: type,
      isOpen: true,
      displayMode: isDesktop ? "inline" : "overlay",
      historyStack: current ? [...state.historyStack, current] : state.historyStack,
    }));
  },
  openFullscreen: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "fullscreen", drawer: type, isOpen: true, displayMode: "overlay" }),
}));
