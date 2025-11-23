import { create } from "zustand";

interface DrawerStore {
  open: boolean;
  type: string | null;
  mode: "side" | "fullscreen";
  props: Record<string, any>;
  openDrawer: (type: string, props?: Record<string, any>) => void;
  openSide: (type: string, props?: Record<string, any>) => void;
  openFullscreen: (type: string, props?: Record<string, any>) => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  type: null,
  mode: "side",
  props: {},
  openDrawer: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "side" }),
  openSide: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "side" }),
  openFullscreen: (type: string, props = {}) =>
    set({ open: true, type, props, mode: "fullscreen" }),
  closeDrawer: () =>
    set({ open: false, type: null, props: {}, mode: "side" }),
}));

