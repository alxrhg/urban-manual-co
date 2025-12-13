/**
 * Flight Utilities
 * Schema and utility functions for flight segment calculations
 */

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Strict typing for terminal information
 */
export interface Terminal {
  /** Terminal identifier (e.g., "1", "2A", "International") */
  name: string;
  /** Full terminal name if available */
  fullName?: string;
}

/**
 * Strict typing for gate information
 */
export interface Gate {
  /** Gate identifier (e.g., "A12", "B45") */
  number: string;
  /** Gate area/concourse */
  concourse?: string;
}

/**
 * Boarding time information
 */
export interface BoardingTime {
  /** ISO datetime string for boarding start */
  time: string;
  /** Minutes before departure */
  minutesBeforeDeparture: number;
  /** Group/zone number if applicable */
  boardingGroup?: string;
}

/**
 * Airport information for a flight segment
 */
export interface AirportInfo {
  /** IATA airport code (e.g., "JFK", "CDG") */
  code: string;
  /** City name */
  city: string;
  /** Full airport name */
  name?: string;
  /** Terminal information */
  terminal?: Terminal;
  /** Gate information */
  gate?: Gate;
  /** Timezone identifier (e.g., "America/New_York") */
  timezone?: string;
}

/**
 * A single flight segment with strict typing
 */
export interface FlightSegment {
  /** Unique identifier */
  id: string;
  /** Airline information */
  airline: {
    /** IATA airline code (e.g., "UA", "AA") */
    code: string;
    /** Full airline name */
    name: string;
  };
  /** Flight number (e.g., "1610") */
  flightNumber: string;
  /** Aircraft type if known (e.g., "Boeing 777-300ER") */
  aircraftType?: string;
  /** Departure information */
  departure: {
    airport: AirportInfo;
    /** ISO datetime string */
    scheduledTime: string;
    /** Actual time if available */
    actualTime?: string;
    /** Boarding time information */
    boardingTime?: BoardingTime;
  };
  /** Arrival information */
  arrival: {
    airport: AirportInfo;
    /** ISO datetime string */
    scheduledTime: string;
    /** Actual time if available */
    actualTime?: string;
    /** Baggage claim area */
    baggageClaim?: string;
  };
  /** Seat information */
  seat?: {
    number: string;
    class: 'economy' | 'premium_economy' | 'business' | 'first';
    isWindow?: boolean;
    isAisle?: boolean;
  };
  /** Booking/confirmation details */
  confirmation?: {
    number: string;
    url?: string;
  };
  /** Status of the flight */
  status?: 'scheduled' | 'boarding' | 'departed' | 'in_air' | 'landed' | 'arrived' | 'delayed' | 'cancelled';
}

/**
 * Duration breakdown for flights
 */
export interface FlightDuration {
  /** Total minutes */
  totalMinutes: number;
  /** Hours component */
  hours: number;
  /** Minutes component */
  minutes: number;
  /** Human-readable string (e.g., "2h 30m") */
  formatted: string;
}

/**
 * Layover information between segments
 */
export interface LayoverInfo {
  /** Airport where layover occurs */
  airport: AirportInfo;
  /** Duration of layover */
  duration: FlightDuration;
  /** Whether terminal change is required */
  terminalChange: boolean;
  /** From terminal */
  fromTerminal?: Terminal;
  /** To terminal */
  toTerminal?: Terminal;
  /** Whether this is a short connection (< 90 min) */
  isShortConnection: boolean;
  /** Whether this is a long layover (> 4 hours) */
  isLongLayover: boolean;
  /** Suggestions for the layover */
  suggestions?: string[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate the duration of a flight segment
 * @param segment - The flight segment
 * @returns Duration breakdown
 */
export function calculateDuration(segment: FlightSegment): FlightDuration {
  const departure = new Date(segment.departure.scheduledTime);
  const arrival = new Date(segment.arrival.scheduledTime);

  const diffMs = arrival.getTime() - departure.getTime();
  const totalMinutes = Math.round(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    formatted: formatDuration(hours, minutes),
  };
}

/**
 * Calculate duration from departure and arrival times
 * @param departureTime - ISO datetime string for departure
 * @param arrivalTime - ISO datetime string for arrival
 * @returns Duration breakdown
 */
export function calculateDurationFromTimes(
  departureTime: string,
  arrivalTime: string
): FlightDuration {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);

  const diffMs = arrival.getTime() - departure.getTime();
  const totalMinutes = Math.round(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    formatted: formatDuration(hours, minutes),
  };
}

/**
 * Check if a flight is overnight (crosses midnight)
 * @param segment - The flight segment
 * @returns true if the flight is overnight
 */
export function isOvernight(segment: FlightSegment): boolean {
  const departure = new Date(segment.departure.scheduledTime);
  const arrival = new Date(segment.arrival.scheduledTime);

  // Check if dates are different
  return (
    departure.getUTCDate() !== arrival.getUTCDate() ||
    departure.getUTCMonth() !== arrival.getUTCMonth() ||
    departure.getUTCFullYear() !== arrival.getUTCFullYear()
  );
}

/**
 * Check if flight crosses midnight using departure/arrival times
 * @param departureTime - ISO datetime string for departure
 * @param arrivalTime - ISO datetime string for arrival
 * @returns true if the flight is overnight
 */
export function isOvernightFromTimes(
  departureTime: string,
  arrivalTime: string
): boolean {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);

  return (
    departure.getUTCDate() !== arrival.getUTCDate() ||
    departure.getUTCMonth() !== arrival.getUTCMonth() ||
    departure.getUTCFullYear() !== arrival.getUTCFullYear()
  );
}

/**
 * Calculate layover time between two flight segments
 * @param firstSegment - The first flight segment (arriving)
 * @param secondSegment - The second flight segment (departing)
 * @returns Layover information or null if segments don't connect
 */
export function getLayoverTime(
  firstSegment: FlightSegment,
  secondSegment: FlightSegment
): LayoverInfo | null {
  const firstArrival = new Date(firstSegment.arrival.scheduledTime);
  const secondDeparture = new Date(secondSegment.departure.scheduledTime);

  // Verify the segments connect at the same airport
  if (firstSegment.arrival.airport.code !== secondSegment.departure.airport.code) {
    return null;
  }

  const diffMs = secondDeparture.getTime() - firstArrival.getTime();

  // Negative layover means invalid connection
  if (diffMs < 0) {
    return null;
  }

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const fromTerminal = firstSegment.arrival.airport.terminal;
  const toTerminal = secondSegment.departure.airport.terminal;
  const terminalChange = !!(
    fromTerminal &&
    toTerminal &&
    fromTerminal.name !== toTerminal.name
  );

  const isShortConnection = totalMinutes < 90;
  const isLongLayover = totalMinutes > 240; // 4 hours

  const suggestions: string[] = [];

  if (isShortConnection) {
    suggestions.push('Tight connection - proceed directly to gate');
    if (terminalChange) {
      suggestions.push('Terminal change required - check for shuttle/train');
    }
  } else if (isLongLayover) {
    suggestions.push('Long layover - consider airport lounge access');
    suggestions.push('Check if luggage can be stored');
    if (totalMinutes > 360) { // 6+ hours
      suggestions.push('May want to explore the city if visa permits');
    }
  } else {
    suggestions.push('Comfortable connection time');
    if (terminalChange) {
      suggestions.push(`Change from Terminal ${fromTerminal?.name} to Terminal ${toTerminal?.name}`);
    }
  }

  return {
    airport: firstSegment.arrival.airport,
    duration: {
      totalMinutes,
      hours,
      minutes,
      formatted: formatDuration(hours, minutes),
    },
    terminalChange,
    fromTerminal,
    toTerminal,
    isShortConnection,
    isLongLayover,
    suggestions,
  };
}

/**
 * Calculate layover from arrival and departure times at the same airport
 * @param arrivalTime - ISO datetime string for first flight arrival
 * @param departureTime - ISO datetime string for connecting flight departure
 * @returns Duration breakdown of layover
 */
export function getLayoverDuration(
  arrivalTime: string,
  departureTime: string
): FlightDuration {
  const arrival = new Date(arrivalTime);
  const departure = new Date(departureTime);

  const diffMs = departure.getTime() - arrival.getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    formatted: formatDuration(hours, minutes),
  };
}

/**
 * Get the total duration of a multi-segment flight
 * @param segments - Array of flight segments in order
 * @returns Total duration including layovers
 */
export function getTotalFlightDuration(segments: FlightSegment[]): FlightDuration {
  if (segments.length === 0) {
    return { totalMinutes: 0, hours: 0, minutes: 0, formatted: '0m' };
  }

  const firstDeparture = new Date(segments[0].departure.scheduledTime);
  const lastArrival = new Date(segments[segments.length - 1].arrival.scheduledTime);

  const diffMs = lastArrival.getTime() - firstDeparture.getTime();
  const totalMinutes = Math.round(diffMs / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return {
    totalMinutes,
    hours,
    minutes,
    formatted: formatDuration(hours, minutes),
  };
}

/**
 * Parse time until boarding from a flight segment
 * @param segment - The flight segment
 * @param now - Current time (defaults to now)
 * @returns Minutes until boarding, or null if already past
 */
export function getTimeUntilBoarding(
  segment: FlightSegment,
  now: Date = new Date()
): number | null {
  const boardingTime = segment.departure.boardingTime?.time;
  if (!boardingTime) {
    // Default to 45 minutes before departure
    const departure = new Date(segment.departure.scheduledTime);
    const defaultBoardingTime = new Date(departure.getTime() - 45 * 60 * 1000);
    const diffMs = defaultBoardingTime.getTime() - now.getTime();
    return diffMs > 0 ? Math.round(diffMs / (1000 * 60)) : null;
  }

  const boarding = new Date(boardingTime);
  const diffMs = boarding.getTime() - now.getTime();

  return diffMs > 0 ? Math.round(diffMs / (1000 * 60)) : null;
}

/**
 * Format departure/arrival for display
 * @param segment - The flight segment
 * @returns Formatted strings for departure and arrival
 */
export function formatFlightTimes(segment: FlightSegment): {
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
  isNextDay: boolean;
} {
  const departure = new Date(segment.departure.scheduledTime);
  const arrival = new Date(segment.arrival.scheduledTime);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isNextDay = isOvernight(segment);

  return {
    departureTime: formatTime(departure),
    departureDate: formatDate(departure),
    arrivalTime: formatTime(arrival),
    arrivalDate: formatDate(arrival),
    isNextDay,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format duration as human-readable string
 */
function formatDuration(hours: number, minutes: number): string {
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Create a FlightSegment ID
 */
export function createFlightSegmentId(): string {
  return `flight_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Check if a layover is at a minimum connection time
 * (Typically 60-90 minutes for domestic, 90-120 for international)
 */
export function isMCTViolation(
  layoverMinutes: number,
  isDomestic: boolean,
  hasTerminalChange: boolean
): boolean {
  const baseMCT = isDomestic ? 60 : 90;
  const terminalBuffer = hasTerminalChange ? 30 : 0;
  const requiredMCT = baseMCT + terminalBuffer;

  return layoverMinutes < requiredMCT;
}

/**
 * Get suggested arrival time at airport based on flight type
 * @param isInternational - Whether the flight is international
 * @param hasTSAPrecheck - Whether passenger has TSA PreCheck
 * @returns Minutes before departure to arrive
 */
export function getSuggestedArrivalTime(
  isInternational: boolean,
  hasTSAPrecheck: boolean = false
): number {
  if (isInternational) {
    return hasTSAPrecheck ? 150 : 180; // 2.5h or 3h
  }
  return hasTSAPrecheck ? 75 : 120; // 1.25h or 2h
}
