/**
 * Flight Status API - Real-time flight tracking via FlightAware AeroAPI
 *
 * Returns flight status including terminal, gate, delays, and actual times.
 * Falls back gracefully when API key is not configured or flight not found.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError, CustomError, ErrorCode } from '@/lib/errors';

const FLIGHTAWARE_API_KEY = process.env.FLIGHTAWARE_API_KEY;
const FLIGHTAWARE_BASE_URL = 'https://aeroapi.flightaware.com/aeroapi';

interface FlightAwareFlightInfo {
  ident: string;
  ident_iata: string;
  fa_flight_id: string;
  operator: string;
  operator_iata: string;
  flight_number: string;
  origin: {
    code: string;
    code_iata: string;
    city: string;
    timezone: string;
  };
  destination: {
    code: string;
    code_iata: string;
    city: string;
    timezone: string;
  };
  scheduled_out: string;
  estimated_out: string;
  actual_out: string | null;
  scheduled_off: string;
  estimated_off: string;
  actual_off: string | null;
  scheduled_on: string;
  estimated_on: string;
  actual_on: string | null;
  scheduled_in: string;
  estimated_in: string;
  actual_in: string | null;
  departure_delay: number | null;
  arrival_delay: number | null;
  status: string;
  gate_origin: string | null;
  gate_destination: string | null;
  terminal_origin: string | null;
  terminal_destination: string | null;
  baggage_claim: string | null;
}

interface FlightAwareResponse {
  flights: FlightAwareFlightInfo[];
}

type FlightStatus = 'scheduled' | 'boarding' | 'departed' | 'in_flight' | 'landed' | 'delayed' | 'cancelled' | 'unknown';

interface FlightStatusResponse {
  status: FlightStatus;
  statusText: string;
  actualDeparture?: string;
  actualArrival?: string;
  delay?: number;
  gate?: string;
  terminal?: string;
  terminalDestination?: string;
  gateDestination?: string;
  baggageClaim?: string;
  originCity?: string;
  destinationCity?: string;
}

/**
 * Map FlightAware status to our status type
 */
function mapFlightStatus(faStatus: string, departureDelay: number | null): { status: FlightStatus; statusText: string } {
  const normalizedStatus = faStatus?.toLowerCase() || '';

  // Check for delays first
  if (departureDelay && departureDelay > 15) {
    return { status: 'delayed', statusText: `Delayed ${departureDelay}m` };
  }

  switch (normalizedStatus) {
    case 'scheduled':
      return { status: 'scheduled', statusText: 'On Time' };
    case 'filed':
      return { status: 'scheduled', statusText: 'Filed' };
    case 'active':
    case 'en route':
      return { status: 'in_flight', statusText: 'In Flight' };
    case 'landed':
    case 'arrived':
      return { status: 'landed', statusText: 'Landed' };
    case 'cancelled':
      return { status: 'cancelled', statusText: 'Cancelled' };
    case 'diverted':
      return { status: 'delayed', statusText: 'Diverted' };
    default:
      return { status: 'unknown', statusText: faStatus || 'Unknown' };
  }
}

/**
 * Extract time from ISO timestamp
 */
function extractTime(isoString: string | null): string | undefined {
  if (!isoString) return undefined;
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return undefined;
  }
}

/**
 * Build FlightAware flight identifier
 * FlightAware expects format like "UAL123" or IATA format "UA123"
 */
function buildFlightIdent(airline: string, flightNumber: string): string {
  // Remove any spaces and normalize
  const cleanAirline = airline.trim().toUpperCase();
  const cleanNumber = flightNumber.trim().replace(/\D/g, '');

  // If airline is already 2-3 letter code, use it directly
  if (cleanAirline.length <= 3) {
    return `${cleanAirline}${cleanNumber}`;
  }

  // Otherwise, just concatenate (FlightAware will try to resolve)
  return `${cleanAirline}${cleanNumber}`;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = await request.json();
  const { airline, flightNumber, date } = body;

  // Validate required fields
  if (!airline || !flightNumber) {
    throw createValidationError('Airline and flight number are required');
  }

  // If no API key configured, return graceful fallback
  if (!FLIGHTAWARE_API_KEY) {
    console.log('[FlightStatus] No FLIGHTAWARE_API_KEY configured, returning default status');
    return NextResponse.json({
      status: 'scheduled',
      statusText: 'On Time',
      message: 'Flight tracking not configured',
    });
  }

  try {
    const flightIdent = buildFlightIdent(airline, flightNumber);

    // Build the API URL
    // Format: /flights/{ident}?start=YYYY-MM-DD&end=YYYY-MM-DD
    let url = `${FLIGHTAWARE_BASE_URL}/flights/${flightIdent}`;

    if (date) {
      // If date provided, search for flights on that specific date
      const searchDate = new Date(date);
      const startDate = searchDate.toISOString().split('T')[0];

      // Search for flights in a 2-day window
      const endDate = new Date(searchDate);
      endDate.setDate(endDate.getDate() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      url += `?start=${startDate}&end=${endDateStr}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apikey': FLIGHTAWARE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Flight not found - return default
        return NextResponse.json({
          status: 'scheduled',
          statusText: 'On Time',
          message: 'Flight not found in tracking system',
        });
      }

      if (response.status === 401 || response.status === 403) {
        console.error('[FlightStatus] FlightAware API authentication failed');
        throw new CustomError(
          ErrorCode.EXTERNAL_API_ERROR,
          'Flight tracking service authentication failed',
          503
        );
      }

      if (response.status === 429) {
        console.error('[FlightStatus] FlightAware API rate limit exceeded');
        return NextResponse.json({
          status: 'scheduled',
          statusText: 'On Time',
          message: 'Rate limit exceeded, try again later',
        });
      }

      throw new CustomError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Flight tracking service error: ${response.status}`,
        503
      );
    }

    const data: FlightAwareResponse = await response.json();

    if (!data.flights || data.flights.length === 0) {
      return NextResponse.json({
        status: 'scheduled',
        statusText: 'On Time',
        message: 'No flight data available',
      });
    }

    // Get the most relevant flight (first one, or find by date if multiple)
    let flight = data.flights[0];

    if (date && data.flights.length > 1) {
      // Try to find the flight that matches the requested date
      const requestedDate = new Date(date).toDateString();
      const matchingFlight = data.flights.find(f => {
        const flightDate = new Date(f.scheduled_out).toDateString();
        return flightDate === requestedDate;
      });
      if (matchingFlight) {
        flight = matchingFlight;
      }
    }

    const { status, statusText } = mapFlightStatus(flight.status, flight.departure_delay);

    const result: FlightStatusResponse = {
      status,
      statusText,
      actualDeparture: extractTime(flight.actual_out || flight.estimated_out),
      actualArrival: extractTime(flight.actual_in || flight.estimated_in),
      delay: flight.departure_delay && flight.departure_delay > 0 ? flight.departure_delay : undefined,
      gate: flight.gate_origin || undefined,
      terminal: flight.terminal_origin || undefined,
      terminalDestination: flight.terminal_destination || undefined,
      gateDestination: flight.gate_destination || undefined,
      baggageClaim: flight.baggage_claim || undefined,
      originCity: flight.origin?.city,
      destinationCity: flight.destination?.city,
    };

    return NextResponse.json(result);

  } catch (error) {
    // If it's already a CustomError, rethrow
    if (error instanceof CustomError) {
      throw error;
    }

    // Network or other errors - return graceful fallback
    console.error('[FlightStatus] Error fetching flight data:', error);
    return NextResponse.json({
      status: 'scheduled',
      statusText: 'On Time',
      message: 'Unable to fetch flight status',
    });
  }
});
