import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

interface Trip {
  id: string;
  name: string;
  days: Array<{ date: string; city: string }>;
  cities: string[];
}

interface TripOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

// Placeholder components - to be implemented
function TripSummary({ trip }: { trip: Trip }) {
  return <div>Trip Summary for {trip.name}</div>;
}

function TripCities({ trip }: { trip: Trip }) {
  return <div>Trip Cities: {trip.cities.join(', ')}</div>;
}

function TripHotels({ trip }: { trip: Trip }) {
  return <div>Trip Hotels</div>;
}

function TripFlights({ trip }: { trip: Trip }) {
  return <div>Trip Flights</div>;
}

export default function TripOverviewDrawer({ isOpen, onClose, trip }: TripOverviewDrawerProps) {
  if (!trip) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader
        title={trip.name}
        subtitle={`${trip.days.length} days · ${trip.cities.join(', ')}`}
      />
      <DrawerSection>
        <TripSummary trip={trip} />
      </DrawerSection>
      <DrawerSection>
        <TripCities trip={trip} />
      </DrawerSection>
      <DrawerSection>
        <TripHotels trip={trip} />
      </DrawerSection>
      <DrawerSection>
        <TripFlights trip={trip} />
      </DrawerSection>
    </Drawer>
  );
}
