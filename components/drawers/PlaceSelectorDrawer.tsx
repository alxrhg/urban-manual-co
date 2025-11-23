'use client';

import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Day {
  date: string;
  city: string;
  [key: string]: any;
}

interface Trip {
  id?: string;
  [key: string]: any;
}

interface PlaceSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: Day | null;
  trip: Trip | null;
  mealType?: string;
}

// Placeholder component - to be implemented
function PlaceSelectorContent({ day, trip, mealType }: { day: Day; trip: Trip | null; mealType?: string }) {
  return (
    <DrawerSection>
      <p className="text-sm text-[var(--um-text-muted)]">
        {mealType ? `Add ${mealType}` : 'Add Place'} for {day.date} in {day.city}
      </p>
      {/* TODO: Implement place selector UI */}
    </DrawerSection>
  );
}

export default function PlaceSelectorDrawer({ isOpen, onClose, day, trip, mealType }: PlaceSelectorDrawerProps) {
  const isMobile = useIsMobile();

  if (!day) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={isMobile}
      desktopWidth={isMobile ? "100vw" : "420px"}
      desktopSpacing={isMobile ? "inset-0" : undefined}
      mobileVariant="side"
      mobileExpanded={isMobile}
      mobileHeight={isMobile ? "100vh" : undefined}
    >
      <DrawerHeader
        title={mealType ? `Add ${mealType}` : 'Add Place'}
        subtitle={day.date}
        leftAccessory={
          <button
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={onClose}
          >
            ←
          </button>
        }
      />

      <PlaceSelectorContent day={day} trip={trip} mealType={mealType} />
    </Drawer>
  );
}

