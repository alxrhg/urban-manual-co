import { create } from "zustand";

/**
 * Legacy Drawer types (migrated from DrawerContext)
 */
export type DrawerType =
  | 'account'
  | 'login'
  | 'login-modal'
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
  // New types
  | 'account-new'
  | 'trip-list'
  | 'trip-settings'
  | 'place-selector'
  | 'trip-add-hotel'
  | 'add-flight'
  | 'trip-ai'
  | 'poi-editor' // Added poi-editor for admin functionality
  | null;

/**
 * Drawer Store - Unified state for drawers/panels
 * Replaces both DrawerContext and legacy useDrawerStore
 *
 * displayMode:
 * - "overlay": Traditional slide-in drawer (mobile-friendly)
 * - "inline": Split-pane side panel (desktop-friendly)
 */
interface DrawerState {
  // Current active drawer
  drawer: DrawerType;
  isOpen: boolean;
  props: Record<string, any>;
  displayMode: "overlay" | "inline";

  // History management
  historyStack: { type: DrawerType; props: Record<string, any> }[];

  // Actions
  openDrawer: (drawer: DrawerType, props?: any) => void;
  openInline: (drawer: DrawerType, props?: any) => void;
  closeDrawer: () => void;
  toggleDrawer: (drawer: DrawerType) => void;
  goBack: () => void;
  setDisplayMode: (mode: "overlay" | "inline") => void;

  // Legacy compatibility helpers (to minimize refactor friction)
  open: boolean;
  type: DrawerType; // Alias for drawer
  mode: "side" | "fullscreen";
  openSide: (type: DrawerType, props?: Record<string, any>) => void;
  openFullscreen: (type: DrawerType, props?: Record<string, any>) => void;
  isDrawerOpen: (type: DrawerType) => boolean;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  drawer: null,
  isOpen: false,
  props: {},
  displayMode: "inline", // Default to inline for desktop
  historyStack: [],

  openDrawer: (drawer, props = {}) => {
    const current = get();
    // Push current to history if it's different and open
    let newHistory = current.historyStack;
    if (current.isOpen && current.drawer && current.drawer !== drawer) {
       newHistory = [...current.historyStack, { type: current.drawer, props: current.props }];
    }

    set({
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "overlay",
      historyStack: newHistory
    });
  },

  openInline: (drawer, props = {}) => {
    const current = get();
    let newHistory = current.historyStack;
    if (current.isOpen && current.drawer && current.drawer !== drawer) {
       newHistory = [...current.historyStack, { type: current.drawer, props: current.props }];
    }

    set({
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "inline",
      historyStack: newHistory
    });
  },

  closeDrawer: () =>
    set({
      drawer: null,
      isOpen: false,
      props: {},
      open: false,
      type: null,
      historyStack: [] // Clearing history on full close matches typical modal behavior
    }),

  toggleDrawer: (drawer) => {
    const current = get();
    if (current.isOpen && current.drawer === drawer) {
      current.closeDrawer();
    } else {
      current.openDrawer(drawer);
    }
  },

  goBack: () => {
    const { historyStack } = get();
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      const newHistory = historyStack.slice(0, -1);
      set({
        drawer: prev.type,
        type: prev.type,
        props: prev.props,
        isOpen: true,
        open: true,
        historyStack: newHistory
      });
    } else {
      get().closeDrawer();
    }
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),

  // Legacy support
  open: false,
  type: null,
  mode: "side",
  openSide: (type, props = {}) => {
    // console.log('[DrawerStore] openSide called:', { type, props });
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    get().openDrawer(type, props); // Reuse logic but override display mode if needed
    set({ displayMode: isDesktop ? "inline" : "overlay", mode: "side" });
  },
  openFullscreen: (type, props = {}) => {
    get().openDrawer(type, props);
    set({ mode: "fullscreen", displayMode: "overlay" });
  },

  isDrawerOpen: (type) => {
    return get().drawer === type && get().isOpen;
  }
}));
