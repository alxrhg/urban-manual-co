'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePlanner } from '@/contexts/PlannerContext';
import { PlannerHeader } from './PlannerHeader';
import { PlannerBoard } from './PlannerBoard';
import { PlannerSidebar } from './PlannerSidebar';
import { PlannerCollaborationBar } from './PlannerCollaborationBar';

export function PlannerSurface() {
  const { itinerary, loading, error, shareItinerary, exportItinerary } = usePlanner();

  if (loading && !itinerary) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
          <Spinner className="size-6" />
          <span className="text-sm">Loading your collaborative planner…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-neutral-50 dark:bg-neutral-950">
      <PlannerHeader
        onShare={shareItinerary}
        onExport={exportItinerary}
        title={itinerary?.title || 'Trip planner'}
        destination={itinerary?.destination || undefined}
      />

      <PlannerCollaborationBar />

      {error && (
        <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 flex-shrink-0" />
            <div>
              <p className="font-medium">We ran into an issue</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        layout
        className="flex flex-1 gap-6 overflow-hidden px-6 pb-6 pt-4"
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      >
        <div className="flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-lg shadow-neutral-900/5 dark:border-neutral-800 dark:bg-neutral-900/60 dark:shadow-black/40">
          {itinerary ? <PlannerBoard /> : null}
        </div>

        <PlannerSidebar />
      </motion.div>

      <div className="flex items-center justify-between border-t border-neutral-200/70 bg-white/70 px-6 py-3 text-xs text-neutral-500 backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-900/60 dark:text-neutral-400">
        <div>
          {itinerary?.sharedLink ? (
            <span>
              Shared via <a href={itinerary.sharedLink} className="font-medium text-primary hover:underline">public trip page</a>
            </span>
          ) : (
            <span>Enable sharing to generate a public trip link.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void shareItinerary()}>
            <Share2 className="size-4" /> Share
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportItinerary()}>
            <Download className="size-4" /> Export
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PlannerSurface;
