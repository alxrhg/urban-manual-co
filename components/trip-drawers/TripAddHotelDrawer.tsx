import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

interface Day {
  date: string;
}

interface TripAddHotelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
}

// Placeholder component - to be implemented
function HotelPicker({ day }: { day: Day }) {
  return <div>Hotel Picker for {day.date}</div>;
}

export default function TripAddHotelDrawer({ isOpen, onClose, day }: TripAddHotelDrawerProps) {
  if (!day) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title="Assign Hotel" subtitle={day.date} />

      <DrawerSection>
        <HotelPicker day={day} />
      </DrawerSection>
    </Drawer>
  );
}
