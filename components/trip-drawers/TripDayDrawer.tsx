import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

interface Day {
  date: string;
  city: string;
  breakfast?: any;
  lunch?: any;
  dinner?: any;
  activities?: any[];
  hotel?: any;
}

interface TripDayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
}

// Placeholder components - to be implemented
function MealSection({ type, day }: { type: 'breakfast' | 'lunch' | 'dinner'; day: Day }) {
  return <div>{type}: {day[type]?.name || 'Not set'}</div>;
}

function ActivitiesList({ activities }: { activities?: any[] }) {
  return <div>Activities: {activities?.length || 0}</div>;
}

function HotelCard({ hotel }: { hotel?: any }) {
  return <div>Hotel: {hotel?.name || 'Not set'}</div>;
}

export default function TripDayDrawer({ isOpen, onClose, day }: TripDayDrawerProps) {
  if (!day) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader
        title={day.date}
        subtitle={day.city}
      />

      <DrawerSection bordered>
        <MealSection type="breakfast" day={day} />
        <MealSection type="lunch" day={day} />
        <MealSection type="dinner" day={day} />
      </DrawerSection>

      <DrawerSection bordered>
        <ActivitiesList activities={day.activities} />
      </DrawerSection>

      <DrawerSection>
        <HotelCard hotel={day.hotel} />
      </DrawerSection>
    </Drawer>
  );
}
