'use client';

import { memo } from 'react';
import MinimalFloatingTripPanel, { useFloatingTripPanel } from './MinimalFloatingTripPanel';

/**
 * FloatingTripPanelWrapper - Self-contained wrapper for the floating trip panel
 *
 * Fetches the user's next upcoming trip and displays a floating panel
 * in the bottom-right corner. Handles:
 * - Authentication check (graceful fallback)
 * - Dismissal with 24h memory
 * - Loading state
 *
 * Add to layout.tsx alongside ResponsiveTripUI
 */
const FloatingTripPanelWrapper = memo(function FloatingTripPanelWrapper() {
  const { nextTrip, showPanel, isLoading, closePanel } = useFloatingTripPanel();

  // Don't render while loading or if there's no trip
  if (isLoading || !nextTrip || !showPanel) {
    return null;
  }

  return (
    <MinimalFloatingTripPanel
      tripId={nextTrip.id}
      tripName={nextTrip.name}
      items={nextTrip.items}
      startDate={nextTrip.start_date}
      isOpen={showPanel}
      onClose={closePanel}
    />
  );
});

export default FloatingTripPanelWrapper;
