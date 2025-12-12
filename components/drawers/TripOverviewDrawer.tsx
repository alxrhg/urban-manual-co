"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { useTrip } from '@/hooks/useTrip';
import Image from 'next/image';
import { formatTripDateWithYear } from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { useDrawerStyle } from '@/components/ui/UseDrawerStyle';

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
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export default function TripOverviewDrawer({ isOpen, onClose, trip: initialTrip }: TripOverviewDrawerProps) {
  const router = useRouter();
  const drawerStyle = useDrawerStyle();
  
  // If trip has an ID, fetch full trip data with days
  const { trip: fullTrip, loading } = useTrip(initialTrip?.id || null);
  const displayTrip = (fullTrip || initialTrip) as Trip | null;

  if (!displayTrip) {
    if (loading) {
      return (
        <Drawer
          isOpen={isOpen}
          onClose={onClose}
          title="Loading..."
          style={drawerStyle}
          position="right"
          desktopWidth="420px"
        >
          <div className="px-6 py-8 flex items-center justify-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading trip...</p>
          </div>
        </Drawer>
      );
    }
    return null;
  }

  const tripName = (displayTrip as any).name || displayTrip.title || 'Untitled Trip';
  const city = displayTrip.destination || 'Unknown';
  const coverImage = displayTrip.coverImage || displayTrip.cover_image;

  const startDate = formatTripDateWithYear(displayTrip.startDate || displayTrip.start_date);
  const endDate = formatTripDateWithYear(displayTrip.endDate || displayTrip.end_date);
  const dateRange = startDate && endDate ? `${startDate} – ${endDate}` : startDate || endDate || '';

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
    onClose();
    if (displayTrip.id) {
      setTimeout(() => {
        router.push(`/planning/trips/${displayTrip.id}`);
      }, 200);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      style={drawerStyle}
      position="right"
      desktopWidth="420px"
    >
      <DrawerHeader
        title={tripName}
        subtitle={city}
        rightAccessory={
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        }
      />

      <div className="px-6 py-6 space-y-8 overflow-y-auto h-[calc(100vh-64px)] pb-20">
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

        {/* METADATA */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {dateRange}
          </p>
        </div>

        {/* TRIP SUMMARY */}
        <section className="space-y-4">
          <UMSectionTitle>Trip Summary</UMSectionTitle>
          <Card className="p-4 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {dest.name}
                      </p>
                      {dest.city && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {dest.city}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {allDestinations.length > 10 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                    +{allDestinations.length - 10} more
                  </p>
                )}
              </div>
            )}
          </Card>
        </section>

        {/* HOTELS SECTION */}
        {hotels.length > 0 && (
          <section className="space-y-4">
            <UMSectionTitle>Hotels</UMSectionTitle>
            <div className="space-y-4">
              {hotels.map((hotel, idx) => (
                <Card key={idx} className="p-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {hotel.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {hotel.city}
                  </p>
                </Card>
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
              const from = flight.from || flight.departure || flight.depart || '';
              const to = flight.to || flight.arrival || flight.arrive || '';
              const time = flight.departureTime && flight.arrivalTime
                ? `${flight.departureTime} – ${flight.arrivalTime}`
                : flight.departureTime || '';

              return (
                <Card key={idx} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">{from}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">{to}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {time || 'Time TBD'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{flight.airline}</p>
                      {flight.flightNumber && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{flight.flightNumber}</p>
                      )}
                    </div>
                  </div>
                  {flight.confirmationNumber && (
                    <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <span className="text-xs text-gray-500">Confirmation</span>
                      <span className="text-xs font-mono font-medium">{flight.confirmationNumber}</span>
                    </div>
                  )}
                </Card>
              );
            })}
            </div>
          </section>
        )}

        {/* VIEW FULL TRIP BUTTON */}
        {displayTrip.id && (
          <div className="pt-4">
            <Button
              className="w-full py-4 rounded-2xl"
              onClick={handleViewTrip}
            >
              View Full Trip →
            </Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
