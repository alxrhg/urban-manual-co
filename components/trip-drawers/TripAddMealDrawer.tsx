import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { MichelinBadge } from '@/components/badges/MichelinBadge';
import { GoogleRatingBadge } from '@/components/badges/GoogleRatingBadge';

interface Day {
  date: string;
}

interface TripAddMealDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
  mealType: 'breakfast' | 'lunch' | 'dinner';
}

// Placeholder components - to be implemented
function SmartSuggestions({ mealType, day }: { mealType: string; day: Day }) {
  return <div>Smart suggestions for {mealType} on {day.date}</div>;
}

function RestaurantList({ renderBadge }: { renderBadge: (r: any) => React.ReactNode }) {
  return <div>Restaurant List</div>;
}

export default function TripAddMealDrawer({ isOpen, onClose, day, mealType }: TripAddMealDrawerProps) {
  if (!day) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader
        title={`Add ${mealType}`}
        subtitle={day.date}
      />

      <DrawerSection bordered>
        <SmartSuggestions mealType={mealType} day={day} />
      </DrawerSection>

      <DrawerSection>
        <RestaurantList
          renderBadge={(r) => (
            <div className="flex gap-2">
              {r.michelin && <MichelinBadge rating={r.michelin} />}
              {r.google && (
                <GoogleRatingBadge
                  rating={r.google.rating}
                  count={r.google.count}
                />
              )}
            </div>
          )}
        />
      </DrawerSection>
    </Drawer>
  );
}
