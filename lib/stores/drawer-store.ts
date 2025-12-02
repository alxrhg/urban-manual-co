import { create } from "zustand";

/**
 * Drawer Store - Unified state for drawers/panels
 *
 * displayMode:
 * - "overlay": Traditional slide-in drawer (mobile-friendly)
 * - "inline": Split-pane side panel (desktop-friendly)
 */
interface DrawerState {
  drawer: string | null;
  isOpen: boolean;
  props: any;
  displayMode: "overlay" | "inline";

  // Actions
  openDrawer: (drawer: string, props?: any) => void;
  openInline: (drawer: string, props?: any) => void;
  closeDrawer: () => void;
  setDisplayMode: (mode: "overlay" | "inline") => void;

  // Legacy support - keeping for backward compatibility
  open: boolean;
  type: string | null;
  mode: "side" | "fullscreen";
  openSide: (type: string, props?: Record<string, any>) => void;
  openFullscreen: (type: string, props?: Record<string, any>) => void;
}

export const useDrawerStore = create<DrawerState>((set) => ({
  drawer: null,
  isOpen: false,
  props: {},
  displayMode: "inline", // Default to inline for desktop

  openDrawer: (drawer, props = {}) =>
    set({ drawer, isOpen: true, props, open: true, type: drawer, displayMode: "overlay" }),

  openInline: (drawer, props = {}) =>
    set({ drawer, isOpen: true, props, open: true, type: drawer, displayMode: "inline" }),

  closeDrawer: () =>
    set({ drawer: null, isOpen: false, props: {}, open: false, type: null }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  // Legacy support
  open: false,
  type: null,
  mode: "side",
  openSide: (type: string, props = {}) => {
    console.log('[DrawerStore] openSide called:', { type, props });
    // Use inline mode on desktop, overlay on mobile
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    set({
      open: true,
      type,
      props,
      mode: "side",
      drawer: type,
      isOpen: true,
      displayMode: isDesktop ? "inline" : "overlay"
    });
  },
  openFullscreen: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "fullscreen", drawer: type, isOpen: true, displayMode: "overlay" }),
}));
