import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { applyAIActions } from '@/lib/intelligence/actionRouter';

interface Suggestion {
  id?: string;
  text?: string;
  title?: string;
  detail?: string;
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

// AI Suggestion List Component
function AISuggestionList({ suggestions }: { suggestions?: Suggestion[] }) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--um-text-muted)]">No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {suggestions.map((s, i) => (
        <div
          key={s.id || i}
          className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-1 bg-white dark:bg-gray-950"
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">{s.title || s.text || 'Suggestion'}</p>
          {s.detail && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.detail}</p>
          )}
        </div>
      ))}
    </div>
  );
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
        subtitle="Based on your trip activity"
        leftAccessory={
          <button
            className="text-sm opacity-70 hover:opacity-100 transition-opacity"
            onClick={onClose}
          >
            ←
          </button>
        }
      />

      <AISuggestionList suggestions={suggestions} />

      <DrawerActionBar>
        <button
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-2xl py-3 font-medium text-xs hover:opacity-90 transition-opacity"
          onClick={handleApply}
        >
          Apply Suggestions
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
