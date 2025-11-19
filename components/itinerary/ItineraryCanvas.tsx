"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";

import DayColumn, { DayColumnData } from "./DayColumn";
import EventBlock from "./EventBlock";
import TimeGrid from "./TimeGrid";
import UnscheduledDock from "./UnscheduledDock";

export interface Place {
  id: string;
  name: string;
  duration: number; // minutes
  startTime?: string; // HH:mm
}

export interface ItineraryDay {
  id: string;
  label: string;
  events: Place[];
}

export interface ItineraryData {
  days: ItineraryDay[];
}

export type DragOrigin =
  | { type: "unscheduled" }
  | { type: "day"; dayId: string };

export interface DraggedItemMeta {
  item: Place;
  origin: DragOrigin;
}

const SLOT_MINUTES = 30;
const TOTAL_SLOTS = (24 * 60) / SLOT_MINUTES;
const ROW_HEIGHT = 36;

const pad = (input: number) => input.toString().padStart(2, "0");
const minutesToTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${pad(hrs)}:${pad(mins)}`;
};

const timeToMinutes = (time: string) => {
  const [hrs, mins] = time.split(":").map(Number);
  return hrs * 60 + mins;
};

const slotIndexFromTime = (time: string) =>
  Math.max(0, Math.round(timeToMinutes(time) / SLOT_MINUTES));

const gridRowStartFromTime = (time: string) => slotIndexFromTime(time) + 1;

const gridRowEndFromDuration = (startTime: string, duration: number) =>
  gridRowStartFromTime(startTime) + Math.max(1, Math.round(duration / SLOT_MINUTES));

const timeSlots = Array.from({ length: TOTAL_SLOTS }, (_, index) =>
  minutesToTime(index * SLOT_MINUTES),
);

interface ItineraryCanvasProps {
  itinerary: ItineraryData;
  unscheduledItems: Place[];
}

const ItineraryCanvas: React.FC<ItineraryCanvasProps> = ({
  itinerary,
  unscheduledItems,
}) => {
  const [days, setDays] = useState<ItineraryDay[]>(itinerary.days);
  const [unassigned, setUnassigned] = useState<Place[]>(unscheduledItems);
  const [activeItem, setActiveItem] = useState<DraggedItemMeta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DraggedItemMeta | undefined;
    if (data?.item) {
      setActiveItem(data);
    }
  };

  const removeFromOrigin = (origin: DragOrigin, itemId: string) => {
    if (origin.type === "unscheduled") {
      setUnassigned((prev) => prev.filter((item) => item.id !== itemId));
      return;
    }

    setDays((prev) =>
      prev.map((day) =>
        day.id === origin.dayId
          ? {
              ...day,
              events: day.events.filter((item) => item.id !== itemId),
            }
          : day,
      ),
    );
  };

  const addToDay = (
    dayId: string,
    item: Place,
    slotIndex: number,
    duration: number,
  ) => {
    const startMinutes = slotIndex * SLOT_MINUTES;
    const startTime = minutesToTime(startMinutes);
    const updatedItem: Place = { ...item, startTime, duration };

    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              events: [...day.events.filter((evt) => evt.id !== item.id), updatedItem],
            }
          : day,
      ),
    );
  };

  const addToUnscheduled = (item: Place) => {
    setUnassigned((prev) => {
      const filtered = prev.filter((entry) => entry.id !== item.id);
      return [...filtered, { ...item, startTime: undefined }];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const meta = active.data.current as DraggedItemMeta | undefined;
    const overData = over?.data.current as
      | { type: "time-slot"; dayId: string; slotIndex: number }
      | { type: "unscheduled" }
      | undefined;

    setActiveItem(null);

    if (!meta || !overData) return;

    removeFromOrigin(meta.origin, meta.item.id);

    if (overData.type === "unscheduled") {
      addToUnscheduled(meta.item);
      return;
    }

    addToDay(overData.dayId, meta.item, overData.slotIndex, meta.item.duration);
  };

  return (
    <div className="grid grid-cols-[280px_1fr] gap-6">
      <UnscheduledDock
        items={unassigned}
        rowHeight={ROW_HEIGHT}
        slotMinutes={SLOT_MINUTES}
      />

      <div className="overflow-hidden rounded-none border border-gray-200 bg-white shadow-[6px_6px_0px_0px_#0f172a] dark:border-gray-800 dark:bg-black">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-[90px_1fr]">
            <TimeGrid
              rowHeight={ROW_HEIGHT}
              slots={timeSlots}
              slotMinutes={SLOT_MINUTES}
              totalSlots={TOTAL_SLOTS}
            />

            <div
              className="grid border-l border-gray-200 dark:border-gray-800"
              style={{ gridTemplateColumns: `repeat(${days.length}, minmax(240px, 1fr))` }}
            >
              {days.map((day) => (
                <DayColumn
                  key={day.id}
                  day={day}
                  rowHeight={ROW_HEIGHT}
                  slotMinutes={SLOT_MINUTES}
                  totalSlots={TOTAL_SLOTS}
                  gridRowStartFromTime={gridRowStartFromTime}
                  gridRowEndFromDuration={gridRowEndFromDuration}
                />
              ))}
            </div>
          </div>

          {createPortal(
            <DragOverlay>
              {activeItem ? (
                <EventBlock
                  item={activeItem.item}
                  isOverlay
                  origin={activeItem.origin}
                  slotMinutes={SLOT_MINUTES}
                />
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      </div>
    </div>
  );
};

export default ItineraryCanvas;
export type { DayColumnData };
