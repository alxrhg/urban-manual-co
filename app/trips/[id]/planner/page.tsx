"use client";

import { useMemo, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { LayoutGrid, List, Download, Share2 } from "lucide-react";
import { PlannerLayout } from "@/components/planner/PlannerLayout";
import { UnscheduledDock } from "@/components/planner/UnscheduledDock";
import { PlannerDragPreview, PlannerItemCardProps } from "@/components/planner/DraggableEvent";
import { DayColumn, ItineraryCanvas, ScheduledEvent } from "@/components/planner/ItineraryCanvas";

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToLabel(minutes: number) {
  const hrs = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hrs}:${mins}`;
}

function buildTimeSlots(start = "08:00", end = "20:00", step = 30) {
  const slots: string[] = [];
  let cursor = toMinutes(start);
  const endMinutes = toMinutes(end);

  while (cursor <= endMinutes) {
    slots.push(minutesToLabel(cursor));
    cursor += step;
  }

  return slots;
}

interface ActiveDragMeta {
  id: string;
  title: string;
  category: string;
  duration: number;
  source: "unscheduled" | "scheduled";
}

export default function TripPlannerPage() {
  const [view, setView] = useState<"canvas" | "list">("canvas");
  const [unscheduled, setUnscheduled] = useState<PlannerItemCardProps[]>([
    {
      id: "dock-1",
      title: "Design District Walk",
      category: "Neighborhood",
      duration: 60,
      location: "Minato",
      accent: "from-gray-200 to-gray-300",
    },
    {
      id: "dock-2",
      title: "Kissa Coffee Break",
      category: "Cafe",
      duration: 45,
      location: "Aoyama",
      accent: "from-zinc-200 to-zinc-300",
    },
    {
      id: "dock-3",
      title: "Architectural Studio Visit",
      category: "Experience",
      duration: 90,
      location: "Shibuya",
      accent: "from-gray-300 to-gray-400",
    },
  ]);

  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>([
    {
      id: "event-1",
      title: "Morning at TeamLab",
      category: "Exhibition",
      dayId: "day-1",
      start: "09:00",
      duration: 90,
      location: "Toyosu",
    },
    {
      id: "event-2",
      title: "Ginza Lunch",
      category: "Dining",
      dayId: "day-1",
      start: "12:00",
      duration: 60,
      location: "Ginza",
    },
    {
      id: "event-3",
      title: "Roppongi Art Loop",
      category: "Museums",
      dayId: "day-2",
      start: "10:30",
      duration: 120,
      location: "Roppongi",
    },
  ]);

  const [activeDrag, setActiveDrag] = useState<ActiveDragMeta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const days: DayColumn[] = [
    { id: "day-1", label: "Day 1 · Arrival + Gallery Mile" },
    { id: "day-2", label: "Day 2 · Art District" },
    { id: "day-3", label: "Day 3 · Hidden Cafés" },
  ];

  const timeSlots = useMemo(() => buildTimeSlots("08:00", "21:00", 30), []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as ActiveDragMeta | undefined;
    if (!data) return;

    setActiveDrag({
      id: active.id as string,
      title: data.title,
      category: data.category,
      duration: data.duration,
      source: data.source,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current as ActiveDragMeta | undefined;
    const overData = over?.data.current as { type?: string; day?: string; time?: string } | undefined;

    setActiveDrag(null);

    if (!activeData) return;

    if (activeData.source === "unscheduled" && overData?.type === "timeslot" && overData.day && overData.time) {
      const newEvent: ScheduledEvent = {
        id: `event-${Date.now()}`,
        title: activeData.title,
        category: activeData.category,
        duration: activeData.duration,
        dayId: overData.day,
        start: overData.time,
      };

      setScheduledEvents((prev) => [...prev, newEvent]);
      setUnscheduled((prev) => prev.filter((item) => item.id !== active.id));
      return;
    }

    if (activeData.source === "scheduled" && overData?.type === "timeslot" && overData.day && overData.time) {
      setScheduledEvents((prev) =>
        prev.map((event) =>
          event.id === active.id
            ? {
                ...event,
                dayId: overData.day!,
                start: overData.time!,
              }
            : event
        )
      );
      return;
    }

    if (activeData.source === "unscheduled" && over && active.id !== over.id) {
      const activeIndex = unscheduled.findIndex((item) => item.id === active.id);
      const overIndex = unscheduled.findIndex((item) => item.id === over.id);
      if (activeIndex !== -1 && overIndex !== -1) {
        setUnscheduled((prev) => arrayMove(prev, activeIndex, overIndex));
      }
    }
  };

  const handleResize = (id: string, nextDuration: number) => {
    setScheduledEvents((prev) => prev.map((event) => (event.id === id ? { ...event, duration: nextDuration } : event)));
  };

  const handleAutofill = () => {
    setScheduledEvents((prev) => {
      const remaining = [...unscheduled];
      if (remaining.length === 0) return prev;

      const firstGapTime = timeSlots[Math.floor(timeSlots.length / 3)];

      const injected = remaining.slice(0, 2).map((item, index) => ({
        id: `event-autofill-${index}-${Date.now()}`,
        title: item.title,
        category: item.category,
        duration: item.duration,
        dayId: days[index % days.length].id,
        start: firstGapTime,
      }));

      setUnscheduled((prevDock) => prevDock.filter((item) => !injected.find((added) => added.title === item.title)));

      return [...prev, ...injected];
    });
  };

  const header = (
    <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Trip Planner</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold uppercase tracking-tight text-gray-900 dark:text-gray-50">Tokyo Liquid Canvas</h1>
          <span className="rounded-full border border-gray-200 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-gray-600 dark:border-zinc-800 dark:text-gray-300">
            Oct 12 – Oct 15
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("list")}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-gray-700 transition hover:-translate-y-0.5 hover:shadow-md dark:text-gray-200 ${
            view === "list"
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => setView("canvas")}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border text-gray-700 transition hover:-translate-y-0.5 hover:shadow-md dark:text-gray-200 ${
            view === "canvas"
              ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
              : "border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:shadow-md dark:border-white dark:bg-white dark:text-gray-900">
          <Download className="h-4 w-4" /> Export
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-800 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-100">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </div>
  );

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <PlannerLayout
        header={header}
        dock={<UnscheduledDock items={unscheduled} onAutofill={handleAutofill} />}
        canvas={<ItineraryCanvas days={days} timeSlots={timeSlots} events={scheduledEvents} onResize={handleResize} />}
      />
      <DragOverlay dropAnimation={{ duration: 150 }}>
        {activeDrag ? (
          <PlannerDragPreview
            title={activeDrag.title}
            category={activeDrag.category}
            duration={activeDrag.duration}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

