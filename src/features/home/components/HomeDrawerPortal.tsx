'use client';

import dynamic from 'next/dynamic';
import { Destination } from '@/types/destination';

const DestinationDrawer = dynamic(
  () => import('@/src/features/detail/DestinationDrawer').then(mod => ({ default: mod.DestinationDrawer })),
  {
    ssr: false,
    loading: () => null,
  }
);

interface HomeDrawerPortalProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onVisitToggle: (slug: string, visited: boolean) => void;
}

export function HomeDrawerPortal({ destination, isOpen, onClose, onVisitToggle }: HomeDrawerPortalProps) {
  return (
    <DestinationDrawer
      destination={destination}
      isOpen={isOpen}
      onClose={onClose}
      onVisitToggle={onVisitToggle}
    />
  );
}
