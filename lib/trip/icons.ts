/**
 * Centralized icon mapping for all trip card types and activities
 *
 * This module provides consistent icon mappings for:
 * - Card types (flight, restaurant, attraction, hotel, transport, custom)
 * - Hotel activities (check-in, breakfast, pool, spa, etc.)
 * - Airport activities (lounge, security, boarding, etc.)
 * - Airline logos
 * - Weather conditions
 * - Travel modes (walk, car, transit, bike)
 */

import { ReactNode, createElement } from 'react';
import {
  Plane,
  Utensils,
  Landmark,
  Moon,
  Car,
  MapPin,
  Footprints,
  Train,
  Bike,
} from 'lucide-react';

// =============================================================================
// Type Definitions
// =============================================================================

export type CardType =
  | 'flight'
  | 'restaurant'
  | 'attraction'
  | 'hotel_overnight'
  | 'hotel_activity'
  | 'transport'
  | 'custom';

export type HotelActivityType =
  | 'check_in'
  | 'checkout'
  | 'breakfast'
  | 'pool'
  | 'spa'
  | 'gym'
  | 'lounge'
  | 'get_ready'
  | 'rest';

export type AirportActivityType =
  | 'lounge'
  | 'security'
  | 'checkin_counter'
  | 'boarding';

export type TravelMode = 'walk' | 'car' | 'transit' | 'taxi' | 'bike';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'partly_cloudy'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'wind'
  | 'hot'
  | 'cold';

// =============================================================================
// Category Icons
// =============================================================================

/**
 * Get icon component for a card type
 * Returns a React node with the appropriate Lucide icon
 *
 * @param category - The card type
 * @param className - Optional CSS class for styling (default: "w-4 h-4")
 * @returns ReactNode with the icon
 *
 * @example
 * getCategoryIcon('flight') // Returns <Plane className="w-4 h-4" />
 * getCategoryIcon('restaurant', 'w-5 h-5 text-orange-500')
 */
export function getCategoryIcon(
  category: CardType,
  className: string = 'w-4 h-4'
): ReactNode {
  const iconMap: Record<CardType, typeof Plane> = {
    flight: Plane,
    restaurant: Utensils,
    attraction: Landmark,
    hotel_overnight: Moon,
    hotel_activity: Moon, // Will vary by subtype when used with getHotelActivityIcon
    transport: Car,
    custom: MapPin,
  };

  const IconComponent = iconMap[category] || MapPin;
  return createElement(IconComponent, { className });
}

// =============================================================================
// Hotel Activity Icons
// =============================================================================

const HOTEL_ACTIVITY_ICONS: Record<HotelActivityType, string> = {
  check_in: '🏨',
  checkout: '📦',
  breakfast: '☕',
  pool: '🏊',
  spa: '💆',
  gym: '🏋️',
  lounge: '🛋️',
  get_ready: '🚿',
  rest: '💤',
};

/**
 * Get emoji icon for a hotel activity type
 *
 * @param subtype - The hotel activity type
 * @returns Emoji string
 *
 * @example
 * getHotelActivityIcon('check_in') // Returns "🏨"
 * getHotelActivityIcon('breakfast') // Returns "☕"
 */
export function getHotelActivityIcon(subtype: HotelActivityType): string {
  return HOTEL_ACTIVITY_ICONS[subtype] || '🏨';
}

// =============================================================================
// Airport Activity Icons
// =============================================================================

const AIRPORT_ACTIVITY_ICONS: Record<AirportActivityType, string> = {
  lounge: '🛋️',
  security: '🛂',
  checkin_counter: '🎫',
  boarding: '🚪',
};

/**
 * Get emoji icon for an airport activity type
 *
 * @param subtype - The airport activity type
 * @returns Emoji string
 *
 * @example
 * getAirportActivityIcon('lounge') // Returns "🛋️"
 * getAirportActivityIcon('security') // Returns "🛂"
 */
export function getAirportActivityIcon(subtype: AirportActivityType): string {
  return AIRPORT_ACTIVITY_ICONS[subtype] || '✈️';
}

// =============================================================================
// Airline Logos
// =============================================================================

const AIRLINE_LOGOS: Record<string, string> = {
  // US Airlines
  UA: '/airlines/united.svg',
  AA: '/airlines/american.svg',
  DL: '/airlines/delta.svg',
  WN: '/airlines/southwest.svg',
  B6: '/airlines/jetblue.svg',
  AS: '/airlines/alaska.svg',
  NK: '/airlines/spirit.svg',
  F9: '/airlines/frontier.svg',
  HA: '/airlines/hawaiian.svg',

  // European Airlines
  BA: '/airlines/british-airways.svg',
  AF: '/airlines/air-france.svg',
  LH: '/airlines/lufthansa.svg',
  KL: '/airlines/klm.svg',
  IB: '/airlines/iberia.svg',
  AZ: '/airlines/alitalia.svg',
  SK: '/airlines/sas.svg',
  AY: '/airlines/finnair.svg',
  LX: '/airlines/swiss.svg',
  OS: '/airlines/austrian.svg',

  // Asian Airlines
  NH: '/airlines/ana.svg',
  JL: '/airlines/jal.svg',
  CX: '/airlines/cathay-pacific.svg',
  SQ: '/airlines/singapore.svg',
  TG: '/airlines/thai.svg',
  KE: '/airlines/korean-air.svg',
  OZ: '/airlines/asiana.svg',
  CI: '/airlines/china-airlines.svg',
  BR: '/airlines/eva-air.svg',
  MH: '/airlines/malaysia.svg',

  // Middle East Airlines
  EK: '/airlines/emirates.svg',
  QR: '/airlines/qatar.svg',
  EY: '/airlines/etihad.svg',
  TK: '/airlines/turkish.svg',

  // Oceania Airlines
  QF: '/airlines/qantas.svg',
  NZ: '/airlines/air-new-zealand.svg',

  // Canadian Airlines
  AC: '/airlines/air-canada.svg',
  WS: '/airlines/westjet.svg',

  // Latin American Airlines
  LA: '/airlines/latam.svg',
  AM: '/airlines/aeromexico.svg',
  AV: '/airlines/avianca.svg',
};

/**
 * Get airline logo path for an airline code
 *
 * @param code - IATA airline code (e.g., "UA", "AA", "DL")
 * @returns Path to SVG logo or fallback path
 *
 * @example
 * getAirlineLogo('UA') // Returns "/airlines/united.svg"
 * getAirlineLogo('AA') // Returns "/airlines/american.svg"
 * getAirlineLogo('XX') // Returns "/airlines/default.svg"
 */
export function getAirlineLogo(code: string): string {
  const upperCode = code.toUpperCase();
  return AIRLINE_LOGOS[upperCode] || '/airlines/default.svg';
}

/**
 * Check if an airline logo exists for the given code
 *
 * @param code - IATA airline code
 * @returns Boolean indicating if a specific logo exists
 */
export function hasAirlineLogo(code: string): boolean {
  return code.toUpperCase() in AIRLINE_LOGOS;
}

// =============================================================================
// Weather Icons
// =============================================================================

const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  partly_cloudy: '⛅',
  rain: '🌧️',
  heavy_rain: '🌧️',
  thunderstorm: '⛈️',
  snow: '❄️',
  fog: '🌫️',
  wind: '💨',
  hot: '🥵',
  cold: '🥶',
};

/**
 * Get emoji icon for a weather condition
 *
 * @param condition - The weather condition
 * @returns Emoji string
 *
 * @example
 * getWeatherIcon('sunny') // Returns "☀️"
 * getWeatherIcon('rain') // Returns "🌧️"
 */
export function getWeatherIcon(condition: WeatherCondition | string): string {
  const normalizedCondition = condition.toLowerCase().replace(/\s+/g, '_') as WeatherCondition;
  return WEATHER_ICONS[normalizedCondition] || '🌤️';
}

// =============================================================================
// Travel Mode Icons
// =============================================================================

/**
 * Get icon component for a travel mode
 * Returns a React node with the appropriate Lucide icon
 *
 * @param mode - The travel mode
 * @param className - Optional CSS class for styling (default: "w-4 h-4")
 * @returns ReactNode with the icon
 *
 * @example
 * getTravelModeIcon('walk') // Returns <Footprints className="w-4 h-4" />
 * getTravelModeIcon('car', 'w-3 h-3')
 */
export function getTravelModeIcon(
  mode: TravelMode,
  className: string = 'w-4 h-4'
): ReactNode {
  const iconMap: Record<TravelMode, typeof Car> = {
    walk: Footprints,
    car: Car,
    transit: Train,
    taxi: Car, // Same icon as car, could use a different style via className
    bike: Bike,
  };

  const IconComponent = iconMap[mode] || Car;
  return createElement(IconComponent, { className });
}

/**
 * Get the Lucide icon component class for a travel mode
 * Useful when you need the component itself rather than a rendered element
 *
 * @param mode - The travel mode
 * @returns The Lucide icon component
 */
export function getTravelModeIconComponent(mode: TravelMode): typeof Car {
  const iconMap: Record<TravelMode, typeof Car> = {
    walk: Footprints,
    car: Car,
    transit: Train,
    taxi: Car,
    bike: Bike,
  };

  return iconMap[mode] || Car;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get display label for a travel mode
 *
 * @param mode - The travel mode
 * @returns Human-readable label
 */
export function getTravelModeLabel(mode: TravelMode): string {
  const labels: Record<TravelMode, string> = {
    walk: 'Walk',
    car: 'Drive',
    transit: 'Transit',
    taxi: 'Taxi',
    bike: 'Bike',
  };
  return labels[mode] || 'Travel';
}

/**
 * Get display label for a hotel activity type
 *
 * @param subtype - The hotel activity type
 * @returns Human-readable label
 */
export function getHotelActivityLabel(subtype: HotelActivityType): string {
  const labels: Record<HotelActivityType, string> = {
    check_in: 'Check In',
    checkout: 'Check Out',
    breakfast: 'Breakfast',
    pool: 'Pool',
    spa: 'Spa',
    gym: 'Gym',
    lounge: 'Lounge',
    get_ready: 'Get Ready',
    rest: 'Rest',
  };
  return labels[subtype] || 'Activity';
}

/**
 * Get display label for an airport activity type
 *
 * @param subtype - The airport activity type
 * @returns Human-readable label
 */
export function getAirportActivityLabel(subtype: AirportActivityType): string {
  const labels: Record<AirportActivityType, string> = {
    lounge: 'Airport Lounge',
    security: 'Security',
    checkin_counter: 'Check-in Counter',
    boarding: 'Boarding',
  };
  return labels[subtype] || 'Airport Activity';
}
