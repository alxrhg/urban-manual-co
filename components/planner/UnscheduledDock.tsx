'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { Clock3, MapPin, Sparkles, Tag } from 'lucide-react';
import { useUnscheduledContext } from '@/contexts/UnscheduledContext';
import { DestinationCardSkeleton } from '@/components/skeletons/DestinationCardSkeleton';

export function UnscheduledDock() {
  const { items, isSearching, lastQuery } = useUnscheduledContext();
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const previousIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(items.map((item) => item.slug || item.id));
    const newIds = Array.from(currentIds).filter((id) => !previousIds.current.has(id));

    previousIds.current = currentIds;

    if (newIds.length > 0) {
      setHighlighted((prev) => new Set([...Array.from(prev), ...newIds]));
      const timeout = setTimeout(() => {
        setHighlighted(new Set());
      }, 1400);
      return () => clearTimeout(timeout);
    }
  }, [items]);

  const emptyState = useMemo(
    () => items.length === 0 && !isSearching,
    [items, isSearching]
  );

  return (
    <aside className="sticky top-6 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <Sparkles className="h-4 w-4" />
            Unscheduled Dock
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Drag to your canvas to schedule.</p>
        </div>
        {lastQuery && (
          <span className="text-[11px] px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {lastQuery}
          </span>
        )}
      </div>

      {isSearching && items.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true">
          {[...Array(4)].map((_, index) => (
            <DestinationCardSkeleton key={index} />
          ))}
        </div>
      )}

      {emptyState && (
        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Use PlannerChat to pull candidates into your dock.
        </div>
      )}

      <AnimatePresence initial={false}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item) => {
            const key = item.slug || item.id;
            const isNew = highlighted.has(key);

            return (
              <motion.div
                key={key}
                layout
                layoutId={`dock-${key}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm hover:shadow-lg transition ${isNew ? 'ring-2 ring-indigo-500/60 ring-offset-2 ring-offset-white dark:ring-offset-gray-950' : ''}`}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('application/json', JSON.stringify(item));
                }}
              >
                {item.image && (
                  <div className="relative h-28 w-full">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 320px"
                    />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</div>
                    {item.category && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        <Tag className="h-3 w-3" />
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.city && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {item.city}
                    </div>
                  )}
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                    <span>Drag to add</span>
                    <div className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      Unscheduled
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {isSearching && items.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
          Updating dock with new candidates...
        </div>
      )}
    </aside>
  );
}
