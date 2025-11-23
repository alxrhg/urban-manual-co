'use client';

import React from 'react';
import Image from 'next/image';

interface ItineraryItem {
  name?: string;
  title?: string;
  image?: string | null;
  type?: string;
  [key: string]: any;
}

interface ItineraryCardProps {
  item: ItineraryItem;
}

export default function ItineraryCard({ item }: ItineraryCardProps) {
  const itemName = item.name || item.title || 'Untitled';
  const itemImage = item.image || item.image_thumbnail || null;
  const itemType = item.type || '';

  return (
    <div className="rounded-2xl border border-[var(--um-border)] p-4 space-y-3 bg-white dark:bg-gray-950">
      {itemImage && (
        <div className="relative w-full h-44 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={itemImage}
            alt={itemName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 420px"
          />
        </div>
      )}
      <div>
        <p className="font-medium text-[16px] leading-tight text-gray-900 dark:text-white">
          {itemName}
        </p>
        <p className="text-sm text-[var(--um-text-muted)] capitalize mt-1">
          {itemType === 'activity' ? 'Activity' : itemType === 'hotel' ? 'Hotel' : itemType || ''}
        </p>
      </div>
    </div>
  );
}

