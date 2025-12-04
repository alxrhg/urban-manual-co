/**
 * API Route: Look up flight details by flight number and date
 * POST /api/flight-lookup
 *
 * Request body:
 * - flightNumber: string (e.g., "UA123", "DL456")
 * - date: string (YYYY-MM-DD format)
 *
 * Uses AeroAPI (FlightAware) for flight data
 * Requires AERO_API_KEY environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';

// Common airline code to name mapping
const AIRLINE_NAMES: Record<string, string> = {
  // US Airlines
  AA: 'American Airlines',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  WN: 'Southwest Airlines',
  AS: 'Alaska Airlines',
  B6: 'JetBlue Airways',
  NK: 'Spirit Airlines',
  F9: 'Frontier Airlines',
  HA: 'Hawaiian Airlines',
  G4: 'Allegiant Air',
  // European Airlines
  BA: 'British Airways',
  AF: 'Air France',
  LH: 'Lufthansa',
  KL: 'KLM',
  IB: 'Iberia',
  AZ: 'ITA Airways',
  SK: 'SAS Scandinavian',
  AY: 'Finnair',
  LX: 'Swiss',
  OS: 'Austrian Airlines',
  EI: 'Aer Lingus',
  TP: 'TAP Air Portugal',
  EW: 'Eurowings',
  U2: 'easyJet',
  FR: 'Ryanair',
  VY: 'Vueling',
  // Asian Airlines
  JL: 'Japan Airlines',
  NH: 'All Nippon Airways',
  CX: 'Cathay Pacific',
  SQ: 'Singapore Airlines',
  TG: 'Thai Airways',
  KE: 'Korean Air',
  OZ: 'Asiana Airlines',
  CI: 'China Airlines',
  BR: 'EVA Air',
  MH: 'Malaysia Airlines',
  GA: 'Garuda Indonesia',
  PR: 'Philippine Airlines',
  VN: 'Vietnam Airlines',
  AI: 'Air India',
  // Middle East Airlines
  EK: 'Emirates',
  QR: 'Qatar Airways',
  EY: 'Etihad Airways',
  TK: 'Turkish Airlines',
  SV: 'Saudia',
  GF: 'Gulf Air',
  // Australian/Pacific Airlines
  QF: 'Qantas',
  NZ: 'Air New Zealand',
  VA: 'Virgin Australia',
  FJ: 'Fiji Airways',
  // Canadian Airlines
  AC: 'Air Canada',
  WS: 'WestJet',
  // Latin American Airlines
  LA: 'LATAM Airlines',
  AM: 'Aeromexico',
  AV: 'Avianca',
  CM: 'Copa Airlines',
  AR: 'Aerolineas Argentinas',
  G3: 'GOL',
  // African Airlines
  ET: 'Ethiopian Airlines',
  SA: 'South African Airways',
  MS: 'EgyptAir',
  AT: 'Royal Air Maroc',
  KQ: 'Kenya Airways',
};

interface FlightLookupRequest {
  flightNumber: string;
  date: string;
}

interface FlightLookupResponse {
  success: boolean;
  data?: {
    airline: string;
    airlineCode: string;
    flightNumber: string;
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
    terminal?: string;
    gate?: string;
    aircraft?: string;
    status?: string;
  };
  error?: string;
}

/**
 * Parse flight number into carrier code and number
 * Examples: "UA123" → { carrier: "UA", number: "123" }
 *           "UAL123" → { carrier: "UAL", number: "123" }
 */
function parseFlightNumber(input: string): { carrier: string; number: string } | null {
  const cleaned = input.toUpperCase().replace(/\s+/g, '');

  // Match 2-3 letter carrier code followed by 1-4 digit flight number
  const match = cleaned.match(/^([A-Z]{2,3})(\d{1,4})$/);

  if (!match) return null;

  return {
    carrier: match[1],
    number: match[2],
  };
}

/**
 * Convert AeroAPI airport code to readable format
 */
function formatAirport(code: string, name?: string): string {
  if (name) {
    return `${code} - ${name}`;
  }
  return code;
}

/**
 * Format time from ISO string to HH:MM format
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5);
  } catch {
    return '';
  }
}

/**
 * Format date from ISO string to YYYY-MM-DD format
 */
function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: FlightLookupRequest = await request.json();
  const { flightNumber, date } = body;

  // Validate input
  if (!flightNumber || !date) {
    return NextResponse.json<FlightLookupResponse>(
      { success: false, error: 'Flight number and date are required' },
      { status: 400 }
    );
  }

  // Parse flight number
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) {
    return NextResponse.json<FlightLookupResponse>(
      { success: false, error: 'Invalid flight number format. Use format like UA123 or DL456' },
      { status: 400 }
    );
  }

  // Check for API key
  const apiKey = process.env.AERO_API_KEY;
  if (!apiKey) {
    return NextResponse.json<FlightLookupResponse>(
      {
        success: false,
        error: 'Flight lookup is not configured. Add AERO_API_KEY to environment variables.'
      },
      { status: 503 }
    );
  }

  try {
    // AeroAPI endpoint for flight info
    // Format: /flights/{ident}?start={date}&end={date+1}
    const startDate = date;
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];

    const ident = `${parsed.carrier}${parsed.number}`;
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/${ident}?start=${startDate}&end=${endDateStr}`;

    const response = await fetch(url, {
      headers: {
        'x-apikey': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json<FlightLookupResponse>(
          { success: false, error: 'Flight not found for the specified date' },
          { status: 404 }
        );
      }
      throw new Error(`AeroAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Find the flight for the requested date
    const flights = data.flights || [];
    const flight = flights.find((f: any) => {
      const depDate = formatDate(f.scheduled_out || f.actual_out);
      return depDate === date;
    }) || flights[0];

    if (!flight) {
      return NextResponse.json<FlightLookupResponse>(
        { success: false, error: 'Flight not found for the specified date' },
        { status: 404 }
      );
    }

    // Get airline name
    const airlineName = AIRLINE_NAMES[parsed.carrier] || flight.operator || parsed.carrier;

    // Build response
    const flightData = {
      airline: airlineName,
      airlineCode: parsed.carrier,
      flightNumber: parsed.number,
      from: formatAirport(
        flight.origin?.code_iata || flight.origin?.code || '',
        flight.origin?.city
      ),
      fromCode: flight.origin?.code_iata || flight.origin?.code || '',
      to: formatAirport(
        flight.destination?.code_iata || flight.destination?.code || '',
        flight.destination?.city
      ),
      toCode: flight.destination?.code_iata || flight.destination?.code || '',
      departureDate: formatDate(flight.scheduled_out || flight.actual_out),
      departureTime: formatTime(flight.scheduled_out || flight.actual_out),
      arrivalDate: formatDate(flight.scheduled_in || flight.actual_in),
      arrivalTime: formatTime(flight.scheduled_in || flight.actual_in),
      terminal: flight.terminal_origin || undefined,
      gate: flight.gate_origin || undefined,
      aircraft: flight.aircraft_type || undefined,
      status: flight.status || undefined,
    };

    return NextResponse.json<FlightLookupResponse>({
      success: true,
      data: flightData,
    });
  } catch (error: any) {
    console.error('Error looking up flight:', error);
    return NextResponse.json<FlightLookupResponse>(
      { success: false, error: 'Failed to look up flight details' },
      { status: 500 }
    );
  }
});
