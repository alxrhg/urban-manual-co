import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import TripCanvas from '@/components/trip/canvas/TripCanvas';
import type { Destination } from '@/types/destination';

// Revalidate every 5 minutes
export const revalidate = 300;

interface StudioPageProps {
  searchParams: Promise<{ city?: string }>;
}

async function getDestinations(city: string): Promise<Destination[]> {
  if (!city) return [];

  try {
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('destinations')
      .select('slug, name, city, neighborhood, category, description, micro_description, image, image_thumbnail, latitude, longitude, rating, michelin_stars, price_level, website, phone_number')
      .ilike('city', city)
      .limit(100);

    if (error) {
      console.error('Error fetching destinations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDestinations:', error);
    return [];
  }
}

function StudioLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
      {/* Left Panel Skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </div>

      {/* Divider */}
      <div className="w-px bg-gray-200 dark:bg-gray-800" />

      {/* Right Panel Skeleton */}
      <div className="w-80 lg:w-96 p-4 space-y-4 bg-white dark:bg-gray-900">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="flex gap-2">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>
        <div className="space-y-3 mt-4">
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default async function StudioPage({ searchParams }: StudioPageProps) {
  const params = await searchParams;
  const city = params.city || '';

  // Fetch destinations for the city
  const destinations = await getDestinations(city);

  return (
    <Suspense fallback={<StudioLoading />}>
      <TripCanvas
        destinations={destinations}
        city={city}
      />
    </Suspense>
  );
}

// Metadata
export async function generateMetadata({ searchParams }: StudioPageProps) {
  const params = await searchParams;
  const city = params.city;

  return {
    title: city ? `Plan ${city} Trip | Urban Studio` : 'Urban Studio | Trip Planner',
    description: city
      ? `Plan your perfect ${city} trip with Urban Studio. Drag and drop curated spots to build your itinerary.`
      : 'Build your perfect trip itinerary with Urban Studio. Drag, drop, done.',
  };
}
