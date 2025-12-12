'use client';

import { Destination } from '@/types/destination';
import { InspectorHero, InspectorHeroProps } from './InspectorHero';
import { InspectorInfo, InspectorInfoProps } from './InspectorInfo';
import { InspectorMap, InspectorMapProps } from './InspectorMap';
import { InspectorActions, InspectorActionsProps } from './InspectorActions';
import { InspectorContact, InspectorContactProps } from './InspectorContact';

/**
 * InspectorPanel - Unified destination detail panel
 *
 * A composable panel that brings together all inspector blocks.
 * Can be used in two modes:
 *
 * 1. **Drawer Mode** (Homepage): Full experience inside a floating drawer
 * 2. **Inline Mode** (Trip Studio): Pinned panel without drawer wrapper
 *
 * This ensures visual and behavioral consistency across the app,
 * making the system feel cohesive rather than two apps glued together.
 *
 * @example
 * // In DestinationDrawer (Homepage)
 * <Drawer isOpen={isOpen} onClose={onClose}>
 *   <InspectorPanel
 *     destination={destination}
 *     enrichedData={enrichedData}
 *     mode="drawer"
 *   />
 * </Drawer>
 *
 * @example
 * // In Trip Studio (Right Panel)
 * <aside className="fixed right-0 w-96">
 *   <InspectorPanel
 *     destination={selectedPlace}
 *     enrichedData={enrichedData}
 *     mode="inline"
 *     compact
 *   />
 * </aside>
 */

export interface EnrichedData {
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  vicinity?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  international_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  current_opening_hours?: {
    weekday_text?: string[];
  };
  timezone_id?: string;
  utc_offset?: number;
  editorial_summary?: string;
  [key: string]: unknown;
}

export interface InspectorPanelProps {
  /** The destination to display */
  destination: Destination;
  /** Enriched data from Google Places API */
  enrichedData?: EnrichedData | null;
  /** Parent destination if this is a nested venue */
  parentDestination?: Destination | null;
  /** Display mode: 'drawer' for homepage, 'inline' for trip studio */
  mode?: 'drawer' | 'inline';
  /** Whether to show a compact version (smaller, tighter spacing) */
  compact?: boolean;
  /** Whether the user is logged in */
  isLoggedIn?: boolean;
  /** Current saved state */
  isSaved?: boolean;
  /** Current visited state */
  isVisited?: boolean;

  // Action callbacks
  onCityClick?: (city: string) => void;
  onSave?: () => void;
  onUnsave?: () => void;
  onOpenSaveModal?: () => void;
  onVisitToggle?: () => void;
  onOpenVisitedModal?: () => void;
  onShare?: () => Promise<void>;
  onDirections?: () => void;
  onLoginRequired?: () => void;
  onNavigateToCollections?: () => void;
  onNavigateToTrips?: () => void;

  /** Which sections to show (default: all) */
  sections?: {
    hero?: boolean;
    actions?: boolean;
    info?: boolean;
    contact?: boolean;
    map?: boolean;
  };

  /** Additional className for the container */
  className?: string;
}

const defaultSections = {
  hero: true,
  actions: true,
  info: true,
  contact: true,
  map: true,
};

export function InspectorPanel({
  destination,
  enrichedData,
  parentDestination,
  mode = 'drawer',
  compact = false,
  isLoggedIn = false,
  isSaved = false,
  isVisited = false,
  onCityClick,
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
  sections = defaultSections,
  className = '',
}: InspectorPanelProps) {
  const showSection = { ...defaultSections, ...sections };
  const isInline = mode === 'inline';

  return (
    <div className={`${isInline ? '' : 'p-6'} ${className}`}>
      {/* Hero Section */}
      {showSection.hero && (
        <InspectorHero
          destination={destination}
          enrichedData={enrichedData}
          compact={compact}
          imageAspect={isInline ? '16/9' : '4/3'}
          onCityClick={onCityClick}
          className={isInline ? '' : 'mt-[18px]'}
        />
      )}

      {/* Action Buttons */}
      {showSection.actions && (
        <InspectorActions
          destination={destination}
          isLoggedIn={isLoggedIn}
          isSaved={isSaved}
          isVisited={isVisited}
          onSave={onSave}
          onUnsave={onUnsave}
          onOpenSaveModal={onOpenSaveModal}
          onVisitToggle={onVisitToggle}
          onOpenVisitedModal={onOpenVisitedModal}
          onShare={onShare}
          onDirections={onDirections}
          onLoginRequired={onLoginRequired}
          onNavigateToCollections={onNavigateToCollections}
          onNavigateToTrips={onNavigateToTrips}
          compact={compact}
          className="mt-4"
        />
      )}

      {/* Divider */}
      {(showSection.hero || showSection.actions) &&
        (showSection.info || showSection.contact || showSection.map) && (
          <div className="border-t border-gray-200 dark:border-gray-800 my-6" />
        )}

      {/* Info Section (Hours, Address) */}
      {showSection.info && (
        <InspectorInfo
          destination={destination}
          enrichedData={enrichedData}
          parentDestination={parentDestination}
          compact={compact}
        />
      )}

      {/* Contact & Booking */}
      {showSection.contact && (
        <>
          {showSection.info && (
            <div className="border-t border-gray-200 dark:border-gray-800 my-6" />
          )}
          <InspectorContact destination={destination} enrichedData={enrichedData} />
        </>
      )}

      {/* Map Section */}
      {showSection.map && (
        <>
          {(showSection.info || showSection.contact) && (
            <div className="border-t border-gray-200 dark:border-gray-800 my-6" />
          )}
          <InspectorMap
            destination={destination}
            enrichedData={enrichedData}
            height={compact ? '160px' : '192px'}
          />
        </>
      )}
    </div>
  );
}

export default InspectorPanel;
