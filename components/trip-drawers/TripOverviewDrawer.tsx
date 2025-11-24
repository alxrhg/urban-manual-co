'use client';

import React from 'react';
import UMCard from '@/components/ui/UMCard';
import UMSectionTitle from '@/components/ui/UMSectionTitle';
import { useDrawerStore } from '@/lib/stores/drawer-store';

interface Trip {
  id?: string;
  name?: string;
  title?: string;
  startDate?: string;
  start_date?: string | null;
  endDate?: string;
  end_date?: string | null;
  days?: Array<{
    date: string;
    city: string;
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
    departure: string;
    arrival: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

interface TripOverviewDrawerProps {
  trip: Trip | null;
}

export default function TripOverviewDrawer({ trip }: TripOverviewDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  
  if (!trip) return null;

  const tripName = trip.name || trip.title || 'Untitled Trip';
  const startDate = trip.startDate || trip.start_date || '';
  const endDate = trip.endDate || trip.end_date || '';
  const days = trip.days || [];
  const cities = trip.cities || [];
  const hotels = trip.hotels || [];
  const flights = trip.flights || [];

  return (
    <div className="px-6 py-8 space-y-10">
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
              {days.map((d, i) => (
              <UMCard
                  key={i}
                className="p-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/10 transition"
                  onClick={() => {
                  closeDrawer();
                    if (trip.id) {
                      window.location.assign(`/trips/${trip.id}?day=${i}`);
                    }
                  }}
                >
                <div className="flex justify-between items-center">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Day {i + 1} – {d.date}
                  </p>
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">→</span>
                </div>
                {d.city && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {d.city}
                  </p>
                )}
              </UMCard>
            ))}
          </div>
        </section>
      )}

      {/* HOTELS SECTION */}
      {hotels.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Hotels</UMSectionTitle>
          <div className="space-y-4">
            {hotels.map((h, i) => (
              <UMCard key={i} className="p-4">
                <p className="font-medium text-gray-900 dark:text-white">{h.name}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{h.city}</p>
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
            {flights.map((f, i) => (
              <UMCard key={i} className="p-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {f.airline} · {f.flightNumber}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {f.departure} → {f.arrival}
                </p>
              </UMCard>
            ))}
        </div>
        </section>
      )}
      </div>
  );
}
