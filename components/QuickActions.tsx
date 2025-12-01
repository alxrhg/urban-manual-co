'use client';

import { useState, memo } from 'react';
import { Bookmark, Check, Plus, Loader2 } from 'lucide-react';
import { useQuickSave } from '@/hooks/useQuickSave';
import { useDrawer } from '@/contexts/DrawerContext';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const { openDrawer } = useDrawer();
  const { openDrawer: openStoreDrawer } = useDrawerStore();
  const [showLoginToast, setShowLoginToast] = useState(false);

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
      openDrawer('login');
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
      openDrawer('login');
      return;
    }

    await toggleVisited();
  };

  const handleAddToTrip = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (requiresAuth) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 2000);
      openDrawer('login');
      return;
    }

    // Use callback if provided, otherwise open quick trip selector
    if (onAddToTrip) {
      onAddToTrip();
    } else {
      openStoreDrawer('quick-trip-selector', {
        destinationSlug,
        destinationName,
        destinationCity,
      });
    }
  };

  const buttonSizeClass = compact ? 'h-8 w-8' : 'h-9 w-9';
  const iconSize = compact ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        variant="muted"
        size="icon-sm"
        className={cn(
          'rounded-full border border-neutral-200/80 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-white/15 dark:bg-gray-900/90 dark:text-gray-200',
          buttonSizeClass,
          isSaved && 'border-transparent bg-neutral-900 text-white hover:bg-neutral-900/90 dark:bg-white dark:text-neutral-900'
        )}
        aria-label={isSaved ? `Remove ${destinationName} from saved` : `Save ${destinationName}`}
        title={isSaved ? 'Saved' : 'Save'}
      >
        {isSaving ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Bookmark className={`${iconSize} ${isSaved ? 'fill-current' : ''}`} />
        )}
      </Button>

      {/* Visited Button */}
      <Button
        onClick={handleVisited}
        disabled={isMarkingVisited}
        variant="muted"
        size="icon-sm"
        className={cn(
          'rounded-full border border-neutral-200/80 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-white/15 dark:bg-gray-900/90 dark:text-gray-200',
          buttonSizeClass,
          isVisited && 'border-transparent bg-emerald-500 text-white hover:bg-emerald-500/90 dark:bg-emerald-500 dark:text-white'
        )}
        aria-label={isVisited ? `Unmark ${destinationName} as visited` : `Mark ${destinationName} as visited`}
        title={isVisited ? 'Visited' : 'Mark as visited'}
      >
        {isMarkingVisited ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : (
          <Check className={`${iconSize} ${isVisited ? 'stroke-[3]' : ''}`} />
        )}
      </Button>

      {/* Add to Trip Button */}
      {showAddToTrip && (
        <Button
          onClick={handleAddToTrip}
          variant="muted"
          size="icon-sm"
          className={cn(
            'rounded-full border border-neutral-200/80 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-white/15 dark:bg-gray-900/90 dark:text-gray-200',
            buttonSizeClass
          )}
          aria-label={`Add ${destinationName} to trip`}
          title="Add to trip"
        >
          <Plus className={iconSize} />
        </Button>
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
