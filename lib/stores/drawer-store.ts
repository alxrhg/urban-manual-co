"use client";

import { create } from "zustand";

export type DrawerType =
  | "trip-overview"
  | "trip-day"
  | "trip-add-place"
  | "trip-add-hotel"
  | "trip-add-meal"
  | "trip-reorder"
  | "trip-ai-suggestions"
  | null;
export type DrawerProps = Record<string, unknown>;

interface DrawerStore {
  open: boolean;
  type: DrawerType;
  props: DrawerProps;
  openDrawer: (type: Exclude<DrawerType, null>, props?: DrawerProps) => void;
  closeDrawer: () => void;
}

export const useDrawerStore = create<DrawerStore>((set) => ({
  open: false,
  type: null,
  props: {},
  openDrawer: (type, props = {}) => set({ open: true, type, props }),
  closeDrawer: () => set({ open: false, type: null, props: {} }),
}));
