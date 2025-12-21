'use client';

import { useMemo, useState } from 'react';
import {
  Plane,
  Hotel,
  UtensilsCrossed,
  Train,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  X
} from 'lucide-react';
import type { EnrichedItineraryItem, TripDay } from '@/lib/hooks/useTripEditor';
import type { Trip } from '@/types/trip';

interface Reservation {
  id: string;
  type: 'flight' | 'hotel' | 'restaurant' | 'train' | 'activity';
  name: string;
  subtitle?: string;
  date?: string;
  time?: string;
  endTime?: string;
  status: 'confirmed' | 'pending' | 'not_booked' | 'cancelled';
  confirmationNumber?: string;
  bookingUrl?: string;
  details: Record<string, string | number | boolean | undefined>;
  itemId: string;
  dayNumber: number;
}

interface ReservationHubProps {
  trip: Trip;
  days: TripDay[];
  onUpdateItem?: (itemId: string, updates: Record<string, unknown>) => void;
  className?: string;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | undefined | null): string {
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

export default function ReservationHub({
  trip,
  days,
  onUpdateItem,
  className = '',
}: ReservationHubProps) {
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract all reservations from trip items
  const reservations = useMemo(() => {
    const result: Reservation[] = [];

    days.forEach(day => {
      day.items.forEach(item => {
        const type = item.parsedNotes?.type;
        const notes = item.parsedNotes;

        if (type === 'flight') {
          result.push({
            id: `flight-${item.id}`,
            type: 'flight',
            name: `${notes?.airline || ''} ${notes?.flightNumber || 'Flight'}`.trim(),
            subtitle: `${notes?.from || ''} → ${notes?.to || ''}`,
            date: notes?.departureDate,
            time: notes?.departureTime,
            endTime: notes?.arrivalTime,
            status: notes?.confirmationNumber ? 'confirmed' : 'pending',
            confirmationNumber: notes?.confirmationNumber,
            details: {
              airline: notes?.airline,
              flightNumber: notes?.flightNumber,
              from: notes?.from,
              to: notes?.to,
              seat: notes?.seatNumber,
              terminal: notes?.terminal,
              gate: notes?.gate,
            },
            itemId: item.id,
            dayNumber: day.dayNumber,
          });
        } else if (type === 'hotel') {
          result.push({
            id: `hotel-${item.id}`,
            type: 'hotel',
            name: item.title || notes?.name || 'Hotel',
            subtitle: notes?.address || item.description || undefined,
            date: notes?.checkInDate,
            time: notes?.checkInTime,
            endTime: notes?.checkOutTime,
            status: notes?.hotelConfirmation || notes?.confirmation ? 'confirmed' : 'pending',
            confirmationNumber: notes?.hotelConfirmation || notes?.confirmation,
            details: {
              checkInDate: notes?.checkInDate,
              checkOutDate: notes?.checkOutDate,
              checkInTime: notes?.checkInTime,
              checkOutTime: notes?.checkOutTime,
              roomType: notes?.roomType,
              nights: notes?.checkInDate && notes?.checkOutDate
                ? Math.ceil((new Date(notes.checkOutDate).getTime() - new Date(notes.checkInDate).getTime()) / (1000 * 60 * 60 * 24))
                : undefined,
            },
            itemId: item.id,
            dayNumber: day.dayNumber,
          });
        } else if (type === 'train') {
          result.push({
            id: `train-${item.id}`,
            type: 'train',
            name: `${notes?.trainLine || ''} ${notes?.trainNumber || 'Train'}`.trim(),
            subtitle: `${notes?.from || ''} → ${notes?.to || ''}`,
            date: notes?.departureDate,
            time: notes?.departureTime,
            endTime: notes?.arrivalTime,
            status: notes?.confirmationNumber ? 'confirmed' : 'pending',
            confirmationNumber: notes?.confirmationNumber,
            details: {
              trainLine: notes?.trainLine,
              trainNumber: notes?.trainNumber,
              from: notes?.from,
              to: notes?.to,
              duration: notes?.duration,
            },
            itemId: item.id,
            dayNumber: day.dayNumber,
          });
        } else if (item.destination?.category?.toLowerCase().includes('restaurant')) {
          const bookingStatus = notes?.bookingStatus;
          result.push({
            id: `restaurant-${item.id}`,
            type: 'restaurant',
            name: item.title || item.destination?.name || 'Restaurant',
            subtitle: item.destination?.neighborhood || item.destination?.formatted_address,
            date: day.date || undefined,
            time: item.time || undefined,
            status: bookingStatus === 'booked' ? 'confirmed' : bookingStatus === 'waitlist' ? 'pending' : 'not_booked',
            confirmationNumber: notes?.confirmation,
            details: {
              partySize: notes?.partySize,
              cuisine: item.destination?.category,
            },
            itemId: item.id,
            dayNumber: day.dayNumber,
          });
        }
      });
    });

    // Sort by date and time
    return result.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
  }, [days]);

  // Group by type
  const groupedReservations = useMemo(() => {
    const groups: Record<string, Reservation[]> = {
      flight: [],
      hotel: [],
      train: [],
      restaurant: [],
    };

    reservations.forEach(res => {
      if (groups[res.type]) {
        groups[res.type].push(res);
      }
    });

    return groups;
  }, [reservations]);

  // Status counts
  const statusCounts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let notBooked = 0;

    reservations.forEach(res => {
      if (res.status === 'confirmed') confirmed++;
      else if (res.status === 'pending') pending++;
      else if (res.status === 'not_booked') notBooked++;
    });

    return { confirmed, pending, notBooked, total: reservations.length };
  }, [reservations]);

  const copyConfirmation = async (id: string, confirmationNumber: string) => {
    try {
      await navigator.clipboard.writeText(confirmationNumber);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      case 'not_booked':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: Reservation['type']) => {
    switch (type) {
      case 'flight':
        return <Plane className="w-4 h-4" />;
      case 'hotel':
        return <Hotel className="w-4 h-4" />;
      case 'train':
        return <Train className="w-4 h-4" />;
      case 'restaurant':
        return <UtensilsCrossed className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  if (reservations.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-[14px] font-medium text-gray-900 dark:text-white mb-1">
          No reservations yet
        </h3>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          Add flights, hotels, or restaurants to track your bookings
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Summary header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-3">
          Reservations
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-[12px] text-gray-600 dark:text-gray-300">
              {statusCounts.confirmed} confirmed
            </span>
          </div>
          {statusCounts.pending > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[12px] text-gray-600 dark:text-gray-300">
                {statusCounts.pending} pending
              </span>
            </div>
          )}
          {statusCounts.notBooked > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[12px] text-gray-600 dark:text-gray-300">
                {statusCounts.notBooked} needs booking
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grouped reservations */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Object.entries(groupedReservations).map(([type, items]) => {
          if (items.length === 0) return null;

          const isExpanded = expandedType === type || expandedType === null;
          const typeLabels: Record<string, string> = {
            flight: 'Flights',
            hotel: 'Hotels',
            train: 'Trains',
            restaurant: 'Restaurants',
          };

          return (
            <div key={type}>
              {/* Type header */}
              <button
                onClick={() => setExpandedType(expandedType === type ? null : type)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                  {getTypeIcon(type as Reservation['type'])}
                </div>
                <span className="text-[13px] font-medium text-gray-900 dark:text-white flex-1">
                  {typeLabels[type] || type}
                </span>
                <span className="text-[12px] text-gray-400 mr-2">
                  {items.length}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {/* Reservation items */}
              {isExpanded && (
                <div className="pb-2">
                  {items.map(reservation => (
                    <div
                      key={reservation.id}
                      className="mx-4 mb-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {getStatusIcon(reservation.status)}
                            <span className="text-[13px] font-medium text-gray-900 dark:text-white truncate">
                              {reservation.name}
                            </span>
                          </div>
                          {reservation.subtitle && (
                            <p className="text-[12px] text-gray-500 truncate">
                              {reservation.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
                            {reservation.date && (
                              <span>{formatDate(reservation.date)}</span>
                            )}
                            {reservation.time && (
                              <>
                                <span>·</span>
                                <span>
                                  {formatTime(reservation.time)}
                                  {reservation.endTime && ` - ${formatTime(reservation.endTime)}`}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>Day {reservation.dayNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Confirmation number */}
                      {reservation.confirmationNumber && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-gray-500">
                              Confirmation
                            </span>
                            <button
                              onClick={() => copyConfirmation(reservation.id, reservation.confirmationNumber!)}
                              className="flex items-center gap-1.5 text-[12px] font-mono text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            >
                              {reservation.confirmationNumber}
                              <Copy className={`w-3 h-3 ${copiedId === reservation.id ? 'text-green-500' : 'text-gray-400'}`} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        {reservation.status === 'not_booked' && (
                          <button className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                            <Plus className="w-3 h-3" />
                            Book now
                          </button>
                        )}
                        {reservation.bookingUrl && (
                          <a
                            href={reservation.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View
                          </a>
                        )}
                        <button
                          onClick={() => {
                            // Add to calendar functionality would go here
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          <Calendar className="w-3 h-3" />
                          Calendar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
