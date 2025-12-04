"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronDown,
  Waves,
  Sofa,
  Sparkles,
  Dumbbell,
  Shower,
  Moon,
} from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import { TimeSlotPicker } from "./shared/TimeSlotPicker";
import type { Trip, ItineraryItem, HotelBooking, HotelActivityType } from "@/types/trip";

interface AddHotelActivitySheetProps {
  hotel: HotelBooking;
  trip: Trip;
  selectedDay: number;
  onAdd: (item: Partial<ItineraryItem>) => void;
  onClose: () => void;
}

type ActivityOption = {
  id: HotelActivityType;
  label: string;
  icon: React.ReactNode;
  available: (hotel: HotelBooking) => boolean;
  getHours?: (hotel: HotelBooking) => string | undefined;
  getLocation?: (hotel: HotelBooking) => string | undefined;
};

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: "pool",
    label: "Pool",
    icon: <Waves className="w-4 h-4" />,
    available: (hotel) => hotel.hasPool,
    getHours: (hotel) => hotel.poolHours,
  },
  {
    id: "lounge",
    label: "Lounge",
    icon: <Sofa className="w-4 h-4" />,
    available: (hotel) => hotel.hasLounge,
    getHours: (hotel) => hotel.loungeHours,
    getLocation: (hotel) => hotel.loungeLocation,
  },
  {
    id: "spa",
    label: "Spa",
    icon: <Sparkles className="w-4 h-4" />,
    available: (hotel) => hotel.hasSpa,
  },
  {
    id: "gym",
    label: "Gym",
    icon: <Dumbbell className="w-4 h-4" />,
    available: (hotel) => hotel.hasGym,
    getHours: (hotel) => hotel.gymHours,
  },
  {
    id: "get_ready",
    label: "Get ready",
    icon: <Shower className="w-4 h-4" />,
    available: () => true,
  },
  {
    id: "rest",
    label: "Rest/Nap",
    icon: <Moon className="w-4 h-4" />,
    available: () => true,
  },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
];

export function AddHotelActivitySheet({
  hotel,
  trip,
  selectedDay: initialDay,
  onAdd,
  onClose,
}: AddHotelActivitySheetProps) {
  const [selectedActivity, setSelectedActivity] =
    React.useState<HotelActivityType>("pool");
  const [day, setDay] = React.useState(initialDay);
  const [time, setTime] = React.useState<string | null>("15:00");
  const [duration, setDuration] = React.useState(120);
  const [notes, setNotes] = React.useState("");
  const [durationOpen, setDurationOpen] = React.useState(false);

  // Filter available activities
  const availableActivities = ACTIVITY_OPTIONS.filter((opt) =>
    opt.available(hotel)
  );

  // Set initial activity to first available
  React.useEffect(() => {
    if (availableActivities.length > 0 && !availableActivities.some((a) => a.id === selectedActivity)) {
      setSelectedActivity(availableActivities[0].id);
    }
  }, [availableActivities, selectedActivity]);

  const currentActivity = ACTIVITY_OPTIONS.find(
    (opt) => opt.id === selectedActivity
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activityLabels: Record<HotelActivityType, string> = {
      check_in: "Check-in",
      checkout: "Checkout",
      breakfast: "Breakfast",
      pool: "Pool Time",
      spa: "Spa",
      gym: "Gym",
      lounge: "Club Lounge",
      get_ready: "Get Ready",
      rest: "Rest",
    };

    const item: Partial<ItineraryItem> = {
      day,
      time: time || undefined,
      title: `${activityLabels[selectedActivity]} at ${hotel.name}`,
      notes: JSON.stringify({
        type: "hotel_activity",
        hotelItemType: selectedActivity,
        hotelBookingId: hotel.id,
        duration,
        location:
          selectedActivity === "lounge"
            ? hotel.loungeLocation
            : selectedActivity === "pool"
              ? "Pool"
              : hotel.name,
        raw: notes,
      }),
    };

    onAdd(item);
    onClose();
  };

  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Add Hotel Activity
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        {/* Hotel info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm text-gray-600">
            At: <span className="font-medium text-gray-900">{hotel.name}</span>
          </p>
        </div>

        {/* Activity selection */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Activity
          </h4>

          <div className="flex flex-wrap gap-2">
            {availableActivities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => setSelectedActivity(activity.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                  "text-sm font-medium transition-colors border",
                  selectedActivity === activity.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                {activity.icon}
                {activity.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity details */}
        {currentActivity && (
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
              <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                {currentActivity.icon}
              </span>
              <div>
                <p className="font-medium text-gray-900">
                  {currentActivity.label}
                </p>
                {currentActivity.getHours && currentActivity.getHours(hotel) && (
                  <p className="text-xs text-gray-500">
                    Available: {currentActivity.getHours(hotel)}
                  </p>
                )}
                {currentActivity.getLocation &&
                  currentActivity.getLocation(hotel) && (
                    <p className="text-xs text-gray-500">
                      Location: {currentActivity.getLocation(hotel)}
                    </p>
                  )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Day</span>
                <DayPicker trip={trip} value={day} onChange={setDay} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Time</span>
                <TimeSlotPicker value={time} onChange={setTime} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Duration</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDurationOpen(!durationOpen)}
                    className={cn(
                      "px-3 py-2 rounded-lg border border-gray-200",
                      "bg-white text-sm text-gray-900",
                      "hover:border-gray-300 transition-colors",
                      "flex items-center gap-2"
                    )}
                  >
                    {DURATION_OPTIONS.find((d) => d.value === duration)?.label}
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                  {durationOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-32 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setDuration(opt.value);
                            setDurationOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                            duration === opt.value && "bg-gray-50 font-medium"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">
                  Note
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes..."
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200",
                    "text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-gray-300"
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="p-4">
          <button
            type="submit"
            className={cn(
              "w-full py-3 rounded-full font-medium",
              "flex items-center justify-center gap-2",
              "bg-gray-900 text-white hover:bg-gray-800",
              "transition-colors"
            )}
          >
            {currentActivity?.icon}
            Add {currentActivity?.label}
            {time && ` at ${formatTime(time)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
