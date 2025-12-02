'use client';

import { useState, useEffect } from 'react';
import { DestinationCard } from './DestinationCard';
import { createClient } from '@/lib/supabase/client';
import type { Destination } from '@/types/destination';

interface DestinationCardWithParentProps {
  destination: Destination;
  onClick?: () => void;
  index?: number;
  isVisited?: boolean;
  showBadges?: boolean;
  showQuickActions?: boolean;
  className?: string;
  onAddToTrip?: () => void;
}

/**
 * Wrapper for DestinationCard that automatically fetches and displays
 * parent destination info when the destination is nested.
 */
export function DestinationCardWithParent({
  destination,
  ...props
}: DestinationCardWithParentProps) {
  const [parentName, setParentName] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchParentName() {
      if (!destination.parent_destination_id) {
        setParentName(undefined);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('destinations')
          .select('name')
          .eq('id', destination.parent_destination_id)
          .single();

        if (!error && data?.name) {
          setParentName(data.name);
        }
      } catch (error) {
        console.warn('[DestinationCardWithParent] Failed to fetch parent:', error);
      }
    }

    fetchParentName();
  }, [destination.parent_destination_id]);

  return (
    <DestinationCard
      destination={destination}
      parentDestinationName={parentName}
      {...props}
    />
  );
}
