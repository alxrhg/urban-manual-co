'use client';

import { useMemo } from 'react';
import { PlannerProvider } from '@/contexts/PlannerContext';
import { PlannerSurface } from './PlannerSurface';

interface PlannerPageClientProps {
  tripId?: number | null;
}

export function PlannerPageClient({ tripId }: PlannerPageClientProps) {
  const resolvedTripId = useMemo(() => {
    if (tripId == null) return undefined;
    return tripId;
  }, [tripId]);

  return (
    <PlannerProvider tripId={resolvedTripId}>
      <PlannerSurface />
    </PlannerProvider>
  );
}

export default PlannerPageClient;
