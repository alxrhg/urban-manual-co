'use client';

import React from 'react';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { MichelinBadge } from '@/components/badges/MichelinBadge';
import { GoogleRatingBadge } from '@/components/badges/GoogleRatingBadge';
import { MapPin, ExternalLink, Navigation, Clock, DollarSign } from 'lucide-react';

interface Place {
  name: string;
  category?: string;
  neighborhood?: string;
  city?: string;
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
  address?: string | null;
  website?: string | null;
  phone?: string | null;
  hours?: string | null;
  [key: string]: any;
}

interface DestinationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  place: Place | null;
  hideAddToTrip?: boolean;
}

function DestinationPhoto({ place }: { place: Place }) {
  const imageUrl = place.image || place.image_thumbnail;

  if (!imageUrl) {
    return (
      <div className="w-full aspect-[16/10] bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <MapPin className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
      <Image
        src={imageUrl}
        alt={place.name}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 420px"
      />
    </div>
  );
}

function DestinationMapPreview({ place }: { place: Place }) {
  if (!place.latitude || !place.longitude) {
    return null;
  }

  // Static map using OpenStreetMap tiles
  const zoom = 15;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${place.longitude - 0.005}%2C${place.latitude - 0.003}%2C${place.longitude + 0.005}%2C${place.latitude + 0.003}&layer=mapnik&marker=${place.latitude}%2C${place.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <div className="space-y-2">
      <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        <iframe
          src={mapUrl}
          className="w-full h-full border-0"
          loading="lazy"
          title="Map"
        />
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <Navigation className="w-3.5 h-3.5" />
        Get directions
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function PriceIndicator({ level }: { level: string | number }) {
  const numLevel = typeof level === 'number' ? level : parseInt(level, 10) || 0;
  const dollars = Math.min(Math.max(numLevel, 1), 4);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map((i) => (
        <DollarSign
          key={i}
          className={`w-3 h-3 ${i <= dollars ? 'text-gray-900 dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
}

export default function DestinationDrawer({ isOpen, onClose, place, hideAddToTrip }: DestinationDrawerProps) {
  if (!place) return null;

  const {
    name,
    category,
    neighborhood,
    city,
    michelinRating,
    hasMichelin,
    googleRating,
    googleReviews,
    priceLevel,
    description,
    address,
    website,
    hours,
  } = place;

  const rightBadges = (
    <div className="flex items-center gap-2">
      {hasMichelin && <MichelinBadge rating={michelinRating} />}
      {googleRating && (
        <GoogleRatingBadge rating={googleRating} count={googleReviews || null} />
      )}
    </div>
  );

  const locationText = [neighborhood, city].filter(Boolean).join(', ');

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader
        title={name}
        subtitle={[category, locationText].filter(Boolean).join(' · ')}
        rightAccessory={rightBadges}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-20">
        {/* Photo */}
        <DrawerSection>
          <DestinationPhoto place={place} />
        </DrawerSection>

        {/* Quick Info */}
        <DrawerSection bordered>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {priceLevel && <PriceIndicator level={priceLevel} />}
            {hasMichelin && <MichelinBadge rating={michelinRating} />}
            {googleRating && (
              <GoogleRatingBadge rating={googleRating} count={googleReviews || null} />
            )}
          </div>
        </DrawerSection>

        {/* Description */}
        {description && (
          <DrawerSection bordered>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {description}
            </p>
          </DrawerSection>
        )}

        {/* Location & Map */}
        <DrawerSection bordered>
          <div className="space-y-3">
            {(address || locationText) && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">
                  {address || locationText}
                </span>
              </div>
            )}
            {hours && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-600 dark:text-gray-400">{hours}</span>
              </div>
            )}
            <DestinationMapPreview place={place} />
          </div>
        </DrawerSection>

        {/* Website Link */}
        {website && (
          <DrawerSection bordered>
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-900 dark:text-white hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Visit website
            </a>
          </DrawerSection>
        )}
      </div>

      {!hideAddToTrip && (
        <DrawerActionBar>
          <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            Add to trip
          </button>
        </DrawerActionBar>
      )}
    </Drawer>
  );
}
