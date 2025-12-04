import { useDrawerStore } from "@/lib/stores/drawer-store";

/**
 * Drawer helper functions for imperative drawer control.
 * These functions can be called from anywhere (event handlers, effects, etc.)
 * without needing to use the hook directly.
 */

// Trip-related drawers
export function openTripList() {
  useDrawerStore.getState().openDrawer("trip-list");
}

export function openTripOverview(trip: unknown) {
  useDrawerStore.getState().openDrawer("trip-overview", { trip });
}

export function openPlaceSelector(day: unknown, trip: unknown, index: number, mealType?: string) {
  useDrawerStore
    .getState()
    .openDrawer("place-selector", { day, trip, index, mealType });
}

export function openAddHotel(day: unknown, trip: unknown, index: number) {
  useDrawerStore
    .getState()
    .openDrawer("add-hotel", { day, trip, index });
}

export function openAISuggestions(day: unknown, trip: unknown, index: number) {
  useDrawerStore
    .getState()
    .openDrawer("ai-suggestions", { day, trip, index });
}

// Account-related drawers
export function openAccount() {
  useDrawerStore.getState().openDrawer("account");
}

export function openLogin() {
  useDrawerStore.getState().openDrawer("login");
}

export function openSavedPlaces(parent?: string) {
  if (parent) {
    useDrawerStore.getState().openWithParent("saved-places", parent);
  } else {
    useDrawerStore.getState().openDrawer("saved-places");
  }
}

export function openVisitedPlaces(parent?: string) {
  if (parent) {
    useDrawerStore.getState().openWithParent("visited-places", parent);
  } else {
    useDrawerStore.getState().openDrawer("visited-places");
  }
}

export function openTrips(parent?: string) {
  if (parent) {
    useDrawerStore.getState().openWithParent("trips", parent);
  } else {
    useDrawerStore.getState().openDrawer("trips");
  }
}

// Navigation
export function closeDrawer() {
  useDrawerStore.getState().closeDrawer();
}

export function goBack() {
  useDrawerStore.getState().goBack();
}

// Generic open
export function openDrawer(type: string, props?: Record<string, unknown>) {
  useDrawerStore.getState().openDrawer(type, props);
}

export function openDrawerWithParent(type: string, parent: string, props?: Record<string, unknown>) {
  useDrawerStore.getState().openWithParent(type, parent, props);
}

