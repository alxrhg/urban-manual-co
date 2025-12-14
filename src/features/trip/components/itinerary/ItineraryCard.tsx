'use client';

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  FlightCard,
  RestaurantCard,
  AttractionCard,
  MinimalActivityCard,
  OvernightCard,
  TransportCard,
  CustomCard,
} from '../cards';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  mapIndex?: number;
}

/**
 * ItineraryCard - Dispatches to the appropriate card type based on item category
 */
export default function ItineraryCard({
  item,
  isActive = false,
  onClick,
  mapIndex,
}: ItineraryCardProps) {
  const category = item.parsedNotes?.category || item.parsedNotes?.type || '';
  const type = item.parsedNotes?.type;

  // Determine the card type to render
  if (type === 'flight') {
    return (
      <FlightCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  if (type === 'hotel') {
    return (
      <OvernightCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  if (type === 'train' || type === 'drive' || category === 'transport') {
    return (
      <TransportCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  if (category === 'hotel_activity' || category === 'airport_activity') {
    return (
      <MinimalActivityCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  if (category === 'restaurant' || category === 'bar' || category === 'cafe') {
    return (
      <RestaurantCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  if (category === 'attraction' || category === 'museum' || category === 'landmark') {
    return (
      <AttractionCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  // Default to CustomCard for unknown types
  return (
    <CustomCard
      item={item}
      isSelected={isActive}
      onSelect={onClick || (() => {})}
    />
  );
}
