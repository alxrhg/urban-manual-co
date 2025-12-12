// Major airports data with coordinates (Top ~50 busiest + major hubs)
// Format: IATA code -> { name, city, country, lat, lon }

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Record<string, Airport> = {
  // North America
  'ATL': { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA', lat: 33.6407, lon: -84.4277 },
  'LAX': { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', lat: 33.9416, lon: -118.4085 },
  'ORD': { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA', lat: 41.9742, lon: -87.9073 },
  'DFW': { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas-Fort Worth', country: 'USA', lat: 32.8998, lon: -97.0403 },
  'DEN': { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'USA', lat: 39.8561, lon: -104.6737 },
  'JFK': { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', lat: 40.6413, lon: -73.7781 },
  'SFO': { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA', lat: 37.6213, lon: -122.3790 },
  'LAS': { code: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas', country: 'USA', lat: 36.0840, lon: -115.1537 },
  'SEA': { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'USA', lat: 47.4502, lon: -122.3088 },
  'MIA': { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA', lat: 25.7959, lon: -80.2870 },
  'MCO': { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'USA', lat: 28.4312, lon: -81.3081 },
  'EWR': { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA', lat: 40.6895, lon: -74.1745 },
  'CLT': { code: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'USA', lat: 35.2144, lon: -80.9473 },
  'PHX': { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'USA', lat: 33.4352, lon: -112.0101 },
  'IAH': { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'USA', lat: 29.9902, lon: -95.3368 },
  'BOS': { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'USA', lat: 42.3656, lon: -71.0096 },
  'YYZ': { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', lat: 43.6777, lon: -79.6248 },
  'YVR': { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', lat: 49.1947, lon: -123.1792 },
  'MEX': { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', lat: 19.4361, lon: -99.0719 },
  'CUN': { code: 'CUN', name: 'Cancún International Airport', city: 'Cancún', country: 'Mexico', lat: 21.0417, lon: -86.8741 },

  // Europe
  'LHR': { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK', lat: 51.4700, lon: -0.4543 },
  'CDG': { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479 },
  'AMS': { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lon: 4.7683 },
  'FRA': { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lon: 8.5622 },
  'MAD': { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', lat: 40.4839, lon: -3.5679 },
  'BCN': { code: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain', lat: 41.2974, lon: 2.0833 },
  'IST': { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', lat: 41.2768, lon: 28.7293 },
  'MUC': { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', lat: 48.3536, lon: 11.7750 },
  'ZRH': { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', lat: 47.4582, lon: 8.5555 },
  'FCO': { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', lat: 41.8003, lon: 12.2389 },
  'LGW': { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'UK', lat: 51.1537, lon: -0.1821 },
  'DUB': { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4264, lon: -6.2499 },
  'VIE': { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', lat: 48.1103, lon: 16.5697 },
  'CPH': { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', lat: 55.6180, lon: 12.6508 },
  'OSL': { code: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway', lat: 60.1976, lon: 11.1004 },
  'ARN': { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', lat: 59.6498, lon: 17.9238 },

  // Asia
  'HND': { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', lat: 35.5494, lon: 139.7798 },
  'NRT': { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', lat: 35.7720, lon: 140.3929 },
  'DXB': { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', lat: 25.2532, lon: 55.3657 },
  'SIN': { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915 },
  'ICN': { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407 },
  'HKG': { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3080, lon: 113.9185 },
  'BKK': { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lon: 100.7501 },
  'DEL': { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India', lat: 28.5562, lon: 77.1000 },
  'PEK': { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', lat: 40.0799, lon: 116.6031 },
  'PVG': { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083 },
  'CAN': { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', lat: 23.3959, lon: 113.2988 },
  'KUL': { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lon: 101.7072 },
  'CGK': { code: 'CGK', name: 'Soekarno-Hatta International Airport', city: 'Jakarta', country: 'Indonesia', lat: -6.1275, lon: 106.6558 },
  'TPE': { code: 'TPE', name: 'Taoyuan International Airport', city: 'Taipei', country: 'Taiwan', lat: 25.0797, lon: 121.2342 },
  'SGN': { code: 'SGN', name: 'Tan Son Nhat International Airport', city: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8185, lon: 106.6588 },
  'MNL': { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines', lat: 14.5086, lon: 121.0194 },

  // Oceania
  'SYD': { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', lat: -33.9399, lon: 151.1753 },
  'MEL': { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', lat: -37.6690, lon: 144.8410 },
  'AKL': { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lon: 174.7850 },

  // South America
  'GRU': { code: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731 },
  'BOG': { code: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469 },
  'LIM': { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', lat: -12.0241, lon: -77.1143 },
  'SCL': { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile', lat: -33.3907, lon: -70.7926 },

  // Africa
  'JNB': { code: 'JNB', name: 'O. R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', lat: -26.1367, lon: 28.2411 },
  'CAI': { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', lat: 30.1219, lon: 31.4056 },
  'CPT': { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', lat: -33.9715, lon: 18.6021 },
  'LOS': { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', lat: 6.5774, lon: 3.3215 },
};

export function getAirport(query: string): Airport | null {
  if (!query) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try exact IATA code match first (highest priority)
  const upperCode = trimmed.toUpperCase();
  if (AIRPORTS[upperCode]) {
    return AIRPORTS[upperCode];
  }

  // Try searching by city or name
  const lowerQuery = trimmed.toLowerCase();
  for (const airport of Object.values(AIRPORTS)) {
    if (airport.city.toLowerCase().includes(lowerQuery) ||
        airport.name.toLowerCase().includes(lowerQuery)) {
      return airport;
    }
  }

  return null;
}





