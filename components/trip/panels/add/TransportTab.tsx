"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Plane, Train, Car } from "lucide-react";
import { FlightForm } from "./FlightForm";
import { TrainForm } from "./TrainForm";
import { TransferForm } from "./TransferForm";
import type { Trip, ItineraryItem, HotelBooking, Flight } from "@/types/trip";

type TransportSubTab = "flight" | "train" | "transfer";

interface TransportTabProps {
  trip: Trip;
  selectedDay: number;
  hotels: HotelBooking[];
  existingItems: ItineraryItem[];
  onAddFlight: (flight: Partial<Flight>) => void;
  onAddTransport: (item: Partial<ItineraryItem>) => void;
}

const SUB_TABS: { id: TransportSubTab; label: string; icon: React.ReactNode }[] = [
  { id: "flight", label: "Flight", icon: <Plane className="w-4 h-4" /> },
  { id: "train", label: "Train", icon: <Train className="w-4 h-4" /> },
  { id: "transfer", label: "Transfer", icon: <Car className="w-4 h-4" /> },
];

export function TransportTab({
  trip,
  selectedDay,
  hotels,
  existingItems,
  onAddFlight,
  onAddTransport,
}: TransportTabProps) {
  const [subTab, setSubTab] = React.useState<TransportSubTab>("flight");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tab navigation */}
      <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "text-sm font-medium transition-colors",
              subTab === tab.id
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto">
        {subTab === "flight" && (
          <FlightForm trip={trip} onAdd={onAddFlight} />
        )}
        {subTab === "train" && (
          <TrainForm
            trip={trip}
            selectedDay={selectedDay}
            onAdd={onAddTransport}
          />
        )}
        {subTab === "transfer" && (
          <TransferForm
            trip={trip}
            selectedDay={selectedDay}
            hotels={hotels}
            existingItems={existingItems}
            onAdd={onAddTransport}
          />
        )}
      </div>
    </div>
  );
}
