'use client';

import React from 'react';
import { EnhancedSavedTab } from '@/components/EnhancedSavedTab';
import type { SavedPlace } from '@/types/common';

interface SavedTabProps {
  savedPlaces: SavedPlace[];
}

export default function SavedTab({ savedPlaces }: SavedTabProps) {
  return (
    <div className="fade-in">
      <EnhancedSavedTab savedPlaces={savedPlaces} />
    </div>
  );
}

