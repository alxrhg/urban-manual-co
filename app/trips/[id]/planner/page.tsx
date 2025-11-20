"use client";

import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { PlannerLayout } from "@/components/planner/PlannerLayout";
import { UnscheduledDock, type DockItem } from "@/components/planner/UnscheduledDock";
import { ItineraryCanvas, type ScheduledEvent } from "@/components/planner/ItineraryCanvas";
import { GlobalTripHeader } from "@/components/planner/GlobalTripHeader";
import { DraggableEventCard } from "@/components/planner/DraggableEvent";

const START_HOUR = 8;
const END_HOUR = 21;

const initialDock: DockItem[] = [
  {
    id: "dock-1",
    title: "Whitney Museum",
    category: "MUSEUM",
    duration: 90,
    thumbnail: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "dock-2",
    title: "Chelsea Market",
    category: "FOOD HALL",
    duration: 60,
    thumbnail: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "dock-3",
    title: "High Line Walk",
    category: "WALK",
    duration: 45,
    thumbnail: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "dock-4",
    title: "Dinner at Lilia",
    category: "DINING",
    duration: 120,
    thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
  },
];

const initialScheduled: ScheduledEvent[] = [
  {
    id: "scheduled-1",
    title: "Arrival + Check-in",
    category: "SETTLING",
    duration: 60,
    start: START_HOUR * 60 + 30,
    day: 1,
  },
  {
    id: "scheduled-2",
    title: "Lunch in SoHo",
    category: "DINING",
    duration: 75,
    start: START_HOUR * 60 + 210,
    day: 1,
  },
];

export default function PlannerPage() {
  const [dockItems, setDockItems] = useState<DockItem[]>(initialDock);
  const [scheduledEvents, setScheduledEvents] = useState<ScheduledEvent[]>(initialScheduled);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const timeSlots = useMemo(() => {
    const slots: number[] = [];
    for (let minute = START_HOUR * 60; minute <= END_HOUR * 60; minute += 30) {
      slots.push(minute);
    }
    return slots;
  }, []);

  const days = [1, 2, 3];

  const handleDragStart = ({ active }: { active: { id: string } }) => {
    setActiveId(active.id);
  };

  const handleDragEnd = ({ active, over }: any) => {
    setActiveId(null);
    if (!over) return;

    const activeType = active.data?.current?.type;
    const overData = over.data?.current;

    if (over.id === "dock-drop" && activeType === "scheduled") {
      const moving = scheduledEvents.find((evt) => evt.id === active.id);
      if (moving) {
        setScheduledEvents((prev) => prev.filter((evt) => evt.id !== active.id));
        setDockItems((prev) => [{
          id: moving.id,
          title: moving.title,
          category: moving.category,
          duration: moving.duration,
          thumbnail: "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=400&q=80",
        }, ...prev]);
      }
      return;
    }

    if (overData?.slotMinute !== undefined && overData?.day) {
      const start = overData.slotMinute;
      const day = overData.day as number;

      if (activeType === "dock") {
        const item = dockItems.find((itm) => itm.id === active.id);
        if (!item) return;
        setDockItems((prev) => prev.filter((itm) => itm.id !== active.id));
        setScheduledEvents((prev) => [
          ...prev,
          {
            id: `scheduled-${Date.now()}`,
            title: item.title,
            category: item.category,
            duration: item.duration,
            start,
            day,
          },
        ]);
        return;
      }

      if (activeType === "scheduled") {
        setScheduledEvents((prev) =>
          prev.map((evt) => (evt.id === active.id ? { ...evt, start, day } : evt))
        );
      }
    }
  };

  const activeDockItem = dockItems.find((itm) => itm.id === activeId);
  const activeScheduled = scheduledEvents.find((evt) => evt.id === activeId);

  return (
    <PlannerLayout>
      <GlobalTripHeader />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <PlannerLayout.Windows>
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-[420px] max-w-[440px]"
          >
            <UnscheduledDock items={dockItems} />
          </motion.div>
          <AnimatePresence mode="popLayout">
            <motion.div
              key="canvas"
              layout
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
              className="flex-1 min-w-0"
            >
              <ItineraryCanvas
                days={days}
                timeSlots={timeSlots}
                events={scheduledEvents}
                startHour={START_HOUR}
              />
            </motion.div>
          </AnimatePresence>
        </PlannerLayout.Windows>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {activeDockItem && (
              <DraggableEventCard item={activeDockItem} dragging variant="dock" />
            )}
            {activeScheduled && (
              <DraggableEventCard
                item={{
                  id: activeScheduled.id,
                  title: activeScheduled.title,
                  category: activeScheduled.category,
                  duration: activeScheduled.duration,
                }}
                dragging
                variant="canvas"
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </PlannerLayout>
  );
}
