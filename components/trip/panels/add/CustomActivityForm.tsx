"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, X, ChevronDown } from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import { TimeSlotPicker } from "./shared/TimeSlotPicker";
import type { Trip } from "@/types/trip";

interface CustomActivityFormProps {
  selectedDay: number;
  selectedTime: string | null;
  trip: Trip;
  onAdd: (data: {
    name: string;
    category: string;
    address?: string;
    time?: string;
    duration?: number;
    note?: string;
  }) => void;
  onBack: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Cafe" },
  { value: "bar", label: "Bar" },
  { value: "attraction", label: "Attraction" },
  { value: "activity", label: "Activity" },
  { value: "shopping", label: "Shopping" },
  { value: "wellness", label: "Wellness" },
  { value: "other", label: "Other" },
];

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

export function CustomActivityForm({
  selectedDay: initialDay,
  selectedTime,
  trip,
  onAdd,
  onBack,
}: CustomActivityFormProps) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("activity");
  const [address, setAddress] = React.useState("");
  const [day, setDay] = React.useState(initialDay);
  const [time, setTime] = React.useState<string | null>(selectedTime);
  const [duration, setDuration] = React.useState<number>(60);
  const [note, setNote] = React.useState("");
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [durationOpen, setDurationOpen] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name: name.trim(),
      category,
      address: address.trim() || undefined,
      time: time || undefined,
      duration,
      note: note.trim() || undefined,
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
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
        <span className="text-sm font-medium text-gray-900">
          Add Custom Activity
        </span>
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* What section */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            What
          </h4>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Beach day at South Beach"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Category
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryOpen(!categoryOpen)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-gray-200",
                    "bg-white text-sm text-gray-900 text-left",
                    "hover:border-gray-300 transition-colors",
                    "flex items-center justify-between"
                  )}
                >
                  {CATEGORY_OPTIONS.find((c) => c.value === category)?.label}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-gray-400 transition-transform",
                      categoryOpen && "rotate-180"
                    )}
                  />
                </button>
                {categoryOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setCategory(opt.value);
                          setCategoryOpen(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                          category === opt.value && "bg-gray-50 font-medium"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm text-gray-700 mb-1.5">
                Address
                <span className="text-gray-400 font-normal ml-1">
                  (optional, for map)
                </span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="South Beach, Miami Beach"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border border-gray-200",
                  "text-sm text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-gray-300"
                )}
              />
            </div>
          </div>
        </div>

        {/* When section */}
        <div className="p-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            When
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
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Details
          </h4>

          <div>
            <label className="block text-sm text-gray-700 mb-1.5">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bring sunscreen and towels. Rent umbrella."
              rows={3}
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

      {/* Submit button */}
      <div className="p-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={!isValid}
          className={cn(
            "w-full py-3 rounded-full font-medium",
            "transition-colors",
            isValid
              ? "bg-gray-900 text-white hover:bg-gray-800"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          Add Custom Activity
        </button>
      </div>
    </form>
  );
}
