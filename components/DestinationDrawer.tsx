'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { MichelinBadge } from '@/components/badges/MichelinBadge';
import { GoogleRatingBadge } from '@/components/badges/GoogleRatingBadge';

interface Place {
  name: string;
  category?: string;
  neighborhood?: string;
  michelinRating?: number | string | null;
  hasMichelin?: boolean;
  googleRating?: number | null;
  googleReviews?: number | null;
  priceLevel?: string | number;
  description?: string;
  image?: string | null;
  image_thumbnail?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

interface DestinationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
}

// Placeholder components - to be implemented with full functionality
function DestinationPhotos({ place }: { place: Place }) {
  return (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <span className="text-sm text-gray-500">Photo Gallery</span>
    </div>
  );
}

function DestinationLocation({ place }: { place: Place }) {
  return <div className="text-sm">Location: {place.neighborhood || 'Location'}</div>;
}

function DestinationMapPreview({ place }: { place: Place }) {
  return (
    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <span className="text-xs text-gray-500">Map Preview</span>
    </div>
  );
}

function DestinationActions({ place }: { place: Place }) {
  return (
    <div className="flex gap-2">
      <button className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm">
        Save
      </button>
      <button className="px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm">
        Share
      </button>
    </div>
  );
}

export default function DestinationDrawer({ isOpen, onClose, place }: DestinationDrawerProps) {
  if (!place) return null;

  const {
    name,
    category,
    neighborhood,
    michelinRating,
    hasMichelin,
    googleRating,
    googleReviews,
    priceLevel,
    description,
  } = place;

  const rightBadges = (
    <div className="flex items-center gap-2">
      {hasMichelin && <MichelinBadge rating={michelinRating} />}
      {googleRating && (
        <GoogleRatingBadge rating={googleRating} count={googleReviews || null} />
      )}
    </div>
  );

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader
        title={name}
        subtitle={[category, neighborhood].filter(Boolean).join(' · ')}
        rightAccessory={rightBadges}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        <DrawerSection>
          {/* Photo gallery */}
          <DestinationPhotos place={place} />
        </DrawerSection>

        <DrawerSection bordered>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {priceLevel && <span>{priceLevel}</span>}
            {hasMichelin && <MichelinBadge rating={michelinRating} />}
            {googleRating && (
              <GoogleRatingBadge rating={googleRating} count={googleReviews || null} />
            )}
          </div>
        </DrawerSection>

        {description && (
          <DrawerSection bordered>
            <p className="text-sm text-muted-foreground">{description}</p>
          </DrawerSection>
        )}

        <DrawerSection bordered>
          <DestinationLocation place={place} />
          <div className="mt-3">
            <DestinationMapPreview place={place} />
          </div>
        </DrawerSection>

        <DrawerSection>
          <DestinationActions place={place} />
        </DrawerSection>
      </div>

      <DrawerActionBar>
        <button className="bg-black text-white rounded-full px-4 py-2">
          Add to trip
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
