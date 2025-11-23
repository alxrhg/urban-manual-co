import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';

interface Suggestion {
  id: string;
  text: string;
}

interface TripAISuggestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions?: Suggestion[];
}

// Placeholder component - to be implemented
function AISuggestionList({ suggestions }: { suggestions?: Suggestion[] }) {
  return <div>AI Suggestions: {suggestions?.length || 0}</div>;
}

export default function TripAISuggestionsDrawer({ isOpen, onClose, suggestions }: TripAISuggestionsDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title="AI Suggestions" />

      <DrawerSection bordered>
        <AISuggestionList suggestions={suggestions} />
      </DrawerSection>

      <DrawerActionBar>
        <button className="bg-black text-white rounded-full px-4 py-2">
          Apply changes
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
