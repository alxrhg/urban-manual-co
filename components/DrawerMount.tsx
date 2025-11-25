'use client';

import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import DestinationDrawer from '@/components/DestinationDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';
import { QuickTripSelector } from '@/components/QuickTripSelector';

import AddHotelDrawer from '@/components/drawers/AddHotelDrawer';
import AddFlightDrawer from '@/components/drawers/AddFlightDrawer';
import AISuggestionsDrawer from '@/components/drawers/AISuggestionsDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import TripOverviewDrawer from '@/components/drawers/TripOverviewDrawer';
import TripOverviewQuickDrawer from '@/components/drawers/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';
import TripSettingsDrawer from '@/components/drawers/TripSettingsDrawer';
import AccountDrawerNew from '@/components/drawers/AccountDrawer';
import { Drawer } from '@/components/ui/Drawer';
import { useDrawerStyle } from '@/components/ui/UseDrawerStyle';

export default function DrawerMount() {
  const { open, type, props, closeDrawer } = useDrawerStore();
  const drawerStyle = useDrawerStyle();

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <AccountDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />

      {/* New drawers that use the global drawer store */}
      {open && type === 'account-new' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          desktopWidth="420px"
          style={drawerStyle}
          position="right"
        >
          <AccountDrawerNew isOpen={open} onClose={closeDrawer} />
        </Drawer>
      )}

      <DestinationDrawer
        isOpen={open && type === 'destination'}
        onClose={closeDrawer}
        place={props.place || null}
        {...props}
      />

      {open && type === 'trip-overview' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title={props?.trip?.name ?? props?.trip?.title ?? "Trip Overview"}
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripOverviewDrawer trip={props?.trip ?? null} />
        </Drawer>
      )}

      {open && type === 'trip-list' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Your Trips"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripListDrawer {...props} />
        </Drawer>
      )}

      <TripOverviewQuickDrawer
        isOpen={open && type === 'trip-overview-quick'}
        onClose={closeDrawer}
        trip={props.trip || null}
      />

      {open && type === 'trip-settings' && props?.trip && (
        <Drawer
          isOpen={open}
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

      {open && type === 'place-selector' && (
        <Drawer
          isOpen={open}
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

      {open && type === 'trip-add-hotel' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddHotelDrawer
            trip={props.trip || null}
            day={props.day || null}
            index={props.index}
          />
        </Drawer>
      )}

      {open && type === 'add-flight' && (
        <Drawer
          isOpen={open}
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

      {open && type === 'trip-ai' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="AI Suggestions"
          fullScreen={true}
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
        </Drawer>
      )}

      {/* Quick Trip Selector - for one-click add to trip */}
      <QuickTripSelector
        isOpen={open && type === 'quick-trip-selector'}
        onClose={closeDrawer}
        destinationSlug={props?.destinationSlug || ''}
        destinationName={props?.destinationName || ''}
        destinationCity={props?.destinationCity}
      />
    </>
  );
}
