'use client';

import { useState, useCallback } from 'react';
import { Bookmark, Share2, Check, Navigation, ChevronDown, List, Map, Plus, X } from 'lucide-react';
import { Destination } from '@/types/destination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * InspectorActions - Unified action buttons for destination detail views
 *
 * Displays Save, Share, Visited, and Directions buttons.
 * Used in both:
 * - Homepage floating drawer (DestinationDrawer)
 * - Trip Studio pinned right panel
 *
 * Provides consistent interaction patterns across the app.
 */

export interface InspectorActionsProps {
  destination: Destination;
  /** Whether the user is logged in */
  isLoggedIn: boolean;
  /** Current saved state */
  isSaved?: boolean;
  /** Current visited state */
  isVisited?: boolean;
  /** Callback when save button is clicked */
  onSave?: () => void;
  /** Callback when unsave is clicked */
  onUnsave?: () => void;
  /** Callback to open save modal */
  onOpenSaveModal?: () => void;
  /** Callback when visited button is clicked */
  onVisitToggle?: () => void;
  /** Callback to open visited modal */
  onOpenVisitedModal?: () => void;
  /** Callback when share button is clicked */
  onShare?: () => Promise<void>;
  /** Callback when directions button is clicked */
  onDirections?: () => void;
  /** Callback to navigate to login */
  onLoginRequired?: () => void;
  /** Callback to navigate to collections */
  onNavigateToCollections?: () => void;
  /** Callback to navigate to trips */
  onNavigateToTrips?: () => void;
  /** Whether to show compact pills */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

function capitalizeCity(city: string): string {
  return city
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function InspectorActions({
  destination,
  isLoggedIn,
  isSaved = false,
  isVisited = false,
  onSave,
  onUnsave,
  onOpenSaveModal,
  onVisitToggle,
  onOpenVisitedModal,
  onShare,
  onDirections,
  onLoginRequired,
  onNavigateToCollections,
  onNavigateToTrips,
  compact = false,
  className = '',
}: InspectorActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);

  const handleShare = useCallback(async () => {
    if (onShare) {
      await onShare();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onShare]);

  const handleSaveClick = useCallback(
    async (e: React.MouseEvent) => {
      if (!isLoggedIn) {
        e.preventDefault();
        onLoginRequired?.();
        return;
      }

      if (!isSaved) {
        e.preventDefault();
        onSave?.();
        onOpenSaveModal?.();
        setShowSaveDropdown(false);
      }
    },
    [isLoggedIn, isSaved, onSave, onOpenSaveModal, onLoginRequired]
  );

  const handleVisitedClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isLoggedIn) {
        e.preventDefault();
        onLoginRequired?.();
        return;
      }

      if (!isVisited) {
        e.preventDefault();
        onVisitToggle?.();
      }
    },
    [isLoggedIn, isVisited, onVisitToggle, onLoginRequired]
  );

  const buttonClass = compact
    ? 'px-2.5 py-1 border border-gray-200 dark:border-gray-800 rounded-xl text-[11px]'
    : 'px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs';

  const baseButtonStyle = `${buttonClass} text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5`;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Save Button with Dropdown */}
      <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
        <DropdownMenuTrigger asChild>
          <button className={baseButtonStyle} onClick={handleSaveClick}>
            <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
            {isSaved && <ChevronDown className="h-3 w-3 ml-0.5" />}
          </button>
        </DropdownMenuTrigger>
        {isSaved && (
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                onOpenSaveModal?.();
                setShowSaveDropdown(false);
              }}
            >
              <List className="h-3 w-3 mr-2" />
              Save to List
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onNavigateToTrips?.();
                setShowSaveDropdown(false);
              }}
            >
              <Map className="h-3 w-3 mr-2" />
              Save to Trip
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onNavigateToCollections?.();
                setShowSaveDropdown(false);
              }}
            >
              <Plus className="h-3 w-3 mr-2" />
              Create a List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onUnsave?.();
                setShowSaveDropdown(false);
              }}
            >
              <X className="h-3 w-3 mr-2" />
              Remove from Saved
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      {/* Share Button */}
      <button className={baseButtonStyle} onClick={handleShare}>
        <Share2 className="h-3 w-3" />
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* Visited Button with Dropdown (only for logged in users) */}
      {isLoggedIn && (
        <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
          <DropdownMenuTrigger asChild>
            <button
              className={`${buttonClass} transition-colors flex items-center gap-1.5 ${
                isVisited
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={handleVisitedClick}
            >
              <Check className={`h-3 w-3 ${isVisited ? 'stroke-[3]' : ''}`} />
              {isVisited ? 'Visited' : 'Mark Visited'}
              {isVisited && <ChevronDown className="h-3 w-3 ml-0.5" />}
            </button>
          </DropdownMenuTrigger>
          {isVisited && (
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  onOpenVisitedModal?.();
                  setShowVisitedDropdown(false);
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                Add Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  onVisitToggle?.();
                  setShowVisitedDropdown(false);
                }}
              >
                <X className="h-3 w-3 mr-2" />
                Remove Visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      )}

      {/* Directions Button */}
      {onDirections && (
        <a
          href={`https://maps.apple.com/?q=${encodeURIComponent(
            destination.name + ' ' + (destination.city ? capitalizeCity(destination.city) : '')
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className={baseButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            onDirections?.();
          }}
        >
          <Navigation className="h-3 w-3" />
          Directions
        </a>
      )}
    </div>
  );
}

export default InspectorActions;
