"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import UMCard from "@/components/ui/UMCard";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useTrip } from '@/hooks/useTrip';
import Image from 'next/image';

interface Trip {
  id?: string;
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string | null;
  endDate?: string;
  end_date?: string | null;
  destination?: string | null;
  coverImage?: string;
  cover_image?: string | null;
  days?: Array<{
    date: string;
    city: string;
    coverImage?: string;
    [key: string]: any;
  }>;
  cities?: string[];
  hotels?: Array<{
    name: string;
    city: string;
    [key: string]: any;
  }>;
  flights?: Array<{
    airline: string;
    flightNumber: string;
    departure?: string;
    depart?: string;
    arrival?: string;
    arrive?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface TripOverviewDrawerProps {
  trip: Trip | null;
}

export default function TripOverviewDrawer({ trip: initialTrip }: TripOverviewDrawerProps) {
  const router = useRouter();
  const { closeDrawer } = useDrawerStore();
  
  // If trip has an ID, fetch full trip data with days
  const { trip: fullTrip, loading } = useTrip(initialTrip?.id || null);
  const displayTrip = (fullTrip || initialTrip) as Trip | null;

  if (!displayTrip) {
    if (loading) {
      return (
        <div className="px-6 py-8 flex items-center justify-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading trip...</p>
        </div>
      );
    }
    return null;
  }

  const tripName = (displayTrip as any).name || displayTrip.title || 'Untitled Trip';
  const city = displayTrip.destination || 'Unknown';
  const coverImage = displayTrip.coverImage || displayTrip.cover_image;
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      // Parse date string as local date (YYYY-MM-DD format)
      // Split to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      if (year && month && day) {
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      // Fallback to original parsing if format is different
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const startDate = formatDate(displayTrip.startDate || displayTrip.start_date);
  const endDate = formatDate(displayTrip.endDate || displayTrip.end_date);
  const dateRange = startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate || '';

  // Extract cities from days if cities array is empty
  const days = displayTrip.days || [];
  const cities = displayTrip.cities || (days.length > 0 ? [...new Set(days.map(d => d.city).filter(Boolean))] : []);
  const hotels = displayTrip.hotels || [];
  const flights = displayTrip.flights || [];

  // Extract all destinations/places from days activities
  const allDestinations: Array<{ name: string; city?: string; image?: string }> = [];
  if (days.length > 0) {
    days.forEach(day => {
      // Extract from activities
      if (day.activities && Array.isArray(day.activities)) {
        day.activities.forEach((activity: any) => {
          const name = activity.title || activity.name || '';
          if (name && !name.toLowerCase().includes('hotel') && !allDestinations.find(d => d.name === name)) {
            allDestinations.push({
              name,
              city: activity.city || day.city || '',
              image: activity.image || activity.image_thumbnail || null,
            });
          }
        });
      }
      // Also check meals for destinations
      if (day.meals) {
        Object.values(day.meals).forEach((meal: any) => {
          if (meal && meal.title) {
            const name = meal.title;
            if (name && !allDestinations.find(d => d.name === name)) {
              allDestinations.push({
                name,
                city: meal.city || day.city || '',
                image: meal.image || meal.image_thumbnail || null,
              });
            }
          }
        });
      }
    });
  }

  const handleViewTrip = () => {
    closeDrawer();
    if (displayTrip.id) {
      setTimeout(() => {
        router.push(`/trips/${displayTrip.id}`);
      }, 200);
    }
  };

  return (
    <div className="px-6 py-8 space-y-10">
      {/* COVER IMAGE */}
      {coverImage && (
        <div className="w-full h-48 relative overflow-hidden rounded-[16px]">
          <Image
            src={coverImage}
            alt={tripName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
          />
        </div>
      )}

      {/* TITLE + METADATA */}
      <div className="space-y-1">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">
          {tripName}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
          {city} {dateRange && `• ${dateRange}`}
        </p>
      </div>

      {/* TRIP SUMMARY */}
      <section className="space-y-4">
        <UMSectionTitle>Trip Summary</UMSectionTitle>
        <UMCard className="p-4 space-y-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {days.length} day{days.length !== 1 ? 's' : ''} · {cities.length > 0 ? cities.join(', ') : 'No cities'}
          </p>
          
          {/* Compact list of destinations */}
          {allDestinations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              {allDestinations.slice(0, 10).map((dest, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  {dest.image && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={dest.image}
                        alt={dest.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {dest.name}
                    </p>
                    {dest.city && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {dest.city}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {allDestinations.length > 10 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 pt-1">
                  +{allDestinations.length - 10} more
                </p>
              )}
            </div>
          )}
        </UMCard>
      </section>

      {/* DAYS SECTION */}
      {days.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Days</UMSectionTitle>
          <div className="space-y-4">
            {days.map((day, i) => {
              const dayCoverImage = day.coverImage;
              const dayDate = day.date || '';
              const dayCity = day.city || '';

              return (
                <UMCard
                  key={i}
                  className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
                  onClick={() => {
                    closeDrawer();
                    if (displayTrip.id) {
                      setTimeout(() => {
                        router.push(`/trips/${displayTrip.id}?day=${i}`);
                      }, 200);
                    }
                  }}
                >
                  {dayCoverImage && (
                    <div className="w-full h-32 relative overflow-hidden rounded-[16px] mb-3">
                      <Image
                        src={dayCoverImage}
                        alt={`Day ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 640px"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Day {i + 1}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {dayCity} {dayDate && `• ${dayDate}`}
                    </p>
                  </div>
                </UMCard>
              );
            })}
          </div>
        </section>
      )}

      {/* HOTELS SECTION */}
      {hotels.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Hotels</UMSectionTitle>
          <div className="space-y-4">
            {hotels.map((hotel, idx) => (
              <UMCard key={idx} className="p-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {hotel.name}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {hotel.city}
                </p>
              </UMCard>
            ))}
          </div>
        </section>
      )}

      {/* FLIGHTS SECTION */}
      {flights.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Flights</UMSectionTitle>
          <div className="space-y-4">
            {flights.map((flight, idx) => {
              const depart = flight.departure || flight.depart || '';
              const arrive = flight.arrival || flight.arrive || '';

              return (
                <UMCard key={idx} className="p-4 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {flight.airline}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {depart && arrive ? `${depart} → ${arrive}` : depart || arrive}
                  </p>
                  {flight.flightNumber && (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {flight.flightNumber}
                    </p>
                  )}
                </UMCard>
              );
            })}
          </div>
        </section>
      )}

      {/* VIEW FULL TRIP BUTTON */}
      {displayTrip.id && (
        <div className="pt-4">
          <UMCard 
            className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
            onClick={handleViewTrip}
          >
            <p className="font-medium text-gray-900 dark:text-white text-center">
              View Full Trip →
            </p>
          </UMCard>
        </div>
      )}
    </div>
  );
}
