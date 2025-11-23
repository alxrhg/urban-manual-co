'use client';

import { useDrawerStore } from '@/lib/stores/drawer-store';

import { AccountDrawer } from '@/components/AccountDrawer';
import DestinationDrawer from '@/components/DestinationDrawer';
import { TripsDrawer } from '@/components/TripsDrawer';
import { SavedPlacesDrawer } from '@/components/SavedPlacesDrawer';
import { VisitedPlacesDrawer } from '@/components/VisitedPlacesDrawer';

import TripOverviewDrawer from '@/components/trip-drawers/TripOverviewDrawer';
import TripDayDrawer from '@/components/trip-drawers/TripDayDrawer';
import TripAddMealDrawer from '@/components/trip-drawers/TripAddMealDrawer';
import TripAddPlaceDrawer from '@/components/trip-drawers/TripAddPlaceDrawer';
import TripAddHotelDrawer from '@/components/trip-drawers/TripAddHotelDrawer';
import TripAISuggestionsDrawer from '@/components/trip-drawers/TripAISuggestionsDrawer';
import TripReorderDrawer from '@/components/trip-drawers/TripReorderDrawer';
import TripListDrawer from '@/components/drawers/TripListDrawer';
import TripOverviewQuickDrawer from '@/components/drawers/TripOverviewQuickDrawer';
import PlaceSelectorDrawer from '@/components/drawers/PlaceSelectorDrawer';

export default function DrawerMount() {
  const { type, props, closeDrawer } = useDrawerStore();

  return (
    <>
      {/* Legacy drawers that use their own drawer context - no props needed */}
      <AccountDrawer />
      <TripsDrawer />
      <SavedPlacesDrawer />
      <VisitedPlacesDrawer />

      {/* New drawers that use the global drawer store */}
      <DestinationDrawer isOpen={type === 'destination'} onClose={closeDrawer} place={props.place || null} {...props} />
      <TripOverviewDrawer isOpen={type === 'trip-overview'} onClose={closeDrawer} trip={props.trip || null} {...props} />
      <TripListDrawer isOpen={type === 'trip-list'} onClose={closeDrawer} />
      <TripOverviewQuickDrawer isOpen={type === 'trip-overview-quick'} onClose={closeDrawer} trip={props.trip || null} />
      <TripDayDrawer isOpen={type === 'trip-day'} onClose={closeDrawer} day={props.day || null} {...props} />
      <TripAddMealDrawer
        isOpen={type === 'trip-add-meal'}
        onClose={closeDrawer}
        day={props.day || null}
        mealType={props.mealType || 'lunch'}
        {...props}
      />
      <TripAddPlaceDrawer isOpen={type === 'trip-add-place'} onClose={closeDrawer} day={props.day || null} {...props} />
      <PlaceSelectorDrawer isOpen={type === 'place-selector'} onClose={closeDrawer} day={props.day || null} trip={props.trip || null} />
      <TripAddHotelDrawer isOpen={type === 'trip-add-hotel'} onClose={closeDrawer} day={props.day || null} {...props} />
      <TripAISuggestionsDrawer
        isOpen={type === 'trip-ai'}
        onClose={closeDrawer}
        trip={props.trip || null}
        suggestions={props.suggestions || []}
        {...props}
      />
      <TripReorderDrawer isOpen={type === 'trip-reorder-days'} onClose={closeDrawer} days={props.days || []} {...props} />
    </>
  );
}

