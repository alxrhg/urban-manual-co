"use client";

import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
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

export default function TripOverviewDrawer({ trip }: TripOverviewDrawerProps) {
  const { openDrawer } = useDrawerStore();

  if (!trip) return null;

  const tripName = trip.name || trip.title || 'Untitled Trip';
  const city = trip.destination || 'Unknown';
  const coverImage = trip.coverImage || trip.cover_image;
  
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

  const startDate = formatDate(trip.startDate || trip.start_date);
  const endDate = formatDate(trip.endDate || trip.end_date);
  const dateRange = startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate || '';

  const handleSave = () => {
    console.log("Save trip:", trip.id);
    // TODO: Implement save functionality
  };

  const handleShare = () => {
    console.log("Share trip:", trip.id);
    // TODO: Implement share functionality
  };

  const handlePrint = () => {
    console.log("Print trip:", trip.id);
    window.print();
  };

  return (
    <div className="px-6 py-6 space-y-10">
      {/* COVER IMAGE */}
      {coverImage && (
        <div className="w-full h-48 relative overflow-hidden rounded-[16px]">
          <Image
            src={coverImage}
            alt={tripName}
            fill
            className="object-cover"
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

      {/* ACTION BUTTONS */}
      <div className="flex flex-wrap gap-2">
        <UMActionPill onClick={handleSave}>Save</UMActionPill>
        <UMActionPill onClick={handleShare}>Share</UMActionPill>
        <UMActionPill onClick={handlePrint}>Print</UMActionPill>
        <UMActionPill
          variant="primary"
          onClick={() => openDrawer("trip-day-editor", { trip })}
        >
          Overview
        </UMActionPill>
      </div>

      {/* DAYS SECTION */}
      {trip.days && trip.days.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Days</UMSectionTitle>
          <div className="space-y-4">
            {trip.days.map((day, i) => {
              const dayCoverImage = day.coverImage;
              const dayDate = day.date || '';
              const dayCity = day.city || '';

              return (
                <UMCard
                  key={i}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() =>
                    openDrawer("trip-day-editor", {
                      day,
                      index: i,
                      trip,
                    })
                  }
                >
                  {dayCoverImage && (
                    <div className="w-full h-32 relative overflow-hidden rounded-[16px] mb-3">
                      <Image
                        src={dayCoverImage}
                        alt={`Day ${i + 1}`}
                        fill
                        className="object-cover"
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
      {trip.hotels && trip.hotels.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Hotels</UMSectionTitle>
          <div className="space-y-4">
            {trip.hotels.map((hotel, idx) => (
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
      {trip.flights && trip.flights.length > 0 && (
        <section className="space-y-4">
          <UMSectionTitle>Flights</UMSectionTitle>
          <div className="space-y-4">
            {trip.flights.map((flight, idx) => {
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
    </div>
  );
}

