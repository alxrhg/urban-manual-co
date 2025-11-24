"use client";

import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useDrawerStyle } from "@/components/ui/UseDrawerStyle";
import { Drawer } from "@/components/ui/Drawer";

// DRAWERS (to be implemented in Parts 3–8)
import TripListDrawer from "@/components/drawers/TripListDrawer";
import TripOverviewDrawer from "@/components/drawers/TripOverviewDrawer";
import TripDayEditorDrawer from "@/components/drawers/TripDayEditorDrawer";
import PlaceSelectorDrawer from "@/components/drawers/PlaceSelectorDrawer";
import AddHotelDrawer from "@/components/drawers/AddHotelDrawer";
import AISuggestionsDrawer from "@/components/drawers/AISuggestionsDrawer";

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
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Your Trips"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripListDrawer {...props} />
        </Drawer>
      )}

      {/* TRIP OVERVIEW */}
      {drawer === "trip-overview" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title={props?.trip?.name ?? props?.trip?.title ?? "Trip Overview"}
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripOverviewDrawer trip={props?.trip ?? null} />
        </Drawer>
      )}

      {/* DAY EDITOR */}
      {drawer === "trip-day-editor" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title={`Edit Day ${typeof props?.index === "number" ? props.index + 1 : ""}`.trim()}
          style={drawerStyle}
          position="right"
          desktopWidth="720px"
        >
          <TripDayEditorDrawer
            day={props?.day ?? null}
            index={props?.index ?? 0}
            trip={props?.trip ?? null}
          />
        </Drawer>
      )}

      {/* PLACE SELECTOR */}
      {drawer === "place-selector" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title={props?.mealType ? `Add ${props.mealType}` : "Add Place"}
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            day={props?.day ?? null}
            trip={props?.trip ?? null}
            index={props?.index}
            mealType={props?.mealType ?? null}
            replaceIndex={props?.replaceIndex ?? null}
          />
        </Drawer>
      )}

      {/* ADD HOTEL */}
      {drawer === "add-hotel" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddHotelDrawer
            trip={props?.trip ?? null}
            day={props?.day ?? null}
            index={props?.index}
          />
        </Drawer>
      )}

      {/* AI SUGGESTIONS */}
      {drawer === "ai-suggestions" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="AI Suggestions"
          fullScreen={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={props?.day ?? null}
            trip={props?.trip ?? null}
            index={props?.index}
            suggestions={props?.suggestions}
            onApply={props?.onApply}
          />
        </Drawer>
      )}
    </>
  );
}

