"use client";

import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useDrawerStyle } from "@/components/ui/UseDrawerStyle";
import { Drawer } from "@/components/ui/Drawer";

// DRAWERS (to be implemented in Parts 3–8)
import TripListDrawer from "@/components/drawers/TripListDrawer";
import TripOverviewDrawer from "@/components/drawers/TripOverviewDrawer";
import TripSettingsDrawer from "@/components/drawers/TripSettingsDrawer";
import PlaceSelectorDrawer from "@/components/drawers/PlaceSelectorDrawer";
import AddHotelDrawer from "@/components/drawers/AddHotelDrawer";
import AddFlightDrawer from "@/components/drawers/AddFlightDrawer";
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

      {/* TRIP SETTINGS */}
      {drawer === "trip-settings" && props?.trip && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripSettingsDrawer
            trip={props.trip}
            onUpdate={props?.onUpdate}
            onDelete={props?.onDelete}
          />
        </Drawer>
      )}

      {/* PLACE SELECTOR */}
      {drawer === "place-selector" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Add Place"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            city={props?.city}
            onSelect={props?.onSelect}
            day={props?.day}
            trip={props?.trip}
            index={props?.index}
            mealType={props?.mealType}
            replaceIndex={props?.replaceIndex}
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

      {/* ADD FLIGHT */}
      {drawer === "add-flight" && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Add Flight"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddFlightDrawer
            tripId={props?.tripId}
            dayNumber={props?.dayNumber}
            onAdd={props?.onAdd}
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

