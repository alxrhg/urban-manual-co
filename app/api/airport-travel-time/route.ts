import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling, createValidationError } from '@/lib/errors';

interface TravelTimeRequest {
  origin: string; // Address or "lat,lng"
  airportCode: string; // e.g., "JFK", "LAX"
  mode?: 'driving' | 'transit';
}

interface TravelTimeResponse {
  durationMinutes: number;
  distanceKm: number;
  airportName: string;
  airportLat?: number;
  airportLng?: number;
  source: 'google' | 'estimate';
}

// Common airport locations (lat, lng)
const AIRPORT_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  // USA
  JFK: { lat: 40.6413, lng: -73.7781, name: 'John F. Kennedy International Airport' },
  LGA: { lat: 40.7769, lng: -73.8740, name: 'LaGuardia Airport' },
  EWR: { lat: 40.6895, lng: -74.1745, name: 'Newark Liberty International Airport' },
  LAX: { lat: 33.9416, lng: -118.4085, name: 'Los Angeles International Airport' },
  SFO: { lat: 37.6213, lng: -122.3790, name: 'San Francisco International Airport' },
  ORD: { lat: 41.9742, lng: -87.9073, name: "O'Hare International Airport" },
  MIA: { lat: 25.7959, lng: -80.2870, name: 'Miami International Airport' },
  DFW: { lat: 32.8998, lng: -97.0403, name: 'Dallas/Fort Worth International Airport' },
  ATL: { lat: 33.6407, lng: -84.4277, name: 'Hartsfield-Jackson Atlanta International Airport' },
  BOS: { lat: 42.3656, lng: -71.0096, name: 'Boston Logan International Airport' },
  SEA: { lat: 47.4502, lng: -122.3088, name: 'Seattle-Tacoma International Airport' },
  DEN: { lat: 39.8561, lng: -104.6737, name: 'Denver International Airport' },
  PHX: { lat: 33.4373, lng: -112.0078, name: 'Phoenix Sky Harbor International Airport' },
  IAH: { lat: 29.9902, lng: -95.3368, name: 'George Bush Intercontinental Airport' },
  LAS: { lat: 36.0840, lng: -115.1537, name: 'Harry Reid International Airport' },
  // Europe
  LHR: { lat: 51.4700, lng: -0.4543, name: 'London Heathrow Airport' },
  LGW: { lat: 51.1537, lng: -0.1821, name: 'London Gatwick Airport' },
  STN: { lat: 51.8860, lng: 0.2389, name: 'London Stansted Airport' },
  LCY: { lat: 51.5048, lng: 0.0495, name: 'London City Airport' },
  CDG: { lat: 49.0097, lng: 2.5479, name: 'Paris Charles de Gaulle Airport' },
  ORY: { lat: 48.7262, lng: 2.3652, name: 'Paris Orly Airport' },
  FCO: { lat: 41.8003, lng: 12.2389, name: 'Rome Fiumicino Airport' },
  AMS: { lat: 52.3105, lng: 4.7683, name: 'Amsterdam Schiphol Airport' },
  FRA: { lat: 50.0379, lng: 8.5622, name: 'Frankfurt Airport' },
  MUC: { lat: 48.3537, lng: 11.7750, name: 'Munich Airport' },
  BCN: { lat: 41.2974, lng: 2.0833, name: 'Barcelona-El Prat Airport' },
  MAD: { lat: 40.4983, lng: -3.5676, name: 'Madrid-Barajas Airport' },
  ZRH: { lat: 47.4647, lng: 8.5492, name: 'Zurich Airport' },
  VIE: { lat: 48.1103, lng: 16.5697, name: 'Vienna International Airport' },
  CPH: { lat: 55.6180, lng: 12.6508, name: 'Copenhagen Airport' },
  DUB: { lat: 53.4264, lng: -6.2499, name: 'Dublin Airport' },
  LIS: { lat: 38.7756, lng: -9.1354, name: 'Lisbon Portela Airport' },
  // Asia
  NRT: { lat: 35.7720, lng: 140.3929, name: 'Narita International Airport' },
  HND: { lat: 35.5494, lng: 139.7798, name: 'Tokyo Haneda Airport' },
  HKG: { lat: 22.3080, lng: 113.9185, name: 'Hong Kong International Airport' },
  SIN: { lat: 1.3644, lng: 103.9915, name: 'Singapore Changi Airport' },
  ICN: { lat: 37.4602, lng: 126.4407, name: 'Incheon International Airport' },
  BKK: { lat: 13.6900, lng: 100.7501, name: 'Suvarnabhumi Airport' },
  DXB: { lat: 25.2532, lng: 55.3657, name: 'Dubai International Airport' },
  DOH: { lat: 25.2731, lng: 51.6081, name: 'Hamad International Airport' },
  PEK: { lat: 40.0799, lng: 116.6031, name: 'Beijing Capital International Airport' },
  PVG: { lat: 31.1443, lng: 121.8083, name: 'Shanghai Pudong International Airport' },
  DEL: { lat: 28.5562, lng: 77.1000, name: 'Indira Gandhi International Airport' },
  BOM: { lat: 19.0896, lng: 72.8656, name: 'Chhatrapati Shivaji Maharaj International Airport' },
  // Australia & Oceania
  SYD: { lat: -33.9399, lng: 151.1753, name: 'Sydney Kingsford Smith Airport' },
  MEL: { lat: -37.6690, lng: 144.8410, name: 'Melbourne Airport' },
  AKL: { lat: -37.0082, lng: 174.7850, name: 'Auckland Airport' },
  // South America
  GRU: { lat: -23.4356, lng: -46.4731, name: 'São Paulo-Guarulhos International Airport' },
  EZE: { lat: -34.8222, lng: -58.5358, name: 'Buenos Aires Ezeiza International Airport' },
  BOG: { lat: 4.7016, lng: -74.1469, name: 'El Dorado International Airport' },
  SCL: { lat: -33.3930, lng: -70.7858, name: 'Santiago International Airport' },
  LIM: { lat: -12.0219, lng: -77.1143, name: 'Jorge Chávez International Airport' },
  // Africa
  JNB: { lat: -26.1392, lng: 28.2460, name: 'O.R. Tambo International Airport' },
  CPT: { lat: -33.9715, lng: 18.6021, name: 'Cape Town International Airport' },
  CAI: { lat: 30.1219, lng: 31.4056, name: 'Cairo International Airport' },
  CMN: { lat: 33.3675, lng: -7.5898, name: 'Mohammed V International Airport' },
};

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body: TravelTimeRequest = await request.json();
  const { origin, airportCode, mode = 'driving' } = body;

  if (!origin) {
    throw createValidationError('Origin address is required');
  }

  if (!airportCode) {
    throw createValidationError('Airport code is required');
  }

  const airportCodeUpper = airportCode.toUpperCase().trim();
  const airport = AIRPORT_LOCATIONS[airportCodeUpper];

  if (!airport) {
    // Return estimate for unknown airports (no coordinates available)
    return NextResponse.json({
      durationMinutes: 60, // Default 1 hour estimate
      distanceKm: 40,
      airportName: airportCodeUpper,
      source: 'estimate',
      message: 'Unknown airport code - using default estimate',
    });
  }

  // Airport coordinates for transit calculations
  const airportLat = airport.lat;
  const airportLng = airport.lng;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

  if (!apiKey) {
    // Fallback to estimate
    return NextResponse.json({
      durationMinutes: 45,
      distanceKm: 30,
      airportName: airport.name,
      airportLat,
      airportLng,
      source: 'estimate',
      message: 'Google Maps API not configured - using estimate',
    });
  }

  try {
    const destination = `${airport.lat},${airport.lng}`;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${destination}&mode=${mode}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.rows?.[0]?.elements?.[0]) {
      return NextResponse.json({
        durationMinutes: 45,
        distanceKm: 30,
        airportName: airport.name,
        airportLat,
        airportLng,
        source: 'estimate',
        message: 'Could not calculate route - using estimate',
      });
    }

    const element = data.rows[0].elements[0];

    if (element.status !== 'OK') {
      return NextResponse.json({
        durationMinutes: 45,
        distanceKm: 30,
        airportName: airport.name,
        airportLat,
        airportLng,
        source: 'estimate',
        message: 'Route not found - using estimate',
      });
    }

    const durationMinutes = Math.round(element.duration.value / 60);
    const distanceKm = Math.round(element.distance.value / 1000);

    return NextResponse.json({
      durationMinutes,
      distanceKm,
      airportName: airport.name,
      airportLat,
      airportLng,
      source: 'google',
    } as TravelTimeResponse);
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return NextResponse.json({
      durationMinutes: 45,
      distanceKm: 30,
      airportName: airport.name,
      airportLat,
      airportLng,
      source: 'estimate',
      message: 'API error - using estimate',
    });
  }
});
