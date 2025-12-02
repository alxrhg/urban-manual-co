'use client';

import Link from 'next/link';
import { MapPin, Plane, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TripEmptyStateProps {
  type: 'not-found' | 'no-days' | 'no-flights' | 'no-hotels' | 'no-items';
  onBack?: () => void;
  onAddFirst?: () => void;
}

export function TripEmptyState({ type, onBack, onAddFirst }: TripEmptyStateProps) {
  if (type === 'not-found') {
    return (
      <main className="w-full px-4 sm:px-6 md:px-10 pt-16 pb-20 min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <MapPin className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Trip not found
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This trip doesn&apos;t exist or you don&apos;t have access to it.
              </p>
              <Button asChild>
                <Link href="/trips">Back to trips</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const configs = {
    'no-days': {
      icon: Calendar,
      title: 'No days in your trip yet',
      description: 'Add destinations to start planning your itinerary',
      buttonText: 'Add your first stop',
    },
    'no-flights': {
      icon: Plane,
      title: 'No flights added yet',
      description: 'Add your flight details to keep everything organized',
      buttonText: 'Add a flight',
    },
    'no-hotels': {
      icon: MapPin,
      title: 'No hotels added yet',
      description: 'Add your accommodation to complete your trip plan',
      buttonText: 'Add accommodation',
    },
    'no-items': {
      icon: MapPin,
      title: 'This day is empty',
      description: 'Add places, activities, or meals to this day',
      buttonText: 'Add something',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12 text-center">
        <Icon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
          {config.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          {config.description}
        </p>
        {onAddFirst && (
          <Button onClick={onAddFirst}>
            {config.buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
