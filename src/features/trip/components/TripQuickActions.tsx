'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TripQuickActionsProps {
  tripId: string;
  tripTitle: string;
  startDate?: string | null;
  endDate?: string | null;
  destination?: string;
  className?: string;
}

/**
 * TripQuickActions - Floating action buttons for trip sharing and export
 * Share Trip, Export to Calendar, Print Itinerary
 */
export default function TripQuickActions({
  tripId,
  tripTitle,
  startDate,
  endDate,
  destination,
  className = '',
}: TripQuickActionsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Generate shareable link
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/trips/${tripId}`
    : '';

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Generate calendar export URL (Google Calendar)
  const handleExportCalendar = () => {
    if (!startDate) return;

    setExporting(true);

    // Format dates for Google Calendar
    const formatDate = (dateStr: string) => {
      return dateStr.replace(/-/g, '');
    };

    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : start;

    const calendarUrl = new URL('https://calendar.google.com/calendar/render');
    calendarUrl.searchParams.set('action', 'TEMPLATE');
    calendarUrl.searchParams.set('text', tripTitle);
    calendarUrl.searchParams.set('dates', `${start}/${end}`);
    calendarUrl.searchParams.set('details', `Trip planned with Urban Manual\n\nView itinerary: ${shareUrl}`);
    if (destination) {
      calendarUrl.searchParams.set('location', destination);
    }

    window.open(calendarUrl.toString(), '_blank');
    setExporting(false);
  };

  // Print itinerary
  const handlePrint = () => {
    window.print();
  };

  // Native share if available
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripTitle,
          text: destination ? `Check out my trip to ${destination}!` : 'Check out my trip!',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        setShowShareMenu(true);
      }
    } else {
      setShowShareMenu(true);
    }
  };

  // Plain text links - no buttons, no borders
  const textLinkClass = "text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors";
  const serifStyle = { fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Share - text link */}
      <div className="relative">
        <button
          onClick={handleNativeShare}
          className={textLinkClass}
          style={serifStyle}
        >
          {copied ? 'Copied!' : 'Share'}
        </button>

        {/* Share Menu Dropdown - minimal styling */}
        <AnimatePresence>
          {showShareMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setShowShareMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-2 w-56 bg-[var(--editorial-bg)] border border-[var(--editorial-border)] z-50 py-2"
              >
                <button
                  onClick={handleCopyLink}
                  className="w-full px-4 py-2 text-left text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                  style={serifStyle}
                >
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out my trip${destination ? ` to ${destination}` : ''}!`)}`, '_blank');
                    setShowShareMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-[13px] text-[var(--editorial-text-secondary)] hover:text-[var(--editorial-text-primary)] transition-colors"
                  style={serifStyle}
                >
                  Share on X
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Export - text link */}
      {startDate && (
        <>
          <span className="text-[var(--editorial-text-tertiary)]">·</span>
          <button
            onClick={handleExportCalendar}
            disabled={exporting}
            className={`${textLinkClass} disabled:opacity-50`}
            style={serifStyle}
          >
            Export
          </button>
        </>
      )}

      {/* Print - text link */}
      <span className="text-[var(--editorial-text-tertiary)]">·</span>
      <button
        onClick={handlePrint}
        className={`${textLinkClass} print:hidden`}
        style={serifStyle}
      >
        Print
      </button>
    </div>
  );
}
