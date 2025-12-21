'use client';

import { useState } from 'react';
import {
  Download,
  FileText,
  Calendar,
  Map,
  Link2,
  Mail,
  Loader2,
  Check,
  ChevronDown,
  Copy,
  Share2,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import type { TripDay } from '@/lib/hooks/useTripEditor';

interface ExportMenuProps {
  trip: Trip;
  days: TripDay[];
  onClose?: () => void;
  className?: string;
}

type ExportFormat = 'pdf' | 'google_calendar' | 'apple_calendar' | 'google_maps' | 'share_link' | 'email';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  } catch {
    return timeStr;
  }
}

export default function ExportMenu({
  trip,
  days,
  onClose,
  className = '',
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [exportSuccess, setExportSuccess] = useState<ExportFormat | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePDFContent = (): string => {
    let content = `# ${trip.title || 'My Trip'}\n\n`;
    content += `**Destination:** ${trip.destination || 'Not specified'}\n`;
    content += `**Dates:** ${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}\n\n`;
    content += `---\n\n`;

    days.forEach(day => {
      const dayDate = day.date ? formatDate(day.date) : `Day ${day.dayNumber}`;
      content += `## ${dayDate}\n\n`;

      if (day.items.length === 0) {
        content += `*No activities planned*\n\n`;
      } else {
        day.items.forEach(item => {
          const time = item.time ? formatTime(item.time) : '';
          const type = item.parsedNotes?.type;
          const notes = item.parsedNotes;

          if (type === 'flight') {
            content += `### ✈️ ${time} - ${item.title}\n`;
            content += `${notes?.from || ''} → ${notes?.to || ''}\n`;
            if (notes?.confirmationNumber) {
              content += `Confirmation: ${notes.confirmationNumber}\n`;
            }
          } else if (type === 'hotel') {
            content += `### 🏨 ${item.title}\n`;
            content += `Check-in: ${notes?.checkInTime || '3:00 PM'}\n`;
            content += `Check-out: ${notes?.checkOutTime || '11:00 AM'}\n`;
            if (notes?.hotelConfirmation) {
              content += `Confirmation: ${notes.hotelConfirmation}\n`;
            }
          } else if (type === 'train') {
            content += `### 🚂 ${time} - ${item.title}\n`;
            content += `${notes?.from || ''} → ${notes?.to || ''}\n`;
          } else {
            content += `### 📍 ${time} - ${item.title}\n`;
            if (item.destination?.neighborhood) {
              content += `${item.destination.neighborhood}\n`;
            }
          }

          if (notes?.raw) {
            content += `\n*${notes.raw}*\n`;
          }
          content += `\n`;
        });
      }
      content += `---\n\n`;
    });

    return content;
  };

  const generateICSContent = (): string => {
    const events: string[] = [];

    days.forEach(day => {
      day.items.forEach(item => {
        if (!day.date || !item.time) return;

        const [hours, minutes] = item.time.split(':').map(Number);
        const startDate = new Date(`${day.date}T${item.time}:00`);
        const duration = item.parsedNotes?.duration || 60;
        const endDate = new Date(startDate.getTime() + duration * 60000);

        const formatICSDate = (d: Date): string => {
          return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const event = [
          'BEGIN:VEVENT',
          `DTSTART:${formatICSDate(startDate)}`,
          `DTEND:${formatICSDate(endDate)}`,
          `SUMMARY:${item.title}`,
          `DESCRIPTION:${item.description || ''}`,
          item.destination?.formatted_address ? `LOCATION:${item.destination.formatted_address}` : '',
          `UID:${item.id}@urbanmanual.co`,
          'END:VEVENT',
        ].filter(Boolean).join('\n');

        events.push(event);
      });
    });

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Urban Manual//Trip Planner//EN',
      `X-WR-CALNAME:${trip.title || 'My Trip'}`,
      ...events,
      'END:VCALENDAR',
    ].join('\n');
  };

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(format);
    setExportSuccess(null);

    try {
      switch (format) {
        case 'pdf': {
          const content = generatePDFContent();
          const blob = new Blob([content], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${trip.title || 'trip'}-itinerary.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }

        case 'google_calendar':
        case 'apple_calendar': {
          const icsContent = generateICSContent();
          const blob = new Blob([icsContent], { type: 'text/calendar' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${trip.title || 'trip'}.ics`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          break;
        }

        case 'google_maps': {
          // Generate Google Maps URL with all locations
          const locations = days.flatMap(day =>
            day.items
              .filter(item => item.destination?.latitude && item.destination?.longitude)
              .map(item => `${item.destination!.latitude},${item.destination!.longitude}`)
          );

          if (locations.length > 0) {
            const mapsUrl = `https://www.google.com/maps/dir/${locations.join('/')}`;
            window.open(mapsUrl, '_blank');
          }
          break;
        }

        case 'share_link': {
          // Generate shareable link
          const baseUrl = window.location.origin;
          const url = `${baseUrl}/trips/${trip.id}?share=true`;
          setShareUrl(url);
          break;
        }

        case 'email': {
          const content = generatePDFContent();
          const subject = encodeURIComponent(trip.title || 'My Trip Itinerary');
          const body = encodeURIComponent(content);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
          break;
        }
      }

      setExportSuccess(format);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportOptions = [
    {
      format: 'pdf' as ExportFormat,
      icon: FileText,
      label: 'Download Itinerary',
      description: 'Markdown file for printing',
    },
    {
      format: 'google_calendar' as ExportFormat,
      icon: Calendar,
      label: 'Add to Calendar',
      description: 'Import to Google or Apple Calendar',
    },
    {
      format: 'google_maps' as ExportFormat,
      icon: Map,
      label: 'Open in Google Maps',
      description: 'View route with all locations',
    },
    {
      format: 'share_link' as ExportFormat,
      icon: Link2,
      label: 'Get Share Link',
      description: 'Share trip with others',
    },
    {
      format: 'email' as ExportFormat,
      icon: Mail,
      label: 'Email Itinerary',
      description: 'Send via email',
    },
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-gray-500" />
          <span className="text-[14px] font-semibold text-gray-900 dark:text-white">
            Export Trip
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-2">
        {exportOptions.map(option => {
          const Icon = option.icon;
          const isLoading = isExporting === option.format;
          const isSuccess = exportSuccess === option.format;

          return (
            <button
              key={option.format}
              onClick={() => handleExport(option.format)}
              disabled={isLoading}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                ) : isSuccess ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Icon className="w-4 h-4 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
                <p className="text-[11px] text-gray-500">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Share link section */}
      {shareUrl && (
        <div className="mx-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">
              Share Link
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-[12px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
            />
            <button
              onClick={copyShareLink}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
