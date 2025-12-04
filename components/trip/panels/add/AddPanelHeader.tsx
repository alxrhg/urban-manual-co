"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import { DayPicker } from "./shared/DayPicker";
import { TimeSlotPicker, type TimeSlot } from "./shared/TimeSlotPicker";
import type { Trip, ItineraryItem } from "@/types/trip";

interface AddPanelHeaderProps {
  trip: Trip;
  selectedDay: number;
  selectedTime: string | null;
  existingItems: ItineraryItem[];
  onDayChange: (day: number) => void;
  onTimeChange: (time: string | null) => void;
  onClose: () => void;
}

export function AddPanelHeader({
  trip,
  selectedDay,
  selectedTime,
  existingItems,
  onDayChange,
  onTimeChange,
  onClose,
}: AddPanelHeaderProps) {
  // Generate suggested time slots based on gaps in the schedule
  const suggestedSlots = React.useMemo((): TimeSlot[] => {
    const dayItems = existingItems
      .filter((item) => item.day === selectedDay && item.time)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    const slots: TimeSlot[] = [];
    const usedTimes = new Set(dayItems.map((item) => item.time));

    // Check for hotel check-in time on first day
    const hotelCheckIn = dayItems.find((item) => {
      const notes = item.notes ? JSON.parse(item.notes) : {};
      return notes.hotelItemType === "check_in";
    });

    if (hotelCheckIn?.time) {
      const checkInTime = hotelCheckIn.time;
      // Parse time and add 30 minutes
      const [hours, minutes] = checkInTime.split(":").map(Number);
      const afterCheckIn = new Date();
      afterCheckIn.setHours(hours, minutes + 30);
      const afterCheckInTime = `${afterCheckIn.getHours().toString().padStart(2, "0")}:${afterCheckIn.getMinutes().toString().padStart(2, "0")}`;

      if (!usedTimes.has(afterCheckInTime)) {
        const displayHour = afterCheckIn.getHours() % 12 || 12;
        const period = afterCheckIn.getHours() >= 12 ? "PM" : "AM";
        slots.push({
          time: afterCheckInTime,
          label: `After check-in (${displayHour}:${afterCheckIn.getMinutes().toString().padStart(2, "0")} ${period})`,
          type: "suggested",
        });
      }
    }

    // Find gaps in the schedule
    const timeSlotChecks = [
      { time: "08:00", label: "Breakfast slot", startHour: 7, endHour: 9 },
      { time: "12:30", label: "Lunch slot", startHour: 12, endHour: 14 },
      { time: "15:00", label: "Afternoon", startHour: 14, endHour: 17 },
      { time: "17:30", label: "Before dinner", startHour: 17, endHour: 19 },
      { time: "19:30", label: "Dinner slot", startHour: 19, endHour: 21 },
    ];

    for (const slot of timeSlotChecks) {
      // Check if there's already an item in this time range
      const hasItemInRange = dayItems.some((item) => {
        if (!item.time) return false;
        const [hours] = item.time.split(":").map(Number);
        return hours >= slot.startHour && hours < slot.endHour;
      });

      if (!hasItemInRange) {
        const [hours, minutes] = slot.time.split(":").map(Number);
        const displayHour = hours % 12 || 12;
        const period = hours >= 12 ? "PM" : "AM";
        slots.push({
          time: slot.time,
          label: `${slot.label} (${displayHour}:${minutes.toString().padStart(2, "0")} ${period})`,
          type: "gap",
        });
      }
    }

    // Limit to 4 suggestions
    return slots.slice(0, 4);
  }, [existingItems, selectedDay]);

  return (
    <div className="px-4 py-3 border-b border-gray-100">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Add to Trip</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            "hover:bg-gray-100 transition-colors"
          )}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Day/Time selection row */}
      <div className="flex items-center gap-3">
        <DayPicker
          trip={trip}
          value={selectedDay}
          onChange={onDayChange}
        />
        <TimeSlotPicker
          value={selectedTime}
          onChange={onTimeChange}
          suggestedSlots={suggestedSlots}
        />
      </div>
    </div>
  );
}
