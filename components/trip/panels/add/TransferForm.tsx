"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Car, Bus, CarTaxiFront, Truck, ChevronDown } from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import type { Trip, ItineraryItem, HotelBooking } from "@/types/trip";

interface TransferFormProps {
  trip: Trip;
  selectedDay: number;
  hotels: HotelBooking[];
  existingItems: ItineraryItem[];
  onAdd: (item: Partial<ItineraryItem>) => void;
}

type TransferType = "taxi" | "shuttle" | "rental" | "bus";

const TRANSFER_TYPES: { id: TransferType; label: string; icon: React.ReactNode }[] = [
  { id: "taxi", label: "Taxi/Uber", icon: <CarTaxiFront className="w-4 h-4" /> },
  { id: "shuttle", label: "Shuttle", icon: <Truck className="w-4 h-4" /> },
  { id: "rental", label: "Rental", icon: <Car className="w-4 h-4" /> },
  { id: "bus", label: "Bus", icon: <Bus className="w-4 h-4" /> },
];

const SERVICES = [
  "Uber",
  "Lyft",
  "Local Taxi",
  "Hotel Shuttle",
  "Private Transfer",
  "Rental Car",
  "Public Bus",
  "Other",
];

export function TransferForm({
  trip,
  selectedDay,
  hotels,
  existingItems,
  onAdd,
}: TransferFormProps) {
  const [transferType, setTransferType] = React.useState<TransferType>("taxi");
  const [fromLocation, setFromLocation] = React.useState("");
  const [toLocation, setToLocation] = React.useState("");
  const [date, setDate] = React.useState(trip.start_date || "");
  const [time, setTime] = React.useState("");
  const [service, setService] = React.useState("");
  const [confirmationNumber, setConfirmationNumber] = React.useState("");
  const [estimatedCost, setEstimatedCost] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [day, setDay] = React.useState(selectedDay);
  const [estimatedDuration, setEstimatedDuration] = React.useState("25");

  const [serviceOpen, setServiceOpen] = React.useState(false);
  const [fromSuggestionsOpen, setFromSuggestionsOpen] = React.useState(false);
  const [toSuggestionsOpen, setToSuggestionsOpen] = React.useState(false);

  // Generate location suggestions from hotels and destinations
  const locationSuggestions = React.useMemo(() => {
    const suggestions: { label: string; type: "airport" | "hotel" | "destination" }[] = [];

    // Add airports based on trip destination
    const tripCity = trip.destination;
    if (tripCity) {
      suggestions.push({ label: `${tripCity} Airport`, type: "airport" });
    }

    // Add hotels
    hotels.forEach((hotel) => {
      suggestions.push({ label: hotel.name, type: "hotel" });
    });

    // Add destinations from existing items
    existingItems.forEach((item) => {
      if (item.title && !suggestions.some((s) => s.label === item.title)) {
        suggestions.push({ label: item.title, type: "destination" });
      }
    });

    return suggestions;
  }, [trip.destination, hotels, existingItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subtypeMap: Record<TransferType, string> = {
      taxi: "car",
      shuttle: "shuttle",
      rental: "rental",
      bus: "bus",
    };

    const item: Partial<ItineraryItem> = {
      day,
      time: time || undefined,
      title: `Transfer: ${fromLocation} → ${toLocation}`,
      notes: JSON.stringify({
        type: "transport",
        subtype: subtypeMap[transferType],
        from: fromLocation,
        to: toLocation,
        service,
        confirmationNumber,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        estimatedDuration: Number(estimatedDuration),
        raw: notes,
      }),
    };

    onAdd(item);
  };

  const isValid = fromLocation.trim() && toLocation.trim();

  const renderLocationInput = (
    value: string,
    onChange: (value: string) => void,
    suggestionsOpen: boolean,
    setSuggestionsOpen: (open: boolean) => void,
    placeholder: string,
    label: string
  ) => (
    <div>
      <label className="block text-sm text-gray-700 mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setSuggestionsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 rounded-lg border border-gray-200",
            "text-sm",
            "focus:outline-none focus:ring-2 focus:ring-gray-300"
          )}
        />
        {suggestionsOpen && locationSuggestions.length > 0 && (
          <div
            className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            onMouseLeave={() => setSuggestionsOpen(false)}
          >
            <div className="max-h-48 overflow-y-auto">
              {locationSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange(suggestion.label);
                    setSuggestionsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      suggestion.type === "airport" &&
                        "bg-blue-100 text-blue-700",
                      suggestion.type === "hotel" &&
                        "bg-purple-100 text-purple-700",
                      suggestion.type === "destination" &&
                        "bg-gray-100 text-gray-700"
                    )}
                  >
                    {suggestion.type}
                  </span>
                  <span className="text-gray-900">{suggestion.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="pb-4">
      {/* Transfer type */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Type
        </h4>

        <div className="flex gap-2">
          {TRANSFER_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setTransferType(type.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg",
                "text-sm font-medium transition-colors",
                "border",
                transferType === type.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              {type.icon}
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Route */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Route
        </h4>

        <div className="space-y-3">
          {renderLocationInput(
            fromLocation,
            setFromLocation,
            fromSuggestionsOpen,
            setFromSuggestionsOpen,
            "MIA Airport",
            "From"
          )}

          {renderLocationInput(
            toLocation,
            setToLocation,
            toSuggestionsOpen,
            setToSuggestionsOpen,
            "Miami Beach EDITION",
            "To"
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Schedule
        </h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Day</span>
            <DayPicker trip={trip} value={day} onChange={setDay} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Est. duration</span>
            <span className="text-sm text-gray-500">~{estimatedDuration} min</span>
          </div>
        </div>
      </div>

      {/* Booking (optional) */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Booking
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Service</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setServiceOpen(!serviceOpen)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "bg-white text-sm text-left",
                  "hover:border-gray-300 transition-colors",
                  "flex items-center justify-between"
                )}
              >
                <span className={!service ? "text-gray-400" : "text-gray-900"}>
                  {service || "Select service..."}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {serviceOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                  {SERVICES.map((svc) => (
                    <button
                      key={svc}
                      type="button"
                      onClick={() => {
                        setService(svc);
                        setServiceOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                        service === svc && "bg-gray-50 font-medium"
                      )}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Confirmation #
              </label>
              <input
                type="text"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Est. cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  $
                </span>
                <input
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="28"
                  className={cn(
                    "w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200",
                    "text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-gray-300"
                  )}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Note</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pre-booked via Uber Reserve"
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="p-4">
        <button
          type="submit"
          disabled={!isValid}
          className={cn(
            "w-full py-3 rounded-full font-medium",
            "flex items-center justify-center gap-2",
            "transition-colors",
            isValid
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <Car className="w-4 h-4" />
          Add Transfer
        </button>
      </div>
    </form>
  );
}
