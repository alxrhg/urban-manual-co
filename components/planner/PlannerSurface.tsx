'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Share2, Download, CalendarPlus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { usePlanner } from '@/contexts/PlannerContext';
import { useToast } from '@/hooks/useToast';
import { trackEvent } from '@/lib/analytics/track';
import { PlannerHeader } from './PlannerHeader';
import { PlannerBoard } from './PlannerBoard';
import { PlannerSidebar } from './PlannerSidebar';
import { PlannerCollaborationBar } from './PlannerCollaborationBar';

export function PlannerSurface() {
  const {
    itinerary,
    loading,
    error,
    shareItinerary,
    exportItinerary,
    exportItineraryToIcs,
    syncGoogleCalendar,
  } = usePlanner();
  const toast = useToast();
  const [exportPdfPending, setExportPdfPending] = useState(false);
  const [exportIcalPending, setExportIcalPending] = useState(false);
  const [syncGooglePending, setSyncGooglePending] = useState(false);

  const handleExportPdf = useCallback(async () => {
    if (!itinerary) {
      toast.error('Load your trip before exporting the planner.');
      return;
    }

    setExportPdfPending(true);
    try {
      const success = exportItinerary();
      if (success) {
        toast.success('Opened the print preview for your itinerary.');
        await trackEvent({
          event_type: 'click',
          metadata: {
            source: 'planner',
            action: 'export_pdf',
            trip_id: itinerary.tripId,
          },
        });
      } else {
        toast.error('Unable to start the PDF export. Try again shortly.');
      }
    } catch (error) {
      console.error('[PlannerSurface] PDF export failed', error);
      toast.error('Unable to start the PDF export. Try again shortly.');
    } finally {
      setExportPdfPending(false);
    }
  }, [exportItinerary, itinerary, toast]);

  const handleExportIcal = useCallback(async () => {
    if (!itinerary) {
      toast.error('Load your trip before exporting the planner.');
      return;
    }

    setExportIcalPending(true);
    try {
      const success = await exportItineraryToIcs();
      if (success) {
        toast.success('Downloaded an iCal file for this trip.');
        await trackEvent({
          event_type: 'click',
          metadata: {
            source: 'planner',
            action: 'export_ical',
            trip_id: itinerary.tripId,
          },
        });
      } else {
        toast.error('Unable to export an iCal file right now.');
      }
    } catch (error) {
      console.error('[PlannerSurface] iCal export failed', error);
      toast.error('Unable to export an iCal file right now.');
    } finally {
      setExportIcalPending(false);
    }
  }, [exportItineraryToIcs, itinerary, toast]);

  const handleSyncGoogle = useCallback(async () => {
    if (!itinerary) {
      toast.error('Load your trip before syncing calendars.');
      return;
    }

    setSyncGooglePending(true);
    try {
      const result = await syncGoogleCalendar();
      if (result.success && result.url) {
        toast.info('Redirecting to Google Calendar to finish connecting…', 4000);
        await trackEvent({
          event_type: 'click',
          metadata: {
            source: 'planner',
            action: 'sync_google_calendar',
            trip_id: itinerary.tripId,
          },
        });
        window.location.assign(result.url);
      } else {
        toast.error(result.error ?? 'Unable to start Google Calendar sync.');
      }
    } catch (error) {
      console.error('[PlannerSurface] Google Calendar sync failed', error);
      toast.error('Unable to start Google Calendar sync.');
    } finally {
      setSyncGooglePending(false);
    }
  }, [syncGoogleCalendar, itinerary, toast]);

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
        onExportPdf={handleExportPdf}
        onExportIcal={handleExportIcal}
        onSyncGoogle={handleSyncGoogle}
        exportPdfPending={exportPdfPending}
        exportIcalPending={exportIcalPending}
        syncGooglePending={syncGooglePending}
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
          <Button
            variant="ghost"
            size="sm"
            disabled={exportPdfPending}
            onClick={() => void handleExportPdf()}
          >
            <Download className="size-4" /> {exportPdfPending ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={exportIcalPending}
            onClick={() => void handleExportIcal()}
          >
            <CalendarPlus className="size-4" /> {exportIcalPending ? 'Exporting…' : 'Export iCal'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={syncGooglePending}
            onClick={() => void handleSyncGoogle()}
          >
            <RefreshCcw className="size-4" /> {syncGooglePending ? 'Syncing…' : 'Sync Google'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PlannerSurface;
