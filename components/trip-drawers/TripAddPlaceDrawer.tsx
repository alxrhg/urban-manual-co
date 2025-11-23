import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { GoogleRatingBadge } from '@/components/badges/GoogleRatingBadge';

interface Day {
  date: string;
}

interface TripAddPlaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
}

// Placeholder components - to be implemented
function NearbySuggestions({ day }: { day: Day }) {
  return <div>Nearby suggestions for {day.date}</div>;
}

function PlacesList({ renderBadge }: { renderBadge: (p: any) => React.ReactNode }) {
  return <div>Places List</div>;
}

export default function TripAddPlaceDrawer({ isOpen, onClose, day }: TripAddPlaceDrawerProps) {
  if (!day) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title="Add Activity" subtitle={day.date} />

      <DrawerSection bordered>
        <NearbySuggestions day={day} />
      </DrawerSection>

      <DrawerSection>
        <PlacesList
          renderBadge={(p) =>
            p.google && (
              <GoogleRatingBadge
                rating={p.google.rating}
                count={p.google.count}
              />
            )
          }
        />
      </DrawerSection>
    </Drawer>
  );
}
