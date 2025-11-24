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
        <UMCard className="p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {days.length} day{days.length !== 1 ? 's' : ''} · {cities.length > 0 ? cities.join(', ') : 'No cities'}
          </p>
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
