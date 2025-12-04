"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Train, ChevronDown } from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import { BookingStatusSelect } from "./shared/BookingStatusSelect";
import type { Trip, ItineraryItem, BookingStatus } from "@/types/trip";

interface TrainFormProps {
  trip: Trip;
  selectedDay: number;
  onAdd: (item: Partial<ItineraryItem>) => void;
}

const TRAIN_OPERATORS = [
  "Amtrak",
  "Brightline",
  "NJ Transit",
  "Metro-North",
  "LIRR",
  "Caltrain",
  "Metra",
  "SEPTA",
  "MARC",
  "VIA Rail",
  "Eurostar",
  "TGV",
  "ICE",
  "Shinkansen",
  "Other",
];

const TRAIN_CLASSES = [
  { value: "standard", label: "Standard" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

export function TrainForm({ trip, selectedDay, onAdd }: TrainFormProps) {
  const [fromStation, setFromStation] = React.useState("");
  const [toStation, setToStation] = React.useState("");
  const [date, setDate] = React.useState(trip.start_date || "");
  const [departureTime, setDepartureTime] = React.useState("");
  const [arrivalTime, setArrivalTime] = React.useState("");
  const [operator, setOperator] = React.useState("");
  const [trainNumber, setTrainNumber] = React.useState("");
  const [trainClass, setTrainClass] = React.useState("standard");
  const [seatCar, setSeatCar] = React.useState("");
  const [confirmationNumber, setConfirmationNumber] = React.useState("");
  const [bookingStatus, setBookingStatus] =
    React.useState<BookingStatus>("not_booked");
  const [notes, setNotes] = React.useState("");
  const [day, setDay] = React.useState(selectedDay);

  const [operatorOpen, setOperatorOpen] = React.useState(false);
  const [classOpen, setClassOpen] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const item: Partial<ItineraryItem> = {
      day,
      time: departureTime || undefined,
      title: `Train: ${fromStation} → ${toStation}`,
      notes: JSON.stringify({
        type: "train",
        from: fromStation,
        to: toStation,
        trainLine: operator,
        trainNumber,
        departureDate: date,
        departureTime,
        arrivalTime,
        confirmationNumber,
        bookingStatus,
        class: trainClass,
        seatCar,
        raw: notes,
      }),
    };

    onAdd(item);
  };

  const isValid = fromStation.trim() && toStation.trim();

  return (
    <form onSubmit={handleSubmit} className="pb-4">
      {/* Route */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Route
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              From <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fromStation}
              onChange={(e) => setFromStation(e.target.value)}
              placeholder="Miami"
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1.5">
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={toStation}
              onChange={(e) => setToStation(e.target.value)}
              placeholder="Fort Lauderdale"
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-gray-200",
                "text-sm",
                "focus:outline-none focus:ring-2 focus:ring-gray-300"
              )}
            />
          </div>
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

          <div className="grid grid-cols-3 gap-3">
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
              <label className="block text-sm text-gray-700 mb-1.5">
                Departure
              </label>
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
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Arrival
              </label>
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
        </div>
      </div>

      {/* Details (optional) */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Details
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </h4>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Operator
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOperatorOpen(!operatorOpen)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200",
                    "bg-white text-sm text-left",
                    "hover:border-gray-300 transition-colors",
                    "flex items-center justify-between"
                  )}
                >
                  <span className={!operator ? "text-gray-400" : "text-gray-900"}>
                    {operator || "Select..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {operatorOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {TRAIN_OPERATORS.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => {
                          setOperator(op);
                          setOperatorOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                          operator === op && "bg-gray-50 font-medium"
                        )}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Train #
              </label>
              <input
                type="text"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
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
              <label className="block text-sm text-gray-700 mb-1.5">Class</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setClassOpen(!classOpen)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200",
                    "bg-white text-sm text-left",
                    "hover:border-gray-300 transition-colors",
                    "flex items-center justify-between"
                  )}
                >
                  {TRAIN_CLASSES.find((c) => c.value === trainClass)?.label}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {classOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                    {TRAIN_CLASSES.map((cls) => (
                      <button
                        key={cls.value}
                        type="button"
                        onClick={() => {
                          setTrainClass(cls.value);
                          setClassOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                          trainClass === cls.value && "bg-gray-50 font-medium"
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
              <label className="block text-sm text-gray-700 mb-1.5">
                Seat/Car
              </label>
              <input
                type="text"
                value={seatCar}
                onChange={(e) => setSeatCar(e.target.value)}
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

        <div className="mt-3">
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
          <Train className="w-4 h-4" />
          Add Train
        </button>
      </div>
    </form>
  );
}
