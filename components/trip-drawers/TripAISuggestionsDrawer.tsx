import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { applyAIActions } from '@/lib/intelligence/actionRouter';

interface Suggestion {
  id: string;
  text: string;
  actions?: Array<{
    type: 'setMeal' | 'addActivity' | 'assignHotel' | 'reorderDays';
    payload: any;
  }>;
}

interface Trip {
  days: any[];
  [key: string]: any;
}

interface TripAISuggestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  suggestions?: Suggestion[];
  onApply?: (updatedTrip: Trip) => void;
}

// Placeholder component - to be implemented
function AISuggestionList({ suggestions }: { suggestions?: Suggestion[] }) {
  return <div>AI Suggestions: {suggestions?.length || 0}</div>;
}

export default function TripAISuggestionsDrawer({
  isOpen,
  onClose,
  trip,
  suggestions,
  onApply,
}: TripAISuggestionsDrawerProps) {
  function handleApply() {
    if (!trip || !suggestions || !onApply) return;

    // Extract all actions from suggestions
    const allActions = suggestions
      .filter((s) => s.actions && s.actions.length > 0)
      .flatMap((s) => s.actions!);

    if (allActions.length === 0) {
      onClose();
      return;
    }

    // Apply all actions to the trip
    const updated = applyAIActions(trip, allActions);

    // Call the onApply callback with the updated trip
    onApply(updated);

    // Close the drawer
    onClose();
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      fullScreen={true}
      desktopWidth="100vw"
      desktopSpacing="inset-0"
      mobileVariant="side"
      mobileExpanded={true}
      mobileHeight="100vh"
    >
      <DrawerHeader
        title="AI Suggestions"
        subtitle="Based on your trip pattern"
        leftAccessory={
          <button
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={onClose}
          >
            ←
          </button>
        }
      />

      <DrawerSection bordered>
        <AISuggestionList suggestions={suggestions} />
      </DrawerSection>

      <DrawerActionBar>
        <button
          className="bg-black text-white rounded-full px-4 py-2"
          onClick={handleApply}
        >
          Apply Changes
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
