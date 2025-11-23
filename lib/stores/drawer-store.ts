import { create } from "zustand";

/**
 * drawer: string | null
 * props: object to pass into the drawer
 * isOpen: boolean
 */
interface DrawerState {
  drawer: string | null;
  isOpen: boolean;
  props: any;
  openDrawer: (drawer: string, props?: any) => void;
  closeDrawer: () => void;
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
  openDrawer: (drawer, props = {}) =>
    set({ drawer, isOpen: true, props, open: true, type: drawer }),
  closeDrawer: () =>
    set({ drawer: null, isOpen: false, props: {}, open: false, type: null }),
  // Legacy support
  open: false,
  type: null,
  mode: "side",
  openSide: (type: string, props = {}) => {
    console.log('[DrawerStore] openSide called:', { type, props });
    set({ open: true, type, props, mode: "side", drawer: type, isOpen: true });
  },
  openFullscreen: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "fullscreen", drawer: type, isOpen: true }),
}));

