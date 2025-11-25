'use client';

import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import DestinationDrawer from '@/components/DestinationDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';

import AddHotelDrawer from '@/components/drawers/AddHotelDrawer';
import AISuggestionsDrawer from '@/components/drawers/AISuggestionsDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import TripOverviewDrawer from '@/components/drawers/TripOverviewDrawer';
import TripOverviewQuickDrawer from '@/components/drawers/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/components/drawers/TripSettingsDrawer';
import AccountDrawerNew from '@/components/drawers/AccountDrawer';
import { DrawerSystem } from '@/components/ui/DrawerSystem';
import { useDrawerStyle } from '@/components/ui/UseDrawerStyle';

/**
 * DrawerMount - Central component for rendering all drawers
 *
 * Supports both overlay mode (mobile/forced) and split-pane mode (desktop default).
 * Drawers automatically use split-pane on desktop unless forceOverlay is true.
 */
export default function DrawerMount() {
  const { open, type, props, closeDrawer, displayMode } = useDrawerStore();
  const drawerStyle = useDrawerStyle();

  // Determine if we should force overlay mode (for fullscreen drawers, etc.)
  const shouldForceOverlay = type === 'trip-ai';

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <AccountDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />

      {/* New drawers using DrawerSystem with split-pane support */}
      {open && type === 'account-new' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          width="420px"
          style={drawerStyle}
          position="right"
        >
          <AccountDrawerNew isOpen={open} onClose={closeDrawer} />
        </DrawerSystem>
      )}

      <DestinationDrawer
        isOpen={open && type === 'destination'}
        onClose={closeDrawer}
        place={props.place || null}
        {...props}
      />

      {open && type === 'trip-overview' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title={props?.trip?.name ?? props?.trip?.title ?? "Trip Overview"}
          style={drawerStyle}
          position="right"
          width="420px"
        >
          <TripOverviewDrawer trip={props?.trip ?? null} />
        </DrawerSystem>
      )}

      {open && type === 'trip-list' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title="Your Trips"
          style={drawerStyle}
          position="right"
          width="420px"
        >
          <TripListDrawer {...props} />
        </DrawerSystem>
      )}

      <TripOverviewQuickDrawer
        isOpen={open && type === 'trip-overview-quick'}
        onClose={closeDrawer}
        trip={props.trip || null}
      />

      {open && type === 'trip-settings' && props?.trip && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          width="420px"
        >
          <TripSettingsDrawer
            trip={props.trip}
            onUpdate={props?.onUpdate}
            onDelete={props?.onDelete}
          />
        </DrawerSystem>
      )}

      {open && type === 'place-selector' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title="Add Place"
          style={drawerStyle}
          position="right"
          width="420px"
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
        </DrawerSystem>
      )}

      {open && type === 'trip-add-hotel' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          width="420px"
        >
          <AddHotelDrawer
            trip={props.trip || null}
            day={props.day || null}
            index={props.index}
          />
        </DrawerSystem>
      )}

      {open && type === 'trip-ai' && (
        <DrawerSystem
          isOpen={open}
          onClose={closeDrawer}
          title="AI Suggestions"
          fullScreen={true}
          forceOverlay={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={props.day || null}
            trip={props.trip || null}
            index={props.index}
            suggestions={props.suggestions}
            onApply={props.onApply}
          />
        </DrawerSystem>
      )}
    </>
  );
}
