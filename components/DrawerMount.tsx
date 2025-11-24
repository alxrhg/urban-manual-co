'use client';

import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import DestinationDrawer from '@/components/DestinationDrawer';
import { TripsDrawer } from '@/components/TripsDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';

import TripOverviewDrawer from '@/components/trip-drawers/TripOverviewDrawer';
import TripDayDrawer from '@/components/trip-drawers/TripDayDrawer';
import TripDayEditorDrawer from '@/components/drawers/TripDayEditorDrawer';
import TripAddMealDrawer from '@/components/trip-drawers/TripAddMealDrawer';
import TripAddPlaceDrawer from '@/components/trip-drawers/TripAddPlaceDrawer';
import AddHotelDrawer from '@/components/drawers/AddHotelDrawer';
import AISuggestionsDrawer from '@/components/drawers/AISuggestionsDrawer';
import TripReorderDrawer from '@/components/trip-drawers/TripReorderDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import TripOverviewQuickDrawer from '@/components/drawers/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';
import AccountDrawerNew from '@/components/drawers/AccountDrawer';
import { Drawer } from '@/components/ui/Drawer';
import { useDrawerStyle } from '@/components/ui/UseDrawerStyle';

export default function DrawerMount() {
  const { open, type, props, closeDrawer } = useDrawerStore();
  const drawerStyle = useDrawerStyle();

  return (
    <>
      {/* Legacy drawers that use their own drawer context - no props needed */}
      <AccountDrawer />
      <TripsDrawer />
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
      <DestinationDrawer isOpen={open && type === 'destination'} onClose={closeDrawer} place={props.place || null} {...props} />
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
      <TripOverviewQuickDrawer isOpen={open && type === 'trip-overview-quick'} onClose={closeDrawer} trip={props.trip || null} />
      <TripDayDrawer isOpen={open && type === 'trip-day'} onClose={closeDrawer} day={props.day || null} {...props} />
      {open && type === 'trip-day-editor' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          fullScreen={true}
          style={drawerStyle}
          position="right"
        >
          <TripDayEditorDrawer
            day={props.day || null}
            index={props.index || 0}
            trip={props.trip || null}
          />
        </Drawer>
      )}
      <TripAddMealDrawer
        isOpen={open && type === 'trip-add-meal'}
        onClose={closeDrawer}
        day={props.day || null}
        mealType={props.mealType || 'lunch'}
        {...props}
      />
      <TripAddPlaceDrawer isOpen={open && type === 'trip-add-place'} onClose={closeDrawer} day={props.day || null} {...props} />
      {open && type === 'place-selector' && (
        <Drawer
          isOpen={open}
          onClose={closeDrawer}
          title={props.mealType ? `Add ${props.mealType}` : "Add Place"}
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <PlaceSelectorDrawer
            day={props.day || null}
            trip={props.trip || null}
            index={props.index}
            mealType={props.mealType || null}
            replaceIndex={props.replaceIndex || null}
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
      <TripReorderDrawer isOpen={open && type === 'trip-reorder-days'} onClose={closeDrawer} days={props.days || []} {...props} />
    </>
  );
}

