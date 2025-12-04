"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  X,
  MapPin,
  Phone,
  Globe as GlobeIcon,
  Star,
  ExternalLink,
} from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import { TimeSlotPicker } from "./shared/TimeSlotPicker";
import type { Trip } from "@/types/trip";
import type { Destination } from "@/types/destination";

interface PlaceInfo {
  name: string;
  address?: string;
  category?: string;
  rating?: number;
  imageUrl?: string;
  phone?: string;
  website?: string;
}

interface AddDetailSheetProps {
  place: PlaceInfo;
  source: "curated" | "google";
  destination?: Destination;
  selectedDay: number;
  suggestedTime: string;
  trip: Trip;
  onAdd: (options: {
    time?: string;
    duration?: number;
    partySize?: number;
    note?: string;
  }) => void;
  onBack: () => void;
}

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 150, label: "2.5 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "Half day" },
  { value: 480, label: "Full day" },
];

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function AddDetailSheet({
  place,
  source,
  destination,
  selectedDay: initialDay,
  suggestedTime,
  trip,
  onAdd,
  onBack,
}: AddDetailSheetProps) {
  const [day, setDay] = React.useState(initialDay);
  const [time, setTime] = React.useState<string | null>(suggestedTime);
  const [duration, setDuration] = React.useState<number>(90);
  const [partySize, setPartySize] = React.useState<number>(2);
  const [note, setNote] = React.useState("");
  const [durationOpen, setDurationOpen] = React.useState(false);
  const [partySizeOpen, setPartySizeOpen] = React.useState(false);

  const isRestaurant =
    place.category?.toLowerCase() === "restaurant" ||
    place.category?.toLowerCase() === "dining";

  const formatCategory = (category?: string): string => {
    if (!category) return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const handleSubmit = () => {
    onAdd({
      time: time || undefined,
      duration,
      partySize: isRestaurant ? partySize : undefined,
      note: note || undefined,
    });
  };

  const formatTimeDisplay = (t: string): string => {
    const [hours, minutes] = t.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Place info */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-4">
            {/* Image or placeholder */}
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {place.imageUrl ? (
                <img
                  src={place.imageUrl}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full flex items-center justify-center",
                    source === "google"
                      ? "bg-gradient-to-br from-blue-100 to-blue-200"
                      : "bg-gradient-to-br from-gray-100 to-gray-200"
                  )}
                >
                  {source === "google" && (
                    <GlobeIcon className="w-8 h-8 text-blue-400" />
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {place.name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
                {place.category && <span>{formatCategory(place.category)}</span>}
                {place.rating && (
                  <>
                    <span className="text-gray-300">&middot;</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {place.rating.toFixed(1)}
                    </span>
                  </>
                )}
              </div>
              {place.address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{place.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schedule section */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Schedule
          </h4>

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
                    "hover:border-gray-300 transition-colors"
                  )}
                >
                  {DURATION_OPTIONS.find((d) => d.value === duration)?.label}
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
          </div>
        </div>

        {/* Details section */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Details
          </h4>

          <div className="space-y-3">
            {/* Party size for restaurants */}
            {isRestaurant && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Party size</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPartySizeOpen(!partySizeOpen)}
                    className={cn(
                      "px-3 py-2 rounded-lg border border-gray-200",
                      "bg-white text-sm text-gray-900",
                      "hover:border-gray-300 transition-colors"
                    )}
                  >
                    {partySize} guest{partySize !== 1 ? "s" : ""}
                  </button>
                  {partySizeOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-32 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {PARTY_SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setPartySize(size);
                            setPartySizeOpen(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                            partySize === size && "bg-gray-50 font-medium"
                          )}
                        >
                          {size} guest{size !== 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  isRestaurant ? "Try the short ribs!" : "Any notes..."
                }
                rows={2}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300",
                  "resize-none"
                )}
              />
            </div>
          </div>
        </div>

        {/* Links section */}
        <div className="p-4">
          <div className="space-y-2">
            {source === "curated" && destination?.slug && (
              <a
                href={`/destinations/${destination.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  "transition-colors"
                )}
              >
                <ExternalLink className="w-4 h-4" />
                View on Urban Manual
              </a>
            )}
            {source === "google" && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(place.name + (place.address ? " " + place.address : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  "transition-colors"
                )}
              >
                <GlobeIcon className="w-4 h-4" />
                View on Google Maps
              </a>
            )}
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  "transition-colors"
                )}
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {destination?.resy_url && (
              <a
                href={destination.resy_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  "text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  "transition-colors"
                )}
              >
                <ExternalLink className="w-4 h-4" />
                Book on Resy
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="p-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleSubmit}
          className={cn(
            "w-full py-3 rounded-full",
            "bg-gray-900 text-white font-medium",
            "hover:bg-gray-800 transition-colors"
          )}
        >
          Add to Day {day}
          {time && ` at ${formatTimeDisplay(time)}`}
        </button>
      </div>
    </div>
  );
}
