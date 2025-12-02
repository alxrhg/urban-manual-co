'use client';

import { Button } from '@/components/ui/button';
import { Calendar, Sparkles, Settings2 } from 'lucide-react';

interface EmptyTripProps {
  onSetup: () => void;
  onAIPlan: () => void;
}

export function EmptyTrip({ onSetup, onAIPlan }: EmptyTripProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <Calendar className="w-9 h-9 text-gray-400" />
      </div>

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Let&apos;s plan your trip
      </h2>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
        Set your dates and destination, then add places or let AI create an itinerary for you.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={onSetup} variant="outline" className="h-12">
          <Settings2 className="w-4 h-4 mr-2" />
          Set dates & destination
        </Button>

        <Button onClick={onAIPlan} className="h-12">
          <Sparkles className="w-4 h-4 mr-2" />
          Auto-plan with AI
        </Button>
      </div>
    </div>
  );
}
