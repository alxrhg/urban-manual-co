/**
 * Airport utilities for getting coordinates from airport codes/names
 */

// Common international airports with coordinates
// This provides instant lookup without API calls
export const AIRPORT_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  // North America
  'JFK': { lat: 40.6413, lng: -73.7781, name: 'John F. Kennedy International Airport' },
  'LAX': { lat: 33.9425, lng: -118.4081, name: 'Los Angeles International Airport' },
  'SFO': { lat: 37.6213, lng: -122.3790, name: 'San Francisco International Airport' },
  'ORD': { lat: 41.9742, lng: -87.9073, name: "O'Hare International Airport" },
  'MIA': { lat: 25.7959, lng: -80.2870, name: 'Miami International Airport' },
  'DFW': { lat: 32.8998, lng: -97.0403, name: 'Dallas/Fort Worth International Airport' },
  'ATL': { lat: 33.6407, lng: -84.4277, name: 'Hartsfield-Jackson Atlanta International Airport' },
  'BOS': { lat: 42.3656, lng: -71.0096, name: 'Boston Logan International Airport' },
  'SEA': { lat: 47.4502, lng: -122.3088, name: 'Seattle-Tacoma International Airport' },
  'DEN': { lat: 39.8561, lng: -104.6737, name: 'Denver International Airport' },
  'LAS': { lat: 36.0840, lng: -115.1537, name: 'Harry Reid International Airport' },
  'EWR': { lat: 40.6895, lng: -74.1745, name: 'Newark Liberty International Airport' },
  'YYZ': { lat: 43.6777, lng: -79.6248, name: 'Toronto Pearson International Airport' },
  'YVR': { lat: 49.1967, lng: -123.1815, name: 'Vancouver International Airport' },
  'MEX': { lat: 19.4361, lng: -99.0719, name: 'Mexico City International Airport' },

  // Europe
  'LHR': { lat: 51.4700, lng: -0.4543, name: 'London Heathrow Airport' },
  'LGW': { lat: 51.1537, lng: -0.1821, name: 'London Gatwick Airport' },
  'CDG': { lat: 49.0097, lng: 2.5479, name: 'Paris Charles de Gaulle Airport' },
  'ORY': { lat: 48.7262, lng: 2.3652, name: 'Paris Orly Airport' },
  'AMS': { lat: 52.3105, lng: 4.7683, name: 'Amsterdam Schiphol Airport' },
  'FRA': { lat: 50.0379, lng: 8.5622, name: 'Frankfurt Airport' },
  'MUC': { lat: 48.3537, lng: 11.7750, name: 'Munich Airport' },
  'FCO': { lat: 41.8003, lng: 12.2389, name: 'Rome Fiumicino Airport' },
  'BCN': { lat: 41.2971, lng: 2.0785, name: 'Barcelona El Prat Airport' },
  'MAD': { lat: 40.4983, lng: -3.5676, name: 'Madrid Barajas Airport' },
  'ZRH': { lat: 47.4582, lng: 8.5555, name: 'Zurich Airport' },
  'VIE': { lat: 48.1103, lng: 16.5697, name: 'Vienna International Airport' },
  'CPH': { lat: 55.6180, lng: 12.6508, name: 'Copenhagen Airport' },
  'DUB': { lat: 53.4264, lng: -6.2499, name: 'Dublin Airport' },
  'LIS': { lat: 38.7756, lng: -9.1354, name: 'Lisbon Portela Airport' },
  'OSL': { lat: 60.1939, lng: 11.1004, name: 'Oslo Gardermoen Airport' },
  'ARN': { lat: 59.6498, lng: 17.9238, name: 'Stockholm Arlanda Airport' },
  'HEL': { lat: 60.3172, lng: 24.9633, name: 'Helsinki Airport' },
  'IST': { lat: 41.2753, lng: 28.7519, name: 'Istanbul Airport' },
  'ATH': { lat: 37.9364, lng: 23.9445, name: 'Athens International Airport' },

  // Asia
  'NRT': { lat: 35.7720, lng: 140.3929, name: 'Narita International Airport' },
  'HND': { lat: 35.5494, lng: 139.7798, name: 'Tokyo Haneda Airport' },
  'ICN': { lat: 37.4602, lng: 126.4407, name: 'Incheon International Airport' },
  'PEK': { lat: 40.0799, lng: 116.6031, name: 'Beijing Capital International Airport' },
  'PVG': { lat: 31.1443, lng: 121.8083, name: 'Shanghai Pudong International Airport' },
  'HKG': { lat: 22.3080, lng: 113.9185, name: 'Hong Kong International Airport' },
  'SIN': { lat: 1.3644, lng: 103.9915, name: 'Singapore Changi Airport' },
  'BKK': { lat: 13.6900, lng: 100.7501, name: 'Bangkok Suvarnabhumi Airport' },
  'KUL': { lat: 2.7456, lng: 101.7099, name: 'Kuala Lumpur International Airport' },
  'DEL': { lat: 28.5562, lng: 77.1000, name: 'Delhi Indira Gandhi International Airport' },
  'BOM': { lat: 19.0896, lng: 72.8656, name: 'Mumbai Chhatrapati Shivaji Airport' },
  'DXB': { lat: 25.2532, lng: 55.3657, name: 'Dubai International Airport' },
  'DOH': { lat: 25.2731, lng: 51.6081, name: 'Hamad International Airport' },
  'TPE': { lat: 25.0797, lng: 121.2342, name: 'Taiwan Taoyuan International Airport' },
  'MNL': { lat: 14.5086, lng: 121.0197, name: 'Manila Ninoy Aquino International Airport' },
  'CGK': { lat: -6.1256, lng: 106.6558, name: 'Jakarta Soekarno-Hatta Airport' },

  // Oceania
  'SYD': { lat: -33.9399, lng: 151.1753, name: 'Sydney Kingsford Smith Airport' },
  'MEL': { lat: -37.6690, lng: 144.8410, name: 'Melbourne Airport' },
  'AKL': { lat: -37.0082, lng: 174.7850, name: 'Auckland Airport' },
  'BNE': { lat: -27.3942, lng: 153.1218, name: 'Brisbane Airport' },

  // South America
  'GRU': { lat: -23.4356, lng: -46.4731, name: 'São Paulo Guarulhos Airport' },
  'GIG': { lat: -22.8099, lng: -43.2505, name: 'Rio de Janeiro Galeão Airport' },
  'EZE': { lat: -34.8222, lng: -58.5358, name: 'Buenos Aires Ezeiza Airport' },
  'SCL': { lat: -33.3930, lng: -70.7858, name: 'Santiago Arturo Merino Benítez Airport' },
  'LIM': { lat: -12.0219, lng: -77.1143, name: 'Lima Jorge Chávez Airport' },
  'BOG': { lat: 4.7016, lng: -74.1469, name: 'Bogotá El Dorado Airport' },

  // Africa
  'JNB': { lat: -26.1392, lng: 28.2460, name: 'Johannesburg O.R. Tambo Airport' },
  'CAI': { lat: 30.1219, lng: 31.4056, name: 'Cairo International Airport' },
  'CPT': { lat: -33.9715, lng: 18.6021, name: 'Cape Town International Airport' },
  'CMN': { lat: 33.3675, lng: -7.5899, name: 'Casablanca Mohammed V Airport' },
  'NBO': { lat: -1.3192, lng: 36.9278, name: 'Nairobi Jomo Kenyatta Airport' },
};

/**
 * Extract airport code from a string (e.g., "JFK", "New York (JFK)", "JFK - New York")
 */
export function extractAirportCode(airportStr: string | undefined | null): string | null {
  if (!airportStr) return null;

  // Try to find a 3-letter uppercase code
  const codeMatch = airportStr.match(/\b([A-Z]{3})\b/);
  if (codeMatch) {
    return codeMatch[1];
  }

  // Try uppercase version
  const upperStr = airportStr.toUpperCase();
  const upperMatch = upperStr.match(/\b([A-Z]{3})\b/);
  if (upperMatch && AIRPORT_COORDINATES[upperMatch[1]]) {
    return upperMatch[1];
  }

  return null;
}

/**
 * Get coordinates for an airport by code or name
 */
export function getAirportCoordinates(airportStr: string | undefined | null): { latitude: number; longitude: number } | null {
  if (!airportStr) return null;

  // First, try to extract airport code
  const code = extractAirportCode(airportStr);
  if (code && AIRPORT_COORDINATES[code]) {
    const coords = AIRPORT_COORDINATES[code];
    return { latitude: coords.lat, longitude: coords.lng };
  }

  // Try direct lookup (case insensitive)
  const upperStr = airportStr.toUpperCase().trim();
  if (AIRPORT_COORDINATES[upperStr]) {
    const coords = AIRPORT_COORDINATES[upperStr];
    return { latitude: coords.lat, longitude: coords.lng };
  }

  // Search by name (partial match)
  const lowerStr = airportStr.toLowerCase();
  for (const [code, data] of Object.entries(AIRPORT_COORDINATES)) {
    if (data.name.toLowerCase().includes(lowerStr) || lowerStr.includes(data.name.toLowerCase())) {
      return { latitude: data.lat, longitude: data.lng };
    }
  }

  return null;
}
