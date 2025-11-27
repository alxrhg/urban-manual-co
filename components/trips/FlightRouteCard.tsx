'use client';

import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock, FileText, Edit3, Paperclip } from 'lucide-react';

// Airport code to full name mapping (common airports)
const AIRPORT_NAMES: Record<string, string> = {
  'EWR': 'Newark Liberty International',
  'JFK': 'John F. Kennedy International',
  'LGA': 'LaGuardia',
  'LAX': 'Los Angeles International',
  'SFO': 'San Francisco International',
  'ORD': "O'Hare International",
  'MIA': 'Miami International',
  'BOS': 'Boston Logan International',
  'DFW': 'Dallas Fort Worth International',
  'ATL': 'Hartsfield-Jackson Atlanta',
  'SEA': 'Seattle-Tacoma International',
  'DEN': 'Denver International',
  'PHX': 'Phoenix Sky Harbor',
  'LAS': 'Harry Reid International',
  'MCO': 'Orlando International',
  'CLT': 'Charlotte Douglas International',
  'MSP': 'Minneapolis-Saint Paul',
  'DTW': 'Detroit Metropolitan',
  'PHL': 'Philadelphia International',
  'IAH': 'George Bush Intercontinental',
  'NRT': 'Narita International',
  'HND': 'Haneda',
  'ICN': 'Incheon International',
  'TPE': 'Taiwan Taoyuan International',
  'HKG': 'Hong Kong International',
  'SIN': 'Singapore Changi',
  'BKK': 'Suvarnabhumi',
  'CDG': 'Charles de Gaulle',
  'LHR': 'Heathrow',
  'AMS': 'Schiphol',
  'FRA': 'Frankfurt am Main',
  'FCO': 'Fiumicino',
  'BCN': 'Barcelona-El Prat',
  'MAD': 'Adolfo Suárez Madrid-Barajas',
  'MUC': 'Munich',
  'ZRH': 'Zürich',
  'VIE': 'Vienna International',
  'DXB': 'Dubai International',
  'SYD': 'Sydney Kingsford Smith',
  'MEL': 'Melbourne',
  'YYZ': 'Toronto Pearson International',
  'YVR': 'Vancouver International',
};

interface FlightRouteCardProps {
  flightNumber: string;
  airline: string;
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  arrivalTime: string;
  departureDate?: string;
  arrivalDate?: string;
  terminal?: string;
  gate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  duration?: string;
  reservationCode?: string;
  seat?: string;
  seatClass?: string;
  onWriteNote?: () => void;
  onAddFile?: () => void;
  className?: string;
}

export default function FlightRouteCard({
  flightNumber,
  airline,
  departureCode,
  arrivalCode,
  departureTime,
  arrivalTime,
  departureDate,
  arrivalDate,
  terminal,
  gate,
  arrivalTerminal,
  arrivalGate,
  duration,
  reservationCode,
  seat,
  seatClass,
  onWriteNote,
  onAddFile,
  className = '',
}: FlightRouteCardProps) {
  // Calculate duration if not provided
  const calculatedDuration = useMemo(() => {
    if (duration) return duration;

    if (departureTime && arrivalTime) {
      const [depHour, depMin] = departureTime.split(':').map(Number);
      const [arrHour, arrMin] = arrivalTime.split(':').map(Number);

      let totalDepMinutes = depHour * 60 + depMin;
      let totalArrMinutes = arrHour * 60 + arrMin;

      // If arrival is earlier (crossed midnight), add 24 hours
      if (totalArrMinutes < totalDepMinutes) {
        totalArrMinutes += 24 * 60;
      }

      const diffMinutes = totalArrMinutes - totalDepMinutes;
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      return `${hours}h ${minutes}m`;
    }

    return null;
  }, [duration, departureTime, arrivalTime]);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const departureDateFormatted = formatDate(departureDate);
  const arrivalDateFormatted = formatDate(arrivalDate);

  return (
    <div className={`bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
      {/* Flight Info Header */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="text-lg font-semibold text-white">{flightNumber}</div>
        <div className="text-sm text-gray-400">{airline}</div>
      </div>

      {/* Flight Route Card */}
      <div className="mx-4 my-4 bg-gray-800 rounded-xl overflow-hidden">
        {/* Departure */}
        <div className="flex items-start gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1">
            <ArrowUpRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold text-white">{departureCode}</div>
              <div className="text-xl font-bold text-orange-500">{departureTime}</div>
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              {AIRPORT_NAMES[departureCode] || `${departureCode} Airport`}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>Terminal {terminal || '–'}</span>
              <span>·</span>
              <span>Gate {gate || '–'}</span>
              {departureDateFormatted && (
                <>
                  <span className="ml-auto text-gray-400">{departureDateFormatted}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Divider with Dashed Line */}
        <div className="relative px-4">
          <div className="border-t border-dashed border-gray-700" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-gray-900 rounded-r-full" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-gray-900 rounded-l-full" />
        </div>

        {/* Arrival */}
        <div className="flex items-start gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1">
            <ArrowDownRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <div className="text-xl font-bold text-white">{arrivalCode}</div>
              <div className="text-xl font-bold text-orange-500">{arrivalTime}</div>
            </div>
            <div className="text-sm text-gray-400 mt-0.5">
              {AIRPORT_NAMES[arrivalCode] || `${arrivalCode} Airport`}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>Terminal {arrivalTerminal || '–'}</span>
              <span>·</span>
              <span>Gate {arrivalGate || '–'}</span>
              {arrivalDateFormatted && (
                <>
                  <span className="ml-auto text-gray-400">{arrivalDateFormatted}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flight Duration */}
      {calculatedDuration && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-gray-400">Flight Duration</span>
          <span className="text-white font-medium">{calculatedDuration}</span>
        </div>
      )}

      {/* Booking Details */}
      <div className="px-4 py-3 space-y-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Reservation Code</span>
          <span className={reservationCode ? 'text-white font-medium' : 'text-gray-600'}>
            {reservationCode || 'Not set'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Seat</span>
          <span className={seat ? 'text-white font-medium' : 'text-gray-600'}>
            {seat || 'Not set'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Seat Class</span>
          <span className={seatClass ? 'text-white font-medium' : 'text-gray-600'}>
            {seatClass || 'Not set'}
          </span>
        </div>
      </div>

      {/* Action Items */}
      <div className="px-4 py-2">
        <button
          onClick={onWriteNote}
          className="flex items-center gap-3 w-full py-3 text-gray-400 hover:text-white transition-colors"
        >
          <Edit3 className="w-5 h-5" />
          <span>Write a note</span>
        </button>
        <button
          onClick={onAddFile}
          className="flex items-center gap-3 w-full py-3 text-gray-400 hover:text-white transition-colors"
        >
          <Paperclip className="w-5 h-5" />
          <span>Add File, Photo or Link</span>
        </button>
      </div>
    </div>
  );
}
