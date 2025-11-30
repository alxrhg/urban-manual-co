'use client';

import { useEffect } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { useDrawer } from '@/contexts/DrawerContext';

import { AccountDrawer } from '@/components/AccountDrawer';
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';
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
  const { open: storeOpen, type: storeType, props: storeProps, closeDrawer: closeStoreDrawer } = useDrawerStore();
  const { activeDrawer: contextDrawer, closeDrawer: closeContextDrawer } = useDrawer();
  const drawerStyle = useDrawerStyle();

  // Synchronization: When Store drawer opens, close Context drawer
  useEffect(() => {
    if (storeOpen && contextDrawer) {
      console.log('[DrawerMount] Closing Context drawer because Store drawer opened');
      closeContextDrawer();
    }
  }, [storeOpen, contextDrawer, closeContextDrawer]);

  // Synchronization: When Context drawer opens, close Store drawer
  useEffect(() => {
    if (contextDrawer && storeOpen) {
      console.log('[DrawerMount] Closing Store drawer because Context drawer opened');
      closeStoreDrawer();
    }
  }, [contextDrawer, storeOpen, closeStoreDrawer]);

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <AccountDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />

      {/* New drawers that use the global drawer store */}
      {storeOpen && storeType === 'account-new' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          desktopWidth="420px"
          style={drawerStyle}
          position="right"
        >
          <AccountDrawerNew isOpen={storeOpen} onClose={closeStoreDrawer} />
        </Drawer>
      )}

      <DestinationDrawer
        isOpen={storeOpen && storeType === 'destination'}
        onClose={closeStoreDrawer}
        destination={storeProps.place || storeProps.destination || null}
        {...storeProps}
      />

      <TripOverviewDrawer
        isOpen={storeOpen && storeType === 'trip-overview'}
        onClose={closeStoreDrawer}
        trip={storeProps?.trip ?? null}
      />

      {storeOpen && storeType === 'trip-list' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="Your Trips"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripListDrawer {...storeProps} />
        </Drawer>
      )}

      <TripOverviewQuickDrawer
        isOpen={storeOpen && storeType === 'trip-overview-quick'}
        onClose={closeStoreDrawer}
        trip={storeProps.trip || null}
      />

      {storeOpen && storeType === 'trip-settings' && storeProps?.trip && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripSettingsDrawer
            trip={storeProps.trip}
            onUpdate={storeProps?.onUpdate}
            onDelete={storeProps?.onDelete}
          />
        </Drawer>
      )}

      {storeOpen && storeType === 'place-selector' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="Add Place"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            tripId={storeProps?.tripId}
            dayNumber={storeProps?.dayNumber}
            city={storeProps?.city}
            category={storeProps?.category}
            onSelect={storeProps?.onSelect}
            day={storeProps?.day}
            trip={storeProps?.trip}
            index={storeProps?.index}
            mealType={storeProps?.mealType}
            replaceIndex={storeProps?.replaceIndex}
          />
        </Drawer>
      )}

      {storeOpen && storeType === 'trip-add-hotel' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddHotelDrawer
            trip={storeProps.trip || null}
            day={storeProps.day || null}
            index={storeProps.index}
          />
        </Drawer>
      )}

      {storeOpen && storeType === 'add-flight' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="Add Flight"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddFlightDrawer
            tripId={storeProps?.tripId}
            dayNumber={storeProps?.dayNumber}
            onAdd={storeProps?.onAdd}
          />
        </Drawer>
      )}

      {storeOpen && storeType === 'trip-ai' && (
        <Drawer
          isOpen={storeOpen}
          onClose={closeStoreDrawer}
          title="AI Suggestions"
          fullScreen={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={storeProps.day || null}
            trip={storeProps.trip || null}
            index={storeProps.index}
            suggestions={storeProps.suggestions}
            onApply={storeProps.onApply}
          />
        </Drawer>
      )}

      {/* Quick Trip Selector - for one-click add to trip */}
      <QuickTripSelector
        isOpen={storeOpen && storeType === 'quick-trip-selector'}
        onClose={closeStoreDrawer}
        destinationSlug={storeProps?.destinationSlug || ''}
        destinationName={storeProps?.destinationName || ''}
        destinationCity={storeProps?.destinationCity}
      />
    </>
  );
}
