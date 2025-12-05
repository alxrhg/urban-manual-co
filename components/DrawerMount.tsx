'use client';

import { useEffect, useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import { DestinationDrawer } from '@/src/features/detail/DestinationDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';
import { TripsDrawer } from '@/components/TripsDrawer';
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

// Types that are handled by inline PanelLayout on desktop
const INLINE_TYPES = ['destination', 'account-new', 'trip-list', 'trip-settings', 'place-selector', 'trip-add-hotel', 'add-flight', 'trip-ai'];

export default function DrawerMount() {
  const { open, type, props, closeDrawer, displayMode } = useDrawerStore();
  const drawerStyle = useDrawerStyle();

  // Track desktop state for conditional rendering
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Helper to check if we should skip overlay (handled by PanelLayout instead)
  const shouldSkipOverlay = (drawerType: string) => {
    return displayMode === 'inline' && isDesktop && INLINE_TYPES.includes(drawerType);
  };

  return (
    <>
      {/* Legacy drawers that use their own drawer context */}
      <AccountDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />
      <TripsDrawer />

      {/* New drawers that use the global drawer store */}
      {/* Only render as overlay if not in inline mode on desktop */}
      {open && type === 'account-new' && !shouldSkipOverlay('account-new') && (
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

      {/* DestinationDrawer - skip overlay when in inline mode on desktop */}
      {!shouldSkipOverlay('destination') && (
        <DestinationDrawer
          isOpen={open && type === 'destination'}
          onClose={closeDrawer}
          destination={(props.place || props.destination || null) as import('@/types/destination').Destination | null}
          {...props}
        />
      )}

      <TripOverviewDrawer
        isOpen={open && type === 'trip-overview'}
        onClose={closeDrawer}
        trip={props?.trip ?? null}
      />

      {open && type === 'trip-list' && !shouldSkipOverlay('trip-list') && (
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

      {open && type === 'trip-settings' && props?.trip && !shouldSkipOverlay('trip-settings') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripSettingsDrawer
            trip={props.trip as import('@/types/trip').Trip}
            onUpdate={props?.onUpdate as (() => void) | undefined}
            onDelete={props?.onDelete as (() => void) | undefined}
          />
        </Drawer>
      )}

      {open && type === 'place-selector' && !shouldSkipOverlay('place-selector') && (
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
            category={props?.category}
            onSelect={props?.onSelect}
            day={props?.day}
            trip={props?.trip}
            index={props?.index}
            mealType={props?.mealType}
            replaceIndex={props?.replaceIndex}
          />
        </Drawer>
      )}

      {open && type === 'trip-add-hotel' && !shouldSkipOverlay('trip-add-hotel') && (
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

      {open && type === 'add-flight' && !shouldSkipOverlay('add-flight') && (
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

      {open && type === 'trip-ai' && !shouldSkipOverlay('trip-ai') && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title="AI Suggestions"
          fullScreen={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={(props.day || null) as { date: string; city: string } | null}
            trip={(props.trip || null) as { days: unknown[] } | null}
            index={props.index as number | undefined}
            suggestions={props.suggestions as Array<{ id?: string | number; title?: string }> | undefined}
            onApply={props.onApply as ((updatedTrip: { days: unknown[] }) => void) | undefined}
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
