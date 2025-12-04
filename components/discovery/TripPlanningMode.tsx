'use client';

import { MapPin, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrip } from '@/contexts/TripContext';
import { useDrawer } from '@/contexts/DrawerContext';

/**
 * TripPlanningMode - Sticky banner shown when user has an active trip
 * Provides quick access to view trip and exit planning mode
 */
export function TripPlanningMode() {
  const { activeTrip, setActiveTrip } = useTrip();
  const { openDrawer } = useDrawer();

  if (!activeTrip) return null;

  const itemCount = activeTrip.locations?.length || 0;

  const showTripDrawer = () => {
    openDrawer('trip-view', null, { tripId: activeTrip.id });
  };

  const exitPlanningMode = () => {
    setActiveTrip(null);
  };

  return (
    <div className="sticky top-16 z-40 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800/30 px-4 sm:px-6 py-3">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/40 rounded-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-amber-900 dark:text-amber-100 truncate">
                Planning: {activeTrip.name}
              </span>
              <span className="text-sm text-amber-700 dark:text-amber-300/80 whitespace-nowrap">
                {itemCount} {itemCount === 1 ? 'place' : 'places'} added
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={showTripDrawer}
            className="text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/40"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">View Trip</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitPlanningMode}
            className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/40"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Done Planning</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
