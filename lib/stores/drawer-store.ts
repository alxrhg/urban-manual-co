import { create } from "zustand";

interface DrawerStore {
  open: boolean;
  type: string | null;
  props: Record<string, any>;
  openDrawer: (type: string, props?: Record<string, any>) => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  type: null,
  props: {},
  openDrawer: (type: string, props = {}) =>
    set({ open: true, type, props }),
  closeDrawer: () =>
    set({ open: false, type: null, props: {} }),
}));

