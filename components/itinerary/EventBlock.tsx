import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { DragOrigin, Place } from "./ItineraryCanvas";

interface EventBlockProps {
  item: Place;
  origin: DragOrigin;
  slotMinutes: number;
  isOverlay?: boolean;
  style?: React.CSSProperties;
}

const formatDuration = (minutes: number) => `${minutes} min`;

const EventBlock: React.FC<EventBlockProps> = ({
  item,
  origin,
  slotMinutes,
  isOverlay = false,
  style,
}) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item, origin },
  });

  const composedStyle: React.CSSProperties = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging && !isOverlay ? 0.2 : 1,
  };

  const baseClasses = isOverlay
    ? "relative z-50 border border-black bg-black text-white"
    : "relative border border-gray-900 bg-white text-gray-900 dark:border-gray-100 dark:text-white";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${baseClasses} flex h-full w-full cursor-grab flex-col justify-between px-3 py-2 uppercase tracking-[0.06em] transition-transform duration-100 ease-linear active:cursor-grabbing`}
      style={composedStyle}
    >
      <div className="flex items-start justify-between text-[11px] font-bold">
        <span className="line-clamp-2 leading-tight">{item.name}</span>
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-300">
          {item.startTime || "--:--"}
        </span>
      </div>

      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-600 dark:text-gray-200">
        <span>{formatDuration(item.duration)}</span>
        <span className="text-[10px] uppercase">{Math.ceil(item.duration / slotMinutes)} slots</span>
      </div>
    </div>
  );
};

export default EventBlock;
