'use client';

import { useState, useMemo } from 'react';
import { useDrawerStore } from '@/lib/stores/drawer-store';
import {
  Plane,
  Loader2,
  Calendar,
  Clock,
  Search,
  X,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft
} from 'lucide-react';
import FlightRouteCard from '@/components/trips/FlightRouteCard';

interface AddFlightDrawerProps {
  tripId?: string;
  dayNumber?: number;
  defaultDate?: string;
  onAdd?: (flightData: FlightData) => void;
}

export interface FlightData {
  type: 'flight';
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  confirmationNumber?: string;
  seat?: string;
  seatClass?: string;
  notes?: string;
}

type ViewMode = 'search' | 'manual' | 'details';

// Mock flight search result
interface FlightSearchResult {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureCode: string;
  arrivalCode: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
}

export default function AddFlightDrawer({
  tripId,
  dayNumber,
  defaultDate,
  onAdd,
}: AddFlightDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searching, setSearching] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [airlineCode, setAirlineCode] = useState('');
  const [flightNum, setFlightNum] = useState('');
  const [searchDate, setSearchDate] = useState(defaultDate || '');
  const [searchResults, setSearchResults] = useState<FlightSearchResult[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<FlightSearchResult | null>(null);

  // Form state (for manual entry or editing)
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [seat, setSeat] = useState('');
  const [seatClass, setSeatClass] = useState('');
  const [notes, setNotes] = useState('');

  // Search handler (mock implementation)
  const handleSearch = async () => {
    if (!airlineCode && !flightNum) return;

    setSearching(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock result based on search
    if (airlineCode || flightNum) {
      setSearchResults([
        {
          airline: airlineCode === 'UA' ? 'United Airlines' : `${airlineCode} Airlines`,
          airlineCode: airlineCode.toUpperCase() || 'UA',
          flightNumber: flightNum || '1610',
          departureCode: 'EWR',
          arrivalCode: 'MIA',
          departureTime: '8:20 AM',
          arrivalTime: '11:36 AM',
          date: searchDate || new Date().toISOString().split('T')[0],
        }
      ]);
    }
    setSearching(false);
  };

  // Select a flight from search results
  const handleSelectFlight = (flight: FlightSearchResult) => {
    setSelectedFlight(flight);
    setAirline(flight.airline);
    setFlightNumber(`${flight.airlineCode}${flight.flightNumber}`);
    setFrom(flight.departureCode);
    setTo(flight.arrivalCode);
    setDepartureDate(flight.date);
    // Parse time strings
    const depTime = parseTimeString(flight.departureTime);
    const arrTime = parseTimeString(flight.arrivalTime);
    setDepartureTime(depTime);
    setArrivalTime(arrTime);
    setArrivalDate(flight.date); // Same day by default
    setViewMode('details');
  };

  // Parse "8:20 AM" to "08:20"
  const parseTimeString = (timeStr: string): string => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '';
    let hours = parseInt(match[1]);
    const minutes = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  };

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (!airline.trim() || !from.trim() || !to.trim()) return;

    setSaving(true);
    try {
      const flightData: FlightData = {
        type: 'flight',
        airline: airline.trim(),
        flightNumber: flightNumber.trim(),
        from: from.trim(),
        to: to.trim(),
        departureDate,
        departureTime,
        arrivalDate,
        arrivalTime,
        confirmationNumber: confirmationNumber.trim() || undefined,
        seat: seat.trim() || undefined,
        seatClass: seatClass.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (onAdd) {
        onAdd(flightData);
      }
      closeDrawer();
    } catch (err) {
      console.error('Error adding flight:', err);
    } finally {
      setSaving(false);
    }
  };

  const isValid = airline.trim() && from.trim() && to.trim();

  // Render Search View
  if (viewMode === 'search') {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <button
            onClick={closeDrawer}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <h2 className="text-lg font-semibold text-white">Search Flight</h2>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Search Input */}
        <div className="px-4 py-4">
          {!airlineCode && !flightNum ? (
            /* Single Search Input */
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Parse airline code and number
                  const match = e.target.value.match(/^([A-Za-z]{2})\s*(\d+)?$/);
                  if (match) {
                    setAirlineCode(match[1].toUpperCase());
                    setFlightNum(match[2] || '');
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600 placeholder-gray-500"
                placeholder="Airport, Airline or Flight Number (e.g AA107)"
              />
            </div>
          ) : (
            /* Split Search Inputs */
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={airlineCode}
                  onChange={(e) => setAirlineCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-8 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
                  placeholder="UA"
                />
                {airlineCode && (
                  <button
                    onClick={() => setAirlineCode('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-gray-300" />
                  </button>
                )}
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">#</span>
                <input
                  type="text"
                  value={flightNum}
                  onChange={(e) => setFlightNum(e.target.value)}
                  className="w-full pl-7 pr-8 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
                  placeholder="1610"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                {flightNum && (
                  <button
                    onClick={() => setFlightNum('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-gray-300" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Date Picker */}
          {(airlineCode || flightNum) && (
            <div className="mt-3 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                  handleSearch();
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Search Results or Empty State */}
        <div className="flex-1 overflow-y-auto px-4">
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((flight, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFlight(flight)}
                  className="w-full p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{flight.airline}</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(flight.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      <span className="text-white font-medium">{flight.departureCode}</span>
                      <span className="text-orange-500 font-medium">{flight.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-gray-500" />
                      <span className="text-white font-medium">{flight.arrivalCode}</span>
                      <span className="text-orange-500 font-medium">{flight.arrivalTime}</span>
                    </div>
                    <span className="ml-auto text-gray-400 text-sm">
                      {flight.airlineCode}{flight.flightNumber}
                    </span>
                  </div>
                </button>
              ))}

              {/* Enter Manually Link */}
              <div className="flex items-center justify-between py-3 border-t border-gray-800 mt-4">
                <span className="text-gray-400 text-sm">Unable to find what you want?</span>
                <button
                  onClick={() => setViewMode('manual')}
                  className="text-orange-500 font-medium text-sm hover:text-orange-400"
                >
                  Enter manually
                </button>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-400" />
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Plane className="w-6 h-6 text-blue-400" />
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Search Flight</h3>
              <p className="text-gray-400 text-sm max-w-xs mb-6">
                Search by Airport, Airline, or Flight Number. If it's not a commercial flight, add it manually.
              </p>
              <button
                onClick={() => setViewMode('manual')}
                className="text-orange-500 font-medium hover:text-orange-400"
              >
                Enter manually
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Details View (after selecting a flight)
  if (viewMode === 'details' && selectedFlight) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <button
            onClick={() => setViewMode('search')}
            className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white">Flight Route</h2>
          <button
            onClick={handleSubmit}
            disabled={saving || !isValid}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-orange-500 rounded-full hover:bg-orange-400 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>

        {/* Flight Card */}
        <div className="flex-1 overflow-y-auto">
          <FlightRouteCard
            flightNumber={flightNumber}
            airline={airline}
            departureCode={from}
            arrivalCode={to}
            departureTime={formatTimeDisplay(departureTime)}
            arrivalTime={formatTimeDisplay(arrivalTime)}
            departureDate={departureDate}
            arrivalDate={arrivalDate}
            reservationCode={confirmationNumber}
            seat={seat}
            seatClass={seatClass}
          />

          {/* Additional Fields */}
          <div className="px-4 py-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Reservation Code</label>
              <input
                type="text"
                value={confirmationNumber}
                onChange={(e) => setConfirmationNumber(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
                placeholder="ABC123"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Seat</label>
                <input
                  type="text"
                  value={seat}
                  onChange={(e) => setSeat(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
                  placeholder="3B"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Seat Class</label>
                <input
                  type="text"
                  value={seatClass}
                  onChange={(e) => setSeatClass(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
                  placeholder="Economy Premium"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Manual Entry View
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <button
          onClick={() => setViewMode('search')}
          className="p-2 text-white hover:bg-gray-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">Add Flight</h2>
        <button
          onClick={handleSubmit}
          disabled={saving || !isValid}
          className="px-4 py-2 text-sm font-medium text-gray-900 bg-orange-500 rounded-full hover:bg-orange-400 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Plane className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        {/* Airline & Flight Number */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Airline *</label>
            <input
              type="text"
              value={airline}
              onChange={(e) => setAirline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
              placeholder="e.g. United"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Flight #</label>
            <input
              type="text"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
              placeholder="e.g. UA123"
            />
          </div>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">From *</label>
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
              placeholder="e.g. JFK"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">To *</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
              placeholder="e.g. LAX"
            />
          </div>
        </div>

        {/* Departure */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Departure</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
            />
            <input
              type="time"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        {/* Arrival */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Arrival</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
            />
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
            />
          </div>
        </div>

        {/* Confirmation Number */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Confirmation #</label>
          <input
            type="text"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600"
            placeholder="Optional"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-gray-600 resize-none"
            placeholder="Seat, luggage, etc."
          />
        </div>
      </div>
    </div>
  );
}
