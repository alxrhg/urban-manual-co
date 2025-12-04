"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AddPanelHeader } from "./AddPanelHeader";
import { AddPanelTabs, type AddPanelTab } from "./AddPanelTabs";
import { PlacesTab } from "./PlacesTab";
import { TransportTab } from "./TransportTab";
import { StayTab } from "./StayTab";
import type { Trip, ItineraryItem, HotelBooking, Flight } from "@/types/trip";
import type { Destination } from "@/types/destination";

export interface AddToTripPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  hotels: HotelBooking[];
  existingItems: ItineraryItem[];
  // Context passed when opening
  initialDay?: number;
  initialTime?: string;
  afterItemId?: string;
  // Callbacks
  onAddItem: (item: Partial<ItineraryItem>) => void;
  onAddFlight: (flight: Partial<Flight>) => void;
  onAddHotel: (hotel: Partial<HotelBooking>) => void;
}

export function AddToTripPanel({
  isOpen,
  onClose,
  trip,
  hotels,
  existingItems,
  initialDay = 1,
  initialTime,
  afterItemId,
  onAddItem,
  onAddFlight,
  onAddHotel,
}: AddToTripPanelProps) {
  const [selectedDay, setSelectedDay] = React.useState(initialDay);
  const [selectedTime, setSelectedTime] = React.useState<string | null>(
    initialTime || null
  );
  const [activeTab, setActiveTab] = React.useState<AddPanelTab>("places");

  // Reset state when panel opens with new context
  React.useEffect(() => {
    if (isOpen) {
      setSelectedDay(initialDay);
      setSelectedTime(initialTime || null);
    }
  }, [isOpen, initialDay, initialTime]);

  // Get the city from the trip for searching
  const tripCity = React.useMemo(() => {
    if (!trip.destination) return null;
    try {
      const destinations = JSON.parse(trip.destination);
      return Array.isArray(destinations) ? destinations[0] : trip.destination;
    } catch {
      return trip.destination;
    }
  }, [trip.destination]);

  if (!isOpen) return null;

  const handleAddPlace = (
    destination: Destination | null,
    options: {
      time?: string;
      duration?: number;
      partySize?: number;
      note?: string;
      source: "curated" | "google" | "manual";
      googlePlaceData?: {
        name: string;
        address?: string;
        rating?: number;
        placeId?: string;
        category?: string;
      };
    }
  ) => {
    const item: Partial<ItineraryItem> = {
      trip_id: trip.id,
      day: selectedDay,
      time: options.time || selectedTime || undefined,
      title: destination?.name || options.googlePlaceData?.name || "Custom Activity",
      destination_slug: destination?.slug || null,
      notes: JSON.stringify({
        source: options.source,
        duration: options.duration,
        partySize: options.partySize,
        category: destination?.category || options.googlePlaceData?.category,
        image: destination?.image,
        city: destination?.city || tripCity,
        latitude: destination?.latitude,
        longitude: destination?.longitude,
        raw: options.note,
        // Google-specific data
        ...(options.googlePlaceData && {
          googlePlaceId: options.googlePlaceData.placeId,
          googleRating: options.googlePlaceData.rating,
          address: options.googlePlaceData.address,
        }),
      }),
    };
    onAddItem(item);
    onClose();
  };

  const handleAddTransport = (item: Partial<ItineraryItem>) => {
    onAddItem({
      ...item,
      trip_id: trip.id,
      day: selectedDay,
    });
    onClose();
  };

  const handleAddFlightData = (flight: Partial<Flight>) => {
    onAddFlight({
      ...flight,
      tripId: trip.id,
    });
    onClose();
  };

  const handleAddHotelData = (hotel: Partial<HotelBooking>) => {
    onAddHotel({
      ...hotel,
      tripId: trip.id,
    });
    onClose();
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50",
        "w-[420px] max-w-full",
        "bg-white border-l border-gray-200 shadow-xl",
        "flex flex-col",
        "animate-in slide-in-from-right duration-300"
      )}
    >
      {/* Header with day/time selection */}
      <AddPanelHeader
        trip={trip}
        selectedDay={selectedDay}
        selectedTime={selectedTime}
        existingItems={existingItems}
        onDayChange={setSelectedDay}
        onTimeChange={setSelectedTime}
        onClose={onClose}
      />

      {/* Tab navigation */}
      <AddPanelTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "places" && (
          <PlacesTab
            trip={trip}
            tripCity={tripCity}
            selectedDay={selectedDay}
            selectedTime={selectedTime}
            existingItems={existingItems}
            hotels={hotels}
            onAdd={handleAddPlace}
          />
        )}

        {activeTab === "transport" && (
          <TransportTab
            trip={trip}
            selectedDay={selectedDay}
            hotels={hotels}
            existingItems={existingItems}
            onAddFlight={handleAddFlightData}
            onAddTransport={handleAddTransport}
          />
        )}

        {activeTab === "stay" && (
          <StayTab
            trip={trip}
            tripCity={tripCity}
            onAddHotel={handleAddHotelData}
          />
        )}
      </div>
    </div>
  );
}
