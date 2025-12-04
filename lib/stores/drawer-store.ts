import { create } from "zustand";

/**
 * Drawer Store - Unified state for drawers/panels with stacking support
 *
 * displayMode:
 * - "overlay": Traditional slide-in drawer (mobile-friendly)
 * - "inline": Split-pane side panel (desktop-friendly)
 *
 * Drawer stacking allows opening multiple drawers, where new drawers
 * stack on top of previous ones. Users can dismiss the top drawer
 * to return to the previous drawer.
 */

interface DrawerItem {
  id: string;
  type: string;
  props: any;
  displayMode: "overlay" | "inline";
}

interface DrawerState {
  // Stack of all open drawers (bottom to top)
  drawerStack: DrawerItem[];

  // Current/top drawer (derived for convenience)
  drawer: string | null;
  isOpen: boolean;
  props: any;
  displayMode: "overlay" | "inline";

  // Actions - stacking-aware
  openDrawer: (drawer: string, props?: any) => void;
  openInline: (drawer: string, props?: any) => void;
  pushDrawer: (drawer: string, props?: any, displayMode?: "overlay" | "inline") => void;
  popDrawer: () => void;
  closeDrawer: () => void;
  closeAllDrawers: () => void;
  setDisplayMode: (mode: "overlay" | "inline") => void;

  // Stack info
  stackDepth: () => number;
  hasParentDrawer: () => boolean;

  // Legacy support - keeping for backward compatibility
  open: boolean;
  type: string | null;
  mode: "side" | "fullscreen";
  openSide: (type: string, props?: Record<string, any>) => void;
  openFullscreen: (type: string, props?: Record<string, any>) => void;
}

// Generate unique ID for drawer instances
let drawerId = 0;
const generateId = () => `drawer-${++drawerId}`;

export const useDrawerStore = create<DrawerState>((set, get) => ({
  drawerStack: [],
  drawer: null,
  isOpen: false,
  props: {},
  displayMode: "inline",

  // Open a drawer (replaces current stack - use pushDrawer for stacking)
  openDrawer: (drawer, props = {}) => {
    const newItem: DrawerItem = {
      id: generateId(),
      type: drawer,
      props,
      displayMode: "overlay",
    };
    set({
      drawerStack: [newItem],
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "overlay",
    });
  },

  openInline: (drawer, props = {}) => {
    const newItem: DrawerItem = {
      id: generateId(),
      type: drawer,
      props,
      displayMode: "inline",
    };
    set({
      drawerStack: [newItem],
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode: "inline",
    });
  },

  // Push a drawer onto the stack (stacking behavior)
  pushDrawer: (drawer, props = {}, displayMode = "overlay") => {
    const state = get();
    const newItem: DrawerItem = {
      id: generateId(),
      type: drawer,
      props,
      displayMode,
    };
    const newStack = [...state.drawerStack, newItem];
    set({
      drawerStack: newStack,
      drawer,
      isOpen: true,
      props,
      open: true,
      type: drawer,
      displayMode,
    });
  },

  // Pop the top drawer off the stack (go back)
  popDrawer: () => {
    const state = get();
    if (state.drawerStack.length <= 1) {
      // If only one or no drawer, close all
      set({
        drawerStack: [],
        drawer: null,
        isOpen: false,
        props: {},
        open: false,
        type: null,
      });
      return;
    }

    // Remove top drawer, reveal previous
    const newStack = state.drawerStack.slice(0, -1);
    const previousDrawer = newStack[newStack.length - 1];
    set({
      drawerStack: newStack,
      drawer: previousDrawer.type,
      isOpen: true,
      props: previousDrawer.props,
      open: true,
      type: previousDrawer.type,
      displayMode: previousDrawer.displayMode,
    });
  },

  // Close just the top drawer (alias for popDrawer)
  closeDrawer: () => {
    get().popDrawer();
  },

  // Close all drawers completely
  closeAllDrawers: () => {
    set({
      drawerStack: [],
      drawer: null,
      isOpen: false,
      props: {},
      open: false,
      type: null,
    });
  },

  setDisplayMode: (mode) => set({ displayMode: mode }),

  // Stack info helpers
  stackDepth: () => get().drawerStack.length,
  hasParentDrawer: () => get().drawerStack.length > 1,

  // Legacy support
  open: false,
  type: null,
  mode: "side",
  openSide: (type: string, props = {}) => {
    console.log("[DrawerStore] openSide called:", { type, props });
    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;
    const displayMode = isDesktop ? "inline" : "overlay";
    const newItem: DrawerItem = {
      id: generateId(),
      type,
      props,
      displayMode,
    };
    set({
      drawerStack: [newItem],
      open: true,
      type,
      props,
      mode: "side",
      drawer: type,
      isOpen: true,
      displayMode,
    });
  },
  openFullscreen: (type: string, props = {}) => {
    const newItem: DrawerItem = {
      id: generateId(),
      type,
      props,
      displayMode: "overlay",
    };
    set({
      drawerStack: [newItem],
      open: true,
      type,
      props,
      mode: "fullscreen",
      drawer: type,
      isOpen: true,
      displayMode: "overlay",
    });
  },
}));
