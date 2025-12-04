'use client';

import React from 'react';
import { EnhancedVisitedTab } from '@/components/account/EnhancedVisitedTab';
import type { VisitedPlace } from '@/types/common';

interface VisitedTabProps {
  visitedPlaces: VisitedPlace[];
  onPlaceAdded: () => void;
}

export default function VisitedTab({ visitedPlaces, onPlaceAdded }: VisitedTabProps) {
  return (
    <div className="fade-in">
      <EnhancedVisitedTab
        visitedPlaces={visitedPlaces}
        onPlaceAdded={onPlaceAdded}
      />
    </div>
  );
}

