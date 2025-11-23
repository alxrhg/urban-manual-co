'use client';

import React from 'react';
import Drawer from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

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
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export default function TripOverviewDrawer({ isOpen, onClose, trip }: TripOverviewDrawerProps) {
  if (!trip) return null;

  const tripName = trip.name || trip.title || 'Untitled Trip';
  const startDate = trip.startDate || trip.start_date || '';
  const endDate = trip.endDate || trip.end_date || '';
  const days = trip.days || [];
  const cities = trip.cities || [];
  const hotels = trip.hotels || [];
  const flights = trip.flights || [];

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <div className="h-full flex flex-col">
        <DrawerHeader
          title={tripName}
          subtitle={startDate && endDate ? `${startDate} – ${endDate}` : undefined}
          leftAccessory={
            <button
              className="text-sm opacity-70 hover:opacity-100 transition-opacity"
              onClick={onClose}
            >
              ←
            </button>
          }
        />

        <div className="overflow-y-auto flex-1 space-y-10 pb-20 px-4">
          {/* SUMMARY */}
          <DrawerSection bordered>
            <h3 className="font-medium text-gray-900 dark:text-white">Trip Summary</h3>
            <p className="text-sm text-[var(--um-text-muted)] mt-1">
              {days.length} day{days.length !== 1 ? 's' : ''} · {cities.length > 0 ? cities.join(', ') : 'No cities'}
            </p>
          </DrawerSection>

          {/* HOTELS */}
          {hotels.length > 0 && (
            <DrawerSection bordered>
              <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Hotels</h3>
              <div className="space-y-3">
                {hotels.map((h, i) => (
                  <div
                    key={i}
                    className="border border-[var(--um-border)] rounded-xl p-4 bg-white dark:bg-gray-950"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{h.name}</p>
                    <p className="text-xs text-[var(--um-text-muted)]">{h.city}</p>
                  </div>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* FLIGHTS */}
          {flights.length > 0 && (
            <DrawerSection bordered>
              <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Flights</h3>
              <div className="space-y-3">
                {flights.map((f, i) => (
                  <div
                    key={i}
                    className="border border-[var(--um-border)] rounded-xl p-4 bg-white dark:bg-gray-950"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {f.airline} · {f.flightNumber}
                    </p>
                    <p className="text-xs text-[var(--um-text-muted)]">
                      {f.departure} → {f.arrival}
                    </p>
                  </div>
                ))}
              </div>
            </DrawerSection>
          )}

          {/* DAYS */}
          <DrawerSection>
            <h3 className="font-medium mb-3 text-gray-900 dark:text-white">Days</h3>
            <div className="space-y-3">
              {days.map((d, i) => (
                <div
                  key={i}
                  className="border border-[var(--um-border)] rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors bg-white dark:bg-gray-950"
                  onClick={() => {
                    onClose();
                    if (trip.id) {
                      window.location.assign(`/trips/${trip.id}?day=${i}`);
                    }
                  }}
                >
                  <p className="font-medium text-gray-900 dark:text-white">
                    Day {i + 1} – {d.date}
                  </p>
                  <span className="text-sm text-[var(--um-text-muted)]">→</span>
                </div>
              ))}
            </div>
          </DrawerSection>
        </div>
      </div>
    </Drawer>
  );
}
