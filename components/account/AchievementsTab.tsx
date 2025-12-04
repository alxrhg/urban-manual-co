'use client';

import React from 'react';
import { AchievementsDisplay } from '@/components/gamification/AchievementsDisplay';
import type { VisitedPlace, SavedPlace } from '@/types/common';

interface AchievementsTabProps {
  visitedPlaces: VisitedPlace[];
  savedPlaces: SavedPlace[];
  uniqueCities: Set<string>;
  uniqueCountries: Set<string>;
}

export default function AchievementsTab({ visitedPlaces, savedPlaces, uniqueCities, uniqueCountries }: AchievementsTabProps) {
  return (
    <div className="fade-in">
      <AchievementsDisplay
        visitedPlaces={visitedPlaces}
        savedPlaces={savedPlaces}
        uniqueCities={uniqueCities}
        uniqueCountries={uniqueCountries}
      />
    </div>
  );
}

