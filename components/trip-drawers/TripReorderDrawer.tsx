import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

interface Day {
  id: string;
  date: string;
}

interface TripReorderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  days?: Day[];
}

// Placeholder component - to be implemented
function DayReorderList({ days }: { days?: Day[] }) {
  return <div>Reorder Days: {days?.length || 0}</div>;
}

export default function TripReorderDrawer({ isOpen, onClose, days }: TripReorderDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title="Reorder Days" />
      <DrawerSection>
        <DayReorderList days={days} />
      </DrawerSection>
    </Drawer>
  );
}
