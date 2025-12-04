/**
 * Travel-specific AI Tools
 * Tools for searching flights, hotels, activities, and weather
 */

import { z } from 'zod';
import { tool, ToolContext } from './ai-tools';
import { createServerClient } from '@/lib/supabase-server';
import type { Destination } from '@/types/destination';

// =============================================================================
// FLIGHT TOOLS
// =============================================================================

/**
 * Search for flights
 */
export const searchFlights = tool({
  description:
    'Search for flights between two airports. Returns available flights with prices, airlines, and schedules.',
  parameters: z.object({
    origin: z.string().describe('Origin airport code (e.g., "JFK", "LAX")'),
    destination: z.string().describe('Destination airport code (e.g., "NRT", "CDG")'),
    departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
    returnDate: z.string().optional().describe('Return date for round-trip (YYYY-MM-DD)'),
    passengers: z.number().default(1).describe('Number of passengers'),
    cabinClass: z
      .enum(['economy', 'premium_economy', 'business', 'first'])
      .default('economy')
      .describe('Cabin class preference'),
    maxPrice: z.number().optional().describe('Maximum price per person in USD'),
    directOnly: z.boolean().default(false).describe('Only show direct flights'),
  }),
  execute: async (params, context?: ToolContext) => {
    // In production, integrate with flight APIs like:
    // - Amadeus Flight Offers Search API
    // - Skyscanner API
    // - Google Flights API (via SerpApi)

    // Mock response for demonstration
    const mockFlights = generateMockFlights(params);

    return {
      success: true,
      query: params,
      flights: mockFlights,
      currency: 'USD',
      searchId: `search_${Date.now()}`,
    };
  },
});

/**
 * Get flight details
 */
export const getFlightDetails = tool({
  description: 'Get detailed information about a specific flight including amenities and policies.',
  parameters: z.object({
    flightId: z.string().describe('Flight offer ID from search results'),
    searchId: z.string().describe('Search ID from the original search'),
  }),
  execute: async (params) => {
    return {
      success: true,
      flightId: params.flightId,
      amenities: {
        wifi: true,
        meals: true,
        entertainment: true,
        powerOutlets: true,
      },
      baggage: {
        carryOn: '1 bag (10kg)',
        checked: '2 bags (23kg each)',
      },
      cancellation: {
        refundable: false,
        changeAllowed: true,
        changeFee: 150,
      },
    };
  },
});

// =============================================================================
// HOTEL TOOLS
// =============================================================================

/**
 * Search for hotels
 */
export const searchHotels = tool({
  description:
    'Search for hotels in a location. Returns available hotels with prices, ratings, and amenities.',
  parameters: z.object({
    location: z.string().describe('City or area to search (e.g., "Tokyo", "Paris 1st arrondissement")'),
    checkIn: z.string().describe('Check-in date in YYYY-MM-DD format'),
    checkOut: z.string().describe('Check-out date in YYYY-MM-DD format'),
    guests: z.number().default(2).describe('Number of guests'),
    rooms: z.number().default(1).describe('Number of rooms'),
    starRating: z.number().min(1).max(5).optional().describe('Minimum star rating (1-5)'),
    maxPrice: z.number().optional().describe('Maximum price per night in USD'),
    amenities: z
      .array(z.string())
      .optional()
      .describe('Required amenities (e.g., ["wifi", "pool", "gym"])'),
  }),
  execute: async (params, context?: ToolContext) => {
    // First check Urban Manual's destination database for hotels
    const supabase = await createServerClient();
    const { data: localHotels } = await supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${params.location}%`)
      .eq('category', 'Hotel')
      .limit(10);

    // In production, also integrate with:
    // - Booking.com API
    // - Hotels.com API
    // - Expedia API

    const mockHotels = generateMockHotels(params);

    // Merge Urban Manual hotels with external results
    const urbanManualHotels = ((localHotels || []) as Destination[]).map((hotel) => ({
      id: `um_${hotel.id}`,
      name: hotel.name,
      location: hotel.city,
      starRating: hotel.rating || 4,
      pricePerNight: hotel.price_level ? hotel.price_level * 100 : 200,
      currency: 'USD',
      image: hotel.image,
      amenities: ['wifi', 'breakfast'],
      source: 'urban_manual',
      slug: hotel.slug,
      description: hotel.micro_description || hotel.description,
    }));

    return {
      success: true,
      query: params,
      hotels: [...urbanManualHotels, ...mockHotels],
      currency: 'USD',
      searchId: `hotel_search_${Date.now()}`,
    };
  },
});

/**
 * Get hotel details
 */
export const getHotelDetails = tool({
  description: 'Get detailed information about a specific hotel including room types and policies.',
  parameters: z.object({
    hotelId: z.string().describe('Hotel ID from search results'),
  }),
  execute: async (params) => {
    // Check if it's an Urban Manual hotel
    if (params.hotelId.startsWith('um_')) {
      const id = params.hotelId.replace('um_', '');
      const supabase = await createServerClient();
      const { data: hotel } = await supabase
        .from('destinations')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (hotel) {
        return {
          success: true,
          hotel: {
            id: params.hotelId,
            name: hotel.name,
            description: hotel.description,
            address: hotel.address,
            latitude: hotel.latitude,
            longitude: hotel.longitude,
            amenities: hotel.amenities || [],
            images: hotel.image ? [hotel.image] : [],
            website: hotel.website,
            phone: hotel.phone_number,
          },
        };
      }
    }

    // Mock response for external hotels
    return {
      success: true,
      hotel: {
        id: params.hotelId,
        name: 'Sample Hotel',
        description: 'A lovely hotel in a great location',
        amenities: ['wifi', 'pool', 'gym', 'restaurant', 'spa'],
        roomTypes: [
          { name: 'Standard', price: 150, beds: '1 King' },
          { name: 'Deluxe', price: 250, beds: '1 King + Sofa' },
          { name: 'Suite', price: 400, beds: '2 Kings' },
        ],
        policies: {
          checkIn: '15:00',
          checkOut: '11:00',
          cancellation: 'Free cancellation up to 24 hours before check-in',
        },
      },
    };
  },
});

// =============================================================================
// WEATHER TOOLS
// =============================================================================

/**
 * Get weather forecast
 */
export const getWeather = tool({
  description: 'Get current weather and forecast for a location. Useful for trip planning.',
  parameters: z.object({
    location: z.string().describe('City or location name'),
    date: z.string().optional().describe('Specific date for forecast (YYYY-MM-DD)'),
    days: z.number().min(1).max(14).default(7).describe('Number of days for forecast'),
  }),
  execute: async (params) => {
    // In production, integrate with:
    // - OpenWeatherMap API
    // - WeatherAPI
    // - Tomorrow.io

    const forecast = generateMockWeather(params.location, params.days);

    return {
      success: true,
      location: params.location,
      current: forecast[0],
      forecast: forecast,
      units: 'metric',
    };
  },
});

// =============================================================================
// ACTIVITY TOOLS
// =============================================================================

/**
 * Search for activities and experiences
 */
export const searchActivities = tool({
  description: 'Search for activities, tours, and experiences in a destination.',
  parameters: z.object({
    location: z.string().describe('City or destination'),
    date: z.string().optional().describe('Date for activities (YYYY-MM-DD)'),
    category: z
      .enum([
        'tours',
        'experiences',
        'food',
        'culture',
        'outdoor',
        'nightlife',
        'wellness',
        'sports',
      ])
      .optional()
      .describe('Activity category'),
    duration: z
      .enum(['half-day', 'full-day', 'multi-day'])
      .optional()
      .describe('Activity duration'),
    maxPrice: z.number().optional().describe('Maximum price per person in USD'),
  }),
  execute: async (params, context?: ToolContext) => {
    // Search Urban Manual's destinations for relevant activities
    const supabase = await createServerClient();

    let query = supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${params.location}%`)
      .is('parent_destination_id', null);

    // Map category to destination categories
    if (params.category) {
      const categoryMap: Record<string, string[]> = {
        tours: ['Culture', 'Architecture'],
        experiences: ['Culture', 'Activity'],
        food: ['Restaurant', 'Cafe', 'Bar'],
        culture: ['Culture', 'Museum', 'Architecture'],
        outdoor: ['Nature', 'Park', 'Activity'],
        nightlife: ['Bar', 'Club', 'Entertainment'],
        wellness: ['Spa', 'Wellness'],
        sports: ['Activity', 'Sports'],
      };
      const categories = categoryMap[params.category] || [params.category];
      query = query.in('category', categories);
    }

    const { data: activities } = await query.limit(20);

    const results = ((activities || []) as Destination[]).map((activity) => ({
      id: `um_${activity.id}`,
      name: activity.name,
      description: activity.micro_description || activity.description,
      category: activity.category,
      location: activity.city,
      price: activity.price_level ? activity.price_level * 30 : null,
      rating: activity.rating,
      image: activity.image,
      duration: estimateDuration(activity.category),
      source: 'urban_manual',
      slug: activity.slug,
    }));

    return {
      success: true,
      query: params,
      activities: results,
      total: results.length,
    };
  },
});

/**
 * Get local recommendations from Urban Manual
 */
export const getRecommendations = tool({
  description:
    "Get curated local recommendations from Urban Manual's destination database. Perfect for discovering hidden gems.",
  parameters: z.object({
    city: z.string().describe('City name'),
    category: z
      .enum([
        'Restaurant',
        'Hotel',
        'Bar',
        'Cafe',
        'Culture',
        'Shopping',
        'Nature',
        'Architecture',
      ])
      .optional()
      .describe('Category filter'),
    style: z
      .enum(['luxury', 'mid-range', 'budget', 'local-favorite', 'hidden-gem'])
      .optional()
      .describe('Style preference'),
    limit: z.number().min(1).max(20).default(10).describe('Number of recommendations'),
  }),
  execute: async (params, context?: ToolContext) => {
    const supabase = await createServerClient();

    let query = supabase
      .from('destinations')
      .select('*')
      .ilike('city', `%${params.city}%`)
      .is('parent_destination_id', null);

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.style === 'luxury') {
      query = query.gte('price_level', 3);
    } else if (params.style === 'budget') {
      query = query.lte('price_level', 2);
    }

    // Order by rating and limit
    const { data: destinations } = await query
      .order('rating', { ascending: false })
      .limit(params.limit);

    return {
      success: true,
      city: params.city,
      recommendations: ((destinations || []) as Destination[]).map((dest) => ({
        id: dest.id,
        slug: dest.slug,
        name: dest.name,
        category: dest.category,
        description: dest.micro_description || dest.description?.slice(0, 200),
        rating: dest.rating,
        priceLevel: dest.price_level,
        image: dest.image,
        michelinStars: dest.michelin_stars,
        neighborhood: dest.neighborhood,
      })),
    };
  },
});

// =============================================================================
// TRANSPORTATION TOOLS
// =============================================================================

/**
 * Search for ground transportation
 */
export const searchTransportation = tool({
  description: 'Search for ground transportation options including trains, buses, and car rentals.',
  parameters: z.object({
    type: z.enum(['train', 'bus', 'car-rental', 'transfer']).describe('Type of transportation'),
    origin: z.string().describe('Starting location'),
    destination: z.string().describe('End location'),
    date: z.string().describe('Date of travel (YYYY-MM-DD)'),
    time: z.string().optional().describe('Preferred departure time (HH:MM)'),
    passengers: z.number().default(1).describe('Number of passengers'),
  }),
  execute: async (params) => {
    // In production, integrate with:
    // - Rome2Rio API
    // - Trainline API
    // - Rental car aggregators

    const mockOptions = generateMockTransportation(params);

    return {
      success: true,
      query: params,
      options: mockOptions,
    };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateMockFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  cabinClass: string;
}) {
  const airlines = ['United', 'Delta', 'American', 'Japan Airlines', 'ANA', 'Air France', 'British Airways'];
  const basePrice = params.cabinClass === 'economy' ? 800 : params.cabinClass === 'business' ? 3500 : 8000;

  return Array.from({ length: 5 }, (_, i) => ({
    id: `flight_${Date.now()}_${i}`,
    airline: airlines[Math.floor(Math.random() * airlines.length)],
    flightNumber: `${['UA', 'DL', 'AA', 'JL', 'NH', 'AF', 'BA'][i % 7]}${100 + Math.floor(Math.random() * 900)}`,
    origin: params.origin,
    destination: params.destination,
    departureTime: `${8 + i * 2}:${Math.random() > 0.5 ? '00' : '30'}`,
    arrivalTime: `${14 + i * 2}:${Math.random() > 0.5 ? '15' : '45'}`,
    duration: `${10 + Math.floor(Math.random() * 4)}h ${Math.floor(Math.random() * 60)}m`,
    stops: Math.floor(Math.random() * 2),
    price: basePrice + Math.floor(Math.random() * 500),
    seatsAvailable: 5 + Math.floor(Math.random() * 10),
    cabinClass: params.cabinClass,
  }));
}

function generateMockHotels(params: { location: string; starRating?: number }) {
  const hotelNames = ['Grand Palace', 'Boutique Inn', 'City Center Hotel', 'Luxury Suites', 'Modern Stay'];
  const minStars = params.starRating || 3;

  return Array.from({ length: 5 }, (_, i) => ({
    id: `ext_hotel_${Date.now()}_${i}`,
    name: `${hotelNames[i]} ${params.location}`,
    location: params.location,
    starRating: Math.min(5, minStars + Math.floor(Math.random() * (6 - minStars))),
    pricePerNight: 100 + Math.floor(Math.random() * 300),
    currency: 'USD',
    rating: 4 + Math.random(),
    reviewCount: 50 + Math.floor(Math.random() * 500),
    amenities: ['wifi', 'breakfast', 'gym', 'pool'].slice(0, 2 + Math.floor(Math.random() * 3)),
    source: 'external',
  }));
}

function generateMockWeather(location: string, days: number) {
  const conditions = ['sunny', 'partly_cloudy', 'cloudy', 'light_rain', 'clear'];

  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);

    return {
      date: date.toISOString().split('T')[0],
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      temperatureHigh: 20 + Math.floor(Math.random() * 10),
      temperatureLow: 10 + Math.floor(Math.random() * 10),
      humidity: 50 + Math.floor(Math.random() * 30),
      precipitation: Math.floor(Math.random() * 30),
      wind: 5 + Math.floor(Math.random() * 15),
    };
  });
}

function generateMockTransportation(params: { type: string; origin: string; destination: string }) {
  if (params.type === 'train') {
    return [
      {
        id: 'train_1',
        operator: 'National Rail',
        departureTime: '08:00',
        arrivalTime: '10:30',
        duration: '2h 30m',
        price: 45,
        class: 'standard',
      },
      {
        id: 'train_2',
        operator: 'Express Line',
        departureTime: '09:15',
        arrivalTime: '10:45',
        duration: '1h 30m',
        price: 75,
        class: 'first',
      },
    ];
  }

  if (params.type === 'car-rental') {
    return [
      { id: 'car_1', company: 'Hertz', carType: 'Economy', pricePerDay: 35 },
      { id: 'car_2', company: 'Avis', carType: 'Compact', pricePerDay: 42 },
      { id: 'car_3', company: 'Enterprise', carType: 'SUV', pricePerDay: 65 },
    ];
  }

  return [
    { id: 'transfer_1', type: 'private', price: 50, duration: '45 min' },
    { id: 'transfer_2', type: 'shared', price: 20, duration: '1h 15m' },
  ];
}

function estimateDuration(category: string): string {
  const durations: Record<string, string> = {
    Restaurant: '1-2 hours',
    Cafe: '30-60 min',
    Bar: '1-2 hours',
    Culture: '2-3 hours',
    Museum: '2-4 hours',
    Nature: '2-4 hours',
    Shopping: '1-3 hours',
    Architecture: '30-60 min',
  };
  return durations[category] || '1-2 hours';
}

// =============================================================================
// TOOL COLLECTION
// =============================================================================

/**
 * All travel tools
 */
export const travelTools = {
  searchFlights,
  getFlightDetails,
  searchHotels,
  getHotelDetails,
  getWeather,
  searchActivities,
  getRecommendations,
  searchTransportation,
};
