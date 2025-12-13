'use client';

import { useState, memo } from 'react';
import { Bookmark, Check, Plus, Loader2 } from 'lucide-react';
import { useQuickSave } from '@/hooks/useQuickSave';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { usePlanningMode } from '@/contexts/PlanningModeContext';
import { useTripBuilder } from '@/contexts/TripBuilderContext';

interface QuickActionsProps {
  destinationId?: number;
  destinationSlug: string;
  destinationName: string;
  destinationCity?: string;
  showAddToTrip?: boolean;
  compact?: boolean;
  className?: string;
  onAddToTrip?: () => void;
}

/**
 * Quick action buttons for save, visited, and add-to-trip
 * Reduces user friction by enabling one-click actions
 */
export const QuickActions = memo(function QuickActions({
  destinationId,
  destinationSlug,
  destinationName,
  destinationCity,
  showAddToTrip = true,
  compact = false,
  className = '',
  onAddToTrip,
}: QuickActionsProps) {
  const { user } = useAuth();
  const { openDrawer } = useDrawer();
  const { openDrawer: openStoreDrawer } = useDrawerStore();
  const { planningMode, isInPlanningMode, getAddLabel } = usePlanningMode();
  const { activeTrip, addToTrip } = useTripBuilder();
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [isAddingToTrip, setIsAddingToTrip] = useState(false);

  const {
    isSaved,
    isVisited,
    isSaving,
    isMarkingVisited,
    toggleSave,
    toggleVisited,
    requiresAuth,
  } = useQuickSave({ destinationId, destinationSlug });

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (requiresAuth) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 2000);
      openDrawer('login-modal');
      return;
    }

    await toggleSave();
  };

  const handleVisited = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (requiresAuth) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 2000);
      openDrawer('login-modal');
      return;
    }

    await toggleVisited();
  };

  // Check if destination is already in trip
  const isInTrip = activeTrip?.days.some(day =>
    day.items.some(item => item.destination.slug === destinationSlug)
  );

  const handleAddToTrip = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (requiresAuth) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 2000);
      openDrawer('login-modal');
      return;
    }

    // Use callback if provided
    if (onAddToTrip) {
      onAddToTrip();
      return;
    }

    // In planning mode with quick add, add directly to default day
    if (isInPlanningMode && planningMode.quickAddEnabled) {
      setIsAddingToTrip(true);
      try {
        // Fetch destination data if needed
        const response = await fetch(`/api/destinations/${destinationSlug}`);
        if (response.ok) {
          const destination = await response.json();
          addToTrip(destination, planningMode.defaultDay);
        }
      } catch (error) {
        console.error('Error adding to trip:', error);
      } finally {
        setIsAddingToTrip(false);
      }
      return;
    }

    // Default: open quick trip selector
    openStoreDrawer('quick-trip-selector', {
      destinationSlug,
      destinationName,
      destinationCity,
    });
  };

  const buttonBaseClass = compact
    ? 'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200'
    : 'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200';

  const iconSize = compact ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={`
          ${buttonBaseClass}
          ${isSaved
            ? 'bg-black dark:bg-white text-white dark:text-black'
            : 'bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
          backdrop-blur-sm shadow-sm hover:shadow-md
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={isSaved ? `Remove ${destinationName} from saved` : `Save ${destinationName}`}
        title={isSaved ? 'Saved' : 'Save'}
      >
        {isSaving ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Bookmark className={`${iconSize} ${isSaved ? 'fill-current' : ''}`} />
        )}
      </button>

      {/* Visited Button */}
      <button
        onClick={handleVisited}
        disabled={isMarkingVisited}
        className={`
          ${buttonBaseClass}
          ${isVisited
            ? 'bg-emerald-500 text-white'
            : 'bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }
          backdrop-blur-sm shadow-sm hover:shadow-md
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        aria-label={isVisited ? `Unmark ${destinationName} as visited` : `Mark ${destinationName} as visited`}
        title={isVisited ? 'Visited' : 'Mark as visited'}
      >
        {isMarkingVisited ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Check className={`${iconSize} ${isVisited ? 'stroke-[3]' : ''}`} />
        )}
      </button>

      {/* Add to Trip Button */}
      {showAddToTrip && (
        <button
          onClick={handleAddToTrip}
          disabled={isAddingToTrip || isInTrip}
          className={`
            ${buttonBaseClass}
            ${isInTrip
              ? 'bg-emerald-500 text-white'
              : isInPlanningMode
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }
            backdrop-blur-sm shadow-sm hover:shadow-md
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          aria-label={isInTrip ? `${destinationName} is in trip` : `Add ${destinationName} to trip`}
          title={isInTrip ? 'In trip' : isInPlanningMode ? getAddLabel() : 'Add to trip'}
        >
          {isAddingToTrip ? (
            <Loader2 className={`${iconSize} animate-spin`} />
          ) : isInTrip ? (
            <Check className={`${iconSize} stroke-[3]`} />
          ) : (
            <Plus className={iconSize} />
          )}
        </button>
      )}

      {/* Login Toast */}
      {showLoginToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm rounded-full shadow-lg animate-fade-in">
          Sign in to save places
        </div>
      )}
    </div>
  );
});
