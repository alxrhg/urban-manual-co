'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import {
  Calendar,
  FileText,
  Plus,
  ChevronRight,
  Plane,
  MapPin,
  BedDouble,
  Clock,
} from 'lucide-react';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import { formatDuration, getEstimatedDuration } from '@/lib/trip-intelligence';

// ==================== Itinerary Widget ====================

interface TripDay {
  dayNumber: number;
  date: string | null;
  items: (ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes })[];
}

interface ItineraryWidgetProps {
  currentDay?: TripDay;
  onViewAllDays?: () => void;
  onAddItem?: () => void;
  className?: string;
}

export function ItineraryWidget({
  currentDay,
  onViewAllDays,
  onAddItem,
  className = '',
}: ItineraryWidgetProps) {
  const formattedDate = useMemo(() => {
    if (!currentDay?.date) return null;
    const date = new Date(currentDay.date);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [currentDay?.date]);

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <span className="font-semibold text-white">Itinerary</span>
        </div>
        <span className="text-sm text-gray-400">{formattedDate}</span>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {currentDay && currentDay.items.length > 0 ? (
          <div className="space-y-2">
            {currentDay.items.slice(0, 3).map((item) => {
              const isFlight = item.parsedNotes?.type === 'flight';
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2"
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center
                    ${isFlight ? 'bg-blue-500/20' : 'bg-gray-700'}
                  `}>
                    {isFlight ? (
                      <Plane className="w-4 h-4 text-blue-400" />
                    ) : item.parsedNotes?.type === 'hotel' ? (
                      <BedDouble className="w-4 h-4 text-purple-400" />
                    ) : (
                      <MapPin className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {item.title}
                    </div>
                    {item.time && (
                      <div className="text-xs text-orange-500">
                        {item.time}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {currentDay.items.length > 3 && (
              <div className="text-xs text-gray-500 pt-1">
                +{currentDay.items.length - 3} more items
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onAddItem}
            className="flex items-center gap-2 py-3 text-orange-500 hover:text-orange-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Start organizing your itinerary</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={onViewAllDays}
        className="w-full px-4 py-3 text-orange-500 text-sm font-medium hover:bg-gray-700/30 transition-colors border-t border-gray-700/50"
      >
        View All Days
      </button>
    </div>
  );
}

// ==================== Documents Widget ====================

export interface TripDocument {
  id: string;
  title: string;
  date?: string;
  type?: 'note' | 'file' | 'link';
  addedAt?: string;
}

interface DocumentsWidgetProps {
  documents?: TripDocument[];
  onAddDocument?: () => void;
  onViewDocument?: (doc: TripDocument) => void;
  className?: string;
}

export function DocumentsWidget({
  documents = [],
  onAddDocument,
  onViewDocument,
  className = '',
}: DocumentsWidgetProps) {
  const formatDocDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <span className="font-semibold text-white">Documents</span>
        </div>
        <button
          onClick={onAddDocument}
          className="w-6 h-6 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-orange-500" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-2">
        {documents.length > 0 ? (
          <div className="space-y-1">
            {documents.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                onClick={() => onViewDocument?.(doc)}
                className="flex items-center justify-between w-full py-2.5 hover:bg-gray-700/30 rounded-lg px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <span className="text-sm text-white truncate">{doc.title}</span>
                </div>
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatDocDate(doc.addedAt)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-gray-500 text-sm">
            No documents yet
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Next Activity Widget ====================

interface NextActivityWidgetProps {
  item?: ItineraryItem & { destination?: Destination; parsedNotes?: ItineraryItemNotes };
  dayDate?: string | null;
  onView?: () => void;
  className?: string;
}

export function NextActivityWidget({
  item,
  dayDate,
  onView,
  className = '',
}: NextActivityWidgetProps) {
  if (!item) {
    return null;
  }

  const isFlight = item.parsedNotes?.type === 'flight';
  const imageUrl = item.destination?.image_thumbnail || item.destination?.image || item.parsedNotes?.image;

  const formattedDate = useMemo(() => {
    if (!dayDate) return null;
    const date = new Date(dayDate);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [dayDate]);

  return (
    <button
      onClick={onView}
      className={`w-full bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden hover:bg-gray-800 transition-colors ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${isFlight ? 'bg-blue-500/20' : 'bg-gray-700'}
          `}>
            {isFlight ? (
              <Plane className="w-4 h-4 text-blue-400" />
            ) : (
              <Clock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <span className="font-semibold text-white">Next Activity</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </div>

      {/* Content */}
      <div className="flex items-center gap-4 p-4">
        {/* Image */}
        <div className={`
          relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0
          ${isFlight ? 'bg-blue-500/20' : 'bg-gray-700'}
        `}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              className="object-cover"
              sizes="56px"
            />
          ) : isFlight ? (
            <div className="w-full h-full flex items-center justify-center">
              <Plane className="w-6 h-6 text-blue-400" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-base font-medium text-white truncate">
            {item.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {item.time && (
              <span className="text-sm text-orange-500 font-medium">
                {item.time}
              </span>
            )}
            {formattedDate && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-sm text-gray-400">{formattedDate}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ==================== Expenses Widget (Placeholder) ====================

interface ExpensesWidgetProps {
  totalExpenses?: number;
  currency?: string;
  onAddExpense?: () => void;
  className?: string;
}

export function ExpensesWidget({
  totalExpenses = 0,
  currency = 'USD',
  onAddExpense,
  className = '',
}: ExpensesWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className={`bg-gray-800/80 backdrop-blur-sm rounded-2xl overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-lg font-semibold">$</span>
          </div>
          <div>
            <div className="text-sm text-gray-400">Total Expenses</div>
            <div className="text-xl font-bold text-white">{formatCurrency(totalExpenses)}</div>
          </div>
        </div>
        <button
          onClick={onAddExpense}
          className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
        >
          <Plus className="w-4 h-4 text-orange-500" />
        </button>
      </div>
    </div>
  );
}
