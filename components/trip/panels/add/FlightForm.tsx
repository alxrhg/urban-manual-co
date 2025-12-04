"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Check, ChevronDown, Plane } from "lucide-react";
import { AirportAutocomplete } from "./shared/AirportAutocomplete";
import { BookingStatusSelect } from "./shared/BookingStatusSelect";
import type { Trip, Flight, BookingStatus } from "@/types/trip";

interface FlightFormProps {
  trip: Trip;
  onAdd: (flight: Partial<Flight>) => void;
}

const AIRLINES = [
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "WN", name: "Southwest Airlines" },
  { code: "B6", name: "JetBlue Airways" },
  { code: "AS", name: "Alaska Airlines" },
  { code: "NK", name: "Spirit Airlines" },
  { code: "F9", name: "Frontier Airlines" },
  { code: "BA", name: "British Airways" },
  { code: "AF", name: "Air France" },
  { code: "LH", name: "Lufthansa" },
  { code: "EK", name: "Emirates" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "QF", name: "Qantas" },
  { code: "NH", name: "All Nippon Airways" },
  { code: "JL", name: "Japan Airlines" },
];

const SEAT_CLASSES: { value: Flight["seatClass"]; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const LEG_TYPES: { value: Flight["legType"]; label: string }[] = [
  { value: "outbound", label: "Outbound" },
  { value: "return", label: "Return" },
  { value: "multi_city", label: "Multi-city" },
];

export function FlightForm({ trip, onAdd }: FlightFormProps) {
  // Lookup state
  const [lookupAirline, setLookupAirline] = React.useState("");
  const [lookupFlightNumber, setLookupFlightNumber] = React.useState("");
  const [lookupDate, setLookupDate] = React.useState(trip.start_date || "");
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupResult, setLookupResult] = React.useState<string | null>(null);

  // Form state
  const [airlineCode, setAirlineCode] = React.useState("");
  const [airlineName, setAirlineName] = React.useState("");
  const [flightNumber, setFlightNumber] = React.useState("");
  const [departureAirport, setDepartureAirport] = React.useState("");
  const [departureDate, setDepartureDate] = React.useState(trip.start_date || "");
  const [departureTime, setDepartureTime] = React.useState("");
  const [departureTerminal, setDepartureTerminal] = React.useState("");
  const [departureGate, setDepartureGate] = React.useState("");
  const [arrivalAirport, setArrivalAirport] = React.useState("");
  const [arrivalDate, setArrivalDate] = React.useState(trip.start_date || "");
  const [arrivalTime, setArrivalTime] = React.useState("");
  const [arrivalTerminal, setArrivalTerminal] = React.useState("");
  const [arrivalGate, setArrivalGate] = React.useState("");
  const [confirmationNumber, setConfirmationNumber] = React.useState("");
  const [bookingStatus, setBookingStatus] = React.useState<BookingStatus>("confirmed");
  const [seatClass, setSeatClass] = React.useState<Flight["seatClass"]>("economy");
  const [seatNumber, setSeatNumber] = React.useState("");
  const [bagsCarryOn, setBagsCarryOn] = React.useState(1);
  const [bagsChecked, setBagsChecked] = React.useState(0);
  const [hasLounge, setHasLounge] = React.useState(false);
  const [loungeName, setLoungeName] = React.useState("");
  const [loungeLocation, setLoungeLocation] = React.useState("");
  const [legType, setLegType] = React.useState<Flight["legType"]>("outbound");
  const [notes, setNotes] = React.useState("");

  // Dropdown states
  const [airlineOpen, setAirlineOpen] = React.useState(false);
  const [seatClassOpen, setSeatClassOpen] = React.useState(false);
  const [legTypeOpen, setLegTypeOpen] = React.useState(false);

  const handleLookup = async () => {
    if (!lookupAirline || !lookupFlightNumber || !lookupDate) return;

    setLookupLoading(true);
    setLookupResult(null);

    try {
      // In production, this would call a flight data API
      // For now, we'll simulate a successful lookup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate finding the flight
      const airline = AIRLINES.find(
        (a) => a.code.toUpperCase() === lookupAirline.toUpperCase()
      );

      if (airline) {
        setAirlineCode(airline.code);
        setAirlineName(airline.name);
        setFlightNumber(lookupFlightNumber);
        setDepartureDate(lookupDate);
        setArrivalDate(lookupDate);
        setLookupResult(
          `Found: ${airline.name} ${airline.code}${lookupFlightNumber}`
        );
      } else {
        setLookupResult("Flight not found. Please enter details manually.");
      }
    } catch {
      setLookupResult("Lookup failed. Please enter details manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const flight: Partial<Flight> = {
      airline: airlineName || airlineCode,
      airlineCode: airlineCode.toUpperCase(),
      flightNumber,
      departureAirport: departureAirport.toUpperCase(),
      departureCity: "", // Would be filled from airport lookup
      departureTime: `${departureDate}T${departureTime}`,
      departureTerminal,
      departureGate,
      arrivalAirport: arrivalAirport.toUpperCase(),
      arrivalCity: "", // Would be filled from airport lookup
      arrivalTime: `${arrivalDate}T${arrivalTime}`,
      arrivalTerminal,
      arrivalGate,
      bookingStatus,
      confirmationNumber,
      seatClass,
      seatNumber,
      bagsCarryOn,
      bagsChecked,
      loungeAccess: hasLounge,
      loungeName: hasLounge ? loungeName : undefined,
      loungeLocation: hasLounge ? loungeLocation : undefined,
      legType,
      notes,
    };

    onAdd(flight);
  };

  const isValid =
    airlineCode && flightNumber && departureAirport && arrivalAirport;

  return (
    <form onSubmit={handleSubmit} className="pb-4">
      {/* Quick lookup */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Quick Lookup
        </h4>
        <div className="flex gap-2 items-end">
          <div className="w-16">
            <input
              type="text"
              value={lookupAirline}
              onChange={(e) => setLookupAirline(e.target.value.toUpperCase())}
              placeholder="UA"
              maxLength={2}
              className={cn(
                "w-full px-2 py-2 rounded-lg border border-gray-200",
                "text-sm text-center uppercase",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
          <div className="w-24">
            <input
              type="text"
              value={lookupFlightNumber}
              onChange={(e) => setLookupFlightNumber(e.target.value)}
              placeholder="1610"
              className={cn(
                "w-full px-2 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
          <span className="text-sm text-gray-500 pb-2">on</span>
          <div className="flex-1">
            <input
              type="date"
              value={lookupDate}
              onChange={(e) => setLookupDate(e.target.value)}
              className={cn(
                "w-full px-2 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
          <button
            type="button"
            onClick={handleLookup}
            disabled={lookupLoading || !lookupAirline || !lookupFlightNumber}
            className={cn(
              "px-3 py-2 rounded-lg",
              "bg-gray-900 text-white text-sm",
              "hover:bg-gray-800 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-1.5"
            )}
          >
            {lookupLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Look up
          </button>
        </div>
        {lookupResult && (
          <p
            className={cn(
              "mt-2 text-sm flex items-center gap-1.5",
              lookupResult.startsWith("Found")
                ? "text-green-600"
                : "text-amber-600"
            )}
          >
            {lookupResult.startsWith("Found") && (
              <Check className="w-4 h-4" />
            )}
            {lookupResult}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or enter manually</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Flight info */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Flight Info
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Airline</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setAirlineOpen(!airlineOpen)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "bg-white text-sm text-left",
                  "hover:border-gray-300 transition-colors",
                  "flex items-center justify-between"
                )}
              >
                <span className={!airlineCode ? "text-gray-400" : "text-gray-900"}>
                  {airlineName || airlineCode || "Select airline"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {airlineOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {AIRLINES.map((airline) => (
                    <button
                      key={airline.code}
                      type="button"
                      onClick={() => {
                        setAirlineCode(airline.code);
                        setAirlineName(airline.name);
                        setAirlineOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <span className="font-medium w-8">{airline.code}</span>
                      <span className="text-gray-600">{airline.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              Flight #
            </label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              placeholder="1610"
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
        </div>
      </div>

      {/* Departure */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Departure
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Airport</label>
            <AirportAutocomplete
              value={departureAirport}
              onChange={(code) => setDepartureAirport(code)}
              placeholder="Search departure airport..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
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
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Terminal
              </label>
              <input
                type="text"
                value={departureTerminal}
                onChange={(e) => setDepartureTerminal(e.target.value)}
                placeholder="C"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Gate</label>
              <input
                type="text"
                value={departureGate}
                onChange={(e) => setDepartureGate(e.target.value)}
                placeholder="C24"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Arrival */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Arrival
        </h4>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Airport</label>
            <AirportAutocomplete
              value={arrivalAirport}
              onChange={(code) => setArrivalAirport(code)}
              placeholder="Search arrival airport..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Date</label>
              <input
                type="date"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(e.target.value)}
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
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Terminal
              </label>
              <input
                type="text"
                value={arrivalTerminal}
                onChange={(e) => setArrivalTerminal(e.target.value)}
                placeholder="N"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Gate</label>
              <input
                type="text"
                value={arrivalGate}
                onChange={(e) => setArrivalGate(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Booking */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Booking
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              Confirmation #
            </label>
            <input
              type="text"
              value={confirmationNumber}
              onChange={(e) =>
                setConfirmationNumber(e.target.value.toUpperCase())
              }
              placeholder="ABC123"
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-gray-200",
                "text-sm uppercase",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Status</label>
            <BookingStatusSelect
              value={bookingStatus}
              onChange={setBookingStatus}
            />
          </div>
        </div>
      </div>

      {/* Seat & Bags */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Seat & Bags
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Class</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSeatClassOpen(!seatClassOpen)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200",
                    "bg-white text-sm text-left",
                    "hover:border-gray-300 transition-colors",
                    "flex items-center justify-between"
                  )}
                >
                  {SEAT_CLASSES.find((c) => c.value === seatClass)?.label}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {seatClassOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                    {SEAT_CLASSES.map((cls) => (
                      <button
                        key={cls.value}
                        type="button"
                        onClick={() => {
                          setSeatClass(cls.value);
                          setSeatClassOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                          seatClass === cls.value && "bg-gray-50 font-medium"
                        )}
                      >
                        {cls.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">Seat</label>
              <input
                type="text"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value.toUpperCase())}
                placeholder="12A"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm uppercase",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">Bags</span>
            <div className="flex items-center gap-2">
              <select
                value={bagsCarryOn}
                onChange={(e) => setBagsCarryOn(Number(e.target.value))}
                className={cn(
                  "px-2 py-1.5 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              >
                {[0, 1, 2].map((n) => (
                  <option key={n} value={n}>
                    {n} carry-on
                  </option>
                ))}
              </select>
              <select
                value={bagsChecked}
                onChange={(e) => setBagsChecked(Number(e.target.value))}
                className={cn(
                  "px-2 py-1.5 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              >
                {[0, 1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n} checked
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Airport Lounge */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Airport Lounge
        </h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasLounge}
            onChange={(e) => setHasLounge(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
          />
          <span className="text-sm text-gray-700">I have lounge access</span>
        </label>

        {hasLounge && (
          <div className="mt-3 space-y-3 pl-7">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Lounge name
              </label>
              <input
                type="text"
                value={loungeName}
                onChange={(e) => setLoungeName(e.target.value)}
                placeholder="Admirals Club"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={loungeLocation}
                onChange={(e) => setLoungeLocation(e.target.value)}
                placeholder="Terminal C, near Gate 24"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Leg type & Notes */}
      <div className="p-4 border-b border-gray-100">
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Leg type</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLegTypeOpen(!legTypeOpen)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "bg-white text-sm text-left",
                  "hover:border-gray-300 transition-colors",
                  "flex items-center justify-between"
                )}
              >
                {LEG_TYPES.find((t) => t.value === legType)?.label}
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {legTypeOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                  {LEG_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setLegType(type.value);
                        setLegTypeOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                        legType === type.value && "bg-gray-50 font-medium"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Note</label>
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
          <Plane className="w-4 h-4" />
          Add Flight
        </button>
      </div>
    </form>
  );
}
