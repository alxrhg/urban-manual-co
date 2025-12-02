'use client';

import { useEffect, useState } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';

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

// Types that are handled by inline PanelLayout on desktop
const INLINE_TYPES = ['destination', 'account-new', 'trip-list', 'trip-settings', 'place-selector', 'trip-add-hotel', 'add-flight', 'trip-ai'];

export default function DrawerMount() {
  const { isOpen, type, props, closeAll, displayMode } = useDrawerStore();
  const closeDrawer = closeAll;
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

      {/* New drawers that use the global drawer store */}
      {/* Only render as overlay if not in inline mode on desktop */}
      {isOpen && type === 'account-new' && !shouldSkipOverlay('account-new') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          desktopWidth="420px"
          style={drawerStyle}
          position="right"
        >
          <AccountDrawerNew isOpen={isOpen} onClose={closeDrawer} />
        </Drawer>
      )}

      {/* DestinationDrawer - skip overlay when in inline mode on desktop */}
      {!shouldSkipOverlay('destination') && (
        <DestinationDrawer
          isOpen={isOpen && type === 'destination'}
          onClose={closeDrawer}
          destination={(props.place || props.destination || null) as any}
          {...(props as any)}
        />
      )}

      <TripOverviewDrawer
        isOpen={isOpen && type === 'trip-overview'}
        onClose={closeDrawer}
        trip={(props?.trip as any) ?? null}
      />

      {isOpen && type === 'trip-list' && !shouldSkipOverlay('trip-list') && (
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

      <TripOverviewQuickDrawer
        isOpen={isOpen && type === 'trip-overview-quick'}
        onClose={closeDrawer}
        trip={(props.trip as any) || null}
      />

      {isOpen && type === 'trip-settings' && props?.trip && !shouldSkipOverlay('trip-settings') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Trip Settings"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <TripSettingsDrawer
            trip={props.trip as any}
            onUpdate={props?.onUpdate as any}
            onDelete={props?.onDelete as any}
          />
        </Drawer>
      )}

      {isOpen && type === 'place-selector' && !shouldSkipOverlay('place-selector') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Add Place"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            tripId={props?.tripId as any}
            dayNumber={props?.dayNumber as any}
            city={props?.city as any}
            category={props?.category as any}
            onSelect={props?.onSelect as any}
            day={props?.day as any}
            trip={props?.trip as any}
            index={props?.index as any}
            mealType={props?.mealType as any}
            replaceIndex={props?.replaceIndex as any}
          />
        </Drawer>
      )}

      {isOpen && type === 'trip-add-hotel' && !shouldSkipOverlay('trip-add-hotel') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Select Hotel"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddHotelDrawer
            trip={(props.trip as any) || null}
            day={(props.day as any) || null}
            index={props.index as any}
          />
        </Drawer>
      )}

      {isOpen && type === 'add-flight' && !shouldSkipOverlay('add-flight') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="Add Flight"
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <AddFlightDrawer
            tripId={props?.tripId as any}
            dayNumber={props?.dayNumber as any}
            onAdd={props?.onAdd as any}
          />
        </Drawer>
      )}

      {isOpen && type === 'trip-ai' && !shouldSkipOverlay('trip-ai') && (
        <Drawer
          isOpen={isOpen}
          onClose={closeDrawer}
          title="AI Suggestions"
          fullScreen={true}
          position="right"
          style={drawerStyle}
        >
          <AISuggestionsDrawer
            day={(props.day as any) || null}
            trip={(props.trip as any) || null}
            index={props.index as any}
            suggestions={props.suggestions as any}
            onApply={props.onApply as any}
          />
        </Drawer>
      )}

      {/* Quick Trip Selector - for one-click add to trip */}
      <QuickTripSelector
        isOpen={isOpen && type === 'quick-trip-selector'}
        onClose={closeDrawer}
        destinationSlug={(props?.destinationSlug as string) || ''}
        destinationName={(props?.destinationName as string) || ''}
        destinationCity={props?.destinationCity as any}
      />
    </>
  );
}
