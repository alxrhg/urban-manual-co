import { useDrawerStore } from "@/lib/stores/drawer-store";

export function openTripList() {
  useDrawerStore.getState().openDrawer("trip-list");
}

export function openTripOverview(trip: any) {
  useDrawerStore.getState().openDrawer("trip-overview", { trip });
}

export function openPlaceSelector(day: any, trip: any, index: number, mealType?: string) {
  useDrawerStore
    .getState()
    .openDrawer("place-selector", { day, trip, index, mealType });
}

export function openAddHotel(day: any, trip: any, index: number) {
  useDrawerStore
    .getState()
    .openDrawer("add-hotel", { day, trip, index });
}

export function openAISuggestions(day: any, trip: any, index: number) {
  useDrawerStore
    .getState()
    .openDrawer("ai-suggestions", { day, trip, index });
}

export function closeDrawer() {
  useDrawerStore.getState().closeDrawer();
}

