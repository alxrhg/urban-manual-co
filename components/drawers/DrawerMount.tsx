"use client";

import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useDrawerStyle } from "@/components/ui/UseDrawerStyle";
import { Drawer } from "@/components/ui/Drawer";

// DRAWERS (to be implemented in Parts 3–8)
import TripListDrawer from "@/components/drawers/TripListDrawer";
import TripOverviewDrawer from "@/components/trip-drawers/TripOverviewDrawer";
import TripDayDrawer from "@/components/trip-drawers/TripDayDrawer";
import PlaceSelectorDrawer from "@/components/drawers/PlaceSelectorDrawer";
import TripAddHotelDrawer from "@/components/trip-drawers/TripAddHotelDrawer";
import TripAISuggestionsDrawer from "@/components/trip-drawers/TripAISuggestionsDrawer";

/**
 * DrawerMount:
 * This component listens to `useDrawerStore()` and renders the drawer that is active.
 */
export default function DrawerMount() {
  const { drawer, isOpen, closeDrawer, props } = useDrawerStore();
  const drawerStyle = useDrawerStyle(); // "glassy" (dark) OR "solid" (light)

  return (
    <>
      {/* TRIP LIST */}
      {drawer === "trip-list" && (
        <TripListDrawer isOpen={isOpen} onClose={closeDrawer} {...props} />
      )}

      {/* TRIP OVERVIEW */}
      {drawer === "trip-overview" && (
        <TripOverviewDrawer 
          isOpen={isOpen} 
          onClose={closeDrawer} 
          trip={props?.trip ?? null}
          {...props} 
        />
      )}

      {/* DAY EDITOR (FULLSCREEN) */}
      {drawer === "trip-day-editor" && (
        <TripDayDrawer 
          isOpen={isOpen} 
          onClose={closeDrawer} 
          day={props?.day ?? null}
          {...props} 
        />
      )}

      {/* PLACE SELECTOR */}
      {drawer === "place-selector" && (
        <PlaceSelectorDrawer 
          isOpen={isOpen} 
          onClose={closeDrawer} 
          day={props?.day ?? null}
          trip={props?.trip ?? null}
          mealType={props?.mealType}
          {...props} 
        />
      )}

      {/* ADD HOTEL */}
      {drawer === "add-hotel" && (
        <TripAddHotelDrawer 
          isOpen={isOpen} 
          onClose={closeDrawer} 
          day={props?.day ?? null}
          {...props} 
        />
      )}

      {/* AI SUGGESTIONS */}
      {drawer === "ai-suggestions" && (
        <TripAISuggestionsDrawer 
          isOpen={isOpen} 
          onClose={closeDrawer} 
          trip={props?.trip ?? null}
          suggestions={props?.suggestions ?? []}
          {...props} 
        />
      )}
    </>
  );
}

