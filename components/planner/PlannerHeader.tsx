'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, MapPin, Share2, Download, Loader2, CalendarPlus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlanner } from '@/contexts/PlannerContext';

interface PlannerHeaderProps {
  title: string;
  destination?: string;
  onShare: () => Promise<string | null>;
  onExportPdf: () => Promise<void> | void;
  onExportIcal: () => Promise<void> | void;
  onSyncGoogle: () => Promise<void> | void;
  exportPdfPending?: boolean;
  exportIcalPending?: boolean;
  syncGooglePending?: boolean;
}

export function PlannerHeader({
  title,
  destination,
  onShare,
  onExportPdf,
  onExportIcal,
  onSyncGoogle,
  exportPdfPending,
  exportIcalPending,
  syncGooglePending,
}: PlannerHeaderProps) {
  const { itinerary, updateItinerary, saving, realtimeStatus } = usePlanner();
  const [localTitle, setLocalTitle] = useState(title);
  const [localDestination, setLocalDestination] = useState(destination || '');
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    setLocalDestination(destination || '');
  }, [destination]);

  const handleTitleBlur = () => {
    if (!localTitle.trim()) {
      setLocalTitle(itinerary?.title || 'Untitled trip');
      return;
    }
    updateItinerary({ title: localTitle.trim() });
  };

  const handleDestinationBlur = () => {
    updateItinerary({ destination: localDestination.trim() || null });
  };

  const handleShare = async () => {
    setShareStatus('idle');
    const link = await onShare();
    setShareStatus(link ? 'success' : 'error');
    if (link) {
      void navigator.clipboard?.writeText(link).catch(() => undefined);
    }
    setTimeout(() => setShareStatus('idle'), 2500);
  };

  const handleExportPdf = () => {
    if (onExportPdf) {
      void onExportPdf();
    }
  };

  const handleExportIcal = () => {
    if (onExportIcal) {
      void onExportIcal();
    }
  };

  const handleSyncGoogle = () => {
    if (onSyncGoogle) {
      void onSyncGoogle();
    }
  };

  return (
    <header className="flex flex-col gap-4 border-b border-neutral-200/80 bg-white/80 px-6 py-5 backdrop-blur dark:border-neutral-800/80 dark:bg-neutral-950/70">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Input
            value={localTitle}
            onChange={event => setLocalTitle(event.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Name your trip"
            className="h-12 w-full max-w-xl rounded-2xl border-neutral-200/70 bg-white text-2xl font-semibold text-neutral-900 transition focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
              <CalendarDays className="size-3.5" />
              {itinerary?.startDate && itinerary?.endDate
                ? `${new Date(itinerary.startDate).toLocaleDateString()} – ${new Date(itinerary.endDate).toLocaleDateString()}`
                : 'Flexible dates'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
              <MapPin className="size-3.5" />
              <input
                value={localDestination}
                onChange={event => setLocalDestination(event.target.value)}
                onBlur={handleDestinationBlur}
                placeholder="Destination"
                className="w-36 bg-transparent text-xs font-medium outline-none placeholder:text-neutral-400"
              />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Saving changes…
                </>
              ) : (
                <>
                  <span className="size-2 rounded-full bg-emerald-400" /> Synced
                </>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-neutral-600 dark:bg-neutral-800/80 dark:text-neutral-300">
              <span className={`size-2 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-400' : realtimeStatus === 'connecting' ? 'bg-amber-400' : 'bg-neutral-400'}`} />
              {realtimeStatus === 'connected'
                ? 'Live collaboration on'
                : realtimeStatus === 'connecting'
                  ? 'Connecting to Supabase…'
                  : 'Offline mode'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={handleShare} className="min-w-[6.5rem]">
            <Share2 className="size-4" />
            {shareStatus === 'success' ? 'Link copied' : 'Share'}
          </Button>
          <Button
            variant="default"
            onClick={handleExportPdf}
            disabled={exportPdfPending}
            className="gap-2"
          >
            {exportPdfPending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {exportPdfPending ? 'Exporting…' : 'Export PDF'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportIcal}
            disabled={exportIcalPending}
            className="gap-2"
          >
            {exportIcalPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
            {exportIcalPending ? 'Exporting…' : 'Export iCal'}
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncGoogle}
            disabled={syncGooglePending}
            className="gap-2"
          >
            {syncGooglePending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            {syncGooglePending ? 'Syncing…' : 'Sync Google'}
          </Button>
        </div>
      </div>
    </header>
  );
}

export default PlannerHeader;
