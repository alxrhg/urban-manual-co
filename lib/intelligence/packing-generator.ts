/**
 * Packing List Generator
 * Generates smart packing lists based on destination, weather, and planned activities
 */

import type { WeatherCondition, ActivityCategory } from './weather-service';

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Packing item category
 */
export type PackingCategory =
  | 'essentials'
  | 'clothing'
  | 'toiletries'
  | 'electronics'
  | 'documents'
  | 'health'
  | 'accessories'
  | 'activity_specific';

/**
 * A single packing item
 */
export interface PackingItem {
  /** Item name */
  name: string;
  /** Category for grouping */
  category: PackingCategory;
  /** Quantity to pack */
  quantity?: number;
  /** Why this item is recommended */
  reason?: string;
  /** Priority level */
  priority: 'essential' | 'recommended' | 'optional';
  /** Whether this is weather-dependent */
  isWeatherDependent?: boolean;
  /** Whether this is activity-dependent */
  isActivityDependent?: boolean;
}

/**
 * Grouped packing list
 */
export interface PackingList {
  /** Destination name */
  destination: string;
  /** Trip duration in days */
  durationDays: number;
  /** Grouped items by category */
  categories: Record<PackingCategory, PackingItem[]>;
  /** Weather-specific additions */
  weatherAdditions: PackingItem[];
  /** Activity-specific additions */
  activityAdditions: PackingItem[];
  /** Destination-specific notes */
  destinationNotes: string[];
}

/**
 * Weather summary for packing decisions
 */
export interface WeatherSummary {
  /** Average temperature in Celsius */
  avgTempC: number;
  /** Min temperature expected */
  minTempC: number;
  /** Max temperature expected */
  maxTempC: number;
  /** Expected conditions */
  conditions: ('sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy' | 'humid')[];
  /** UV index average */
  avgUvIndex?: number;
}

/**
 * Destination info for packing decisions
 */
export interface DestinationInfo {
  /** City/destination name */
  name: string;
  /** Country */
  country: string;
  /** Country/region code for power adapters */
  regionCode?: string;
  /** Whether destination uses different voltage */
  differentVoltage?: boolean;
  /** Local dress code considerations */
  dressCode?: 'casual' | 'smart_casual' | 'formal' | 'conservative';
  /** Whether there are religious site dress requirements */
  religiousSiteDressCode?: boolean;
}

/**
 * Activity type for packing decisions
 */
export type ActivityType =
  | 'dining_formal'
  | 'dining_casual'
  | 'beach'
  | 'hiking'
  | 'museum'
  | 'shopping'
  | 'nightlife'
  | 'business'
  | 'sightseeing'
  | 'water_sports'
  | 'winter_sports'
  | 'spa'
  | 'photography';

// =============================================================================
// Power Adapter Data
// =============================================================================

const POWER_ADAPTERS: Record<string, { type: string; voltage: string }> = {
  US: { type: 'Type A/B', voltage: '120V' },
  UK: { type: 'Type G', voltage: '230V' },
  EU: { type: 'Type C/F', voltage: '230V' },
  FR: { type: 'Type E', voltage: '230V' },
  DE: { type: 'Type F', voltage: '230V' },
  IT: { type: 'Type L', voltage: '230V' },
  ES: { type: 'Type C/F', voltage: '230V' },
  AU: { type: 'Type I', voltage: '230V' },
  JP: { type: 'Type A/B', voltage: '100V' },
  CN: { type: 'Type I/C', voltage: '220V' },
  IN: { type: 'Type D/M', voltage: '230V' },
  BR: { type: 'Type N', voltage: '127V/220V' },
  CH: { type: 'Type J', voltage: '230V' },
  HK: { type: 'Type G', voltage: '220V' },
  SG: { type: 'Type G', voltage: '230V' },
  TH: { type: 'Type A/B/C', voltage: '220V' },
  KR: { type: 'Type C/F', voltage: '220V' },
  MX: { type: 'Type A/B', voltage: '127V' },
};

// =============================================================================
// Base Packing Items
// =============================================================================

const BASE_ESSENTIALS: PackingItem[] = [
  { name: 'Passport', category: 'documents', priority: 'essential' },
  { name: 'ID/Driver\'s License', category: 'documents', priority: 'essential' },
  { name: 'Credit/Debit Cards', category: 'documents', priority: 'essential' },
  { name: 'Phone', category: 'electronics', priority: 'essential' },
  { name: 'Phone Charger', category: 'electronics', priority: 'essential' },
  { name: 'Wallet', category: 'essentials', priority: 'essential' },
  { name: 'Keys', category: 'essentials', priority: 'essential' },
];

const BASE_TOILETRIES: PackingItem[] = [
  { name: 'Toothbrush', category: 'toiletries', priority: 'essential' },
  { name: 'Toothpaste', category: 'toiletries', priority: 'essential' },
  { name: 'Deodorant', category: 'toiletries', priority: 'essential' },
  { name: 'Shampoo (travel size)', category: 'toiletries', priority: 'recommended' },
  { name: 'Conditioner (travel size)', category: 'toiletries', priority: 'optional' },
  { name: 'Face wash', category: 'toiletries', priority: 'recommended' },
  { name: 'Moisturizer', category: 'toiletries', priority: 'recommended' },
  { name: 'Razor', category: 'toiletries', priority: 'recommended' },
];

const BASE_HEALTH: PackingItem[] = [
  { name: 'Prescription medications', category: 'health', priority: 'essential', reason: 'Bring enough for trip + extra days' },
  { name: 'Pain reliever (Ibuprofen/Tylenol)', category: 'health', priority: 'recommended' },
  { name: 'Band-aids', category: 'health', priority: 'recommended' },
  { name: 'Hand sanitizer', category: 'health', priority: 'recommended' },
];

const BASE_ELECTRONICS: PackingItem[] = [
  { name: 'Phone charger', category: 'electronics', priority: 'essential' },
  { name: 'Portable battery pack', category: 'electronics', priority: 'recommended' },
  { name: 'Headphones', category: 'electronics', priority: 'recommended' },
];

// =============================================================================
// Main Generator Function
// =============================================================================

/**
 * Generate a comprehensive packing list based on destination, weather, and activities
 *
 * @example
 * const list = generatePackingList({
 *   destination: { name: 'Paris', country: 'France', regionCode: 'FR' },
 *   weather: { avgTempC: 12, minTempC: 8, maxTempC: 15, conditions: ['rainy'] },
 *   activities: ['dining_formal', 'museum', 'sightseeing'],
 *   durationDays: 5
 * });
 * // Returns: { categories: { clothing: [...], ... }, weatherAdditions: ['Umbrella', ...], ... }
 */
export function generatePackingList(options: {
  destination: DestinationInfo;
  weather: WeatherSummary;
  activities: ActivityType[];
  durationDays?: number;
}): PackingList {
  const { destination, weather, activities, durationDays = 7 } = options;

  // Initialize categories
  const categories: Record<PackingCategory, PackingItem[]> = {
    essentials: [],
    clothing: [],
    toiletries: [],
    electronics: [],
    documents: [],
    health: [],
    accessories: [],
    activity_specific: [],
  };

  // Add base items
  categories.documents = [...BASE_ESSENTIALS.filter(i => i.category === 'documents')];
  categories.essentials = [...BASE_ESSENTIALS.filter(i => i.category === 'essentials')];
  categories.electronics = [...BASE_ESSENTIALS.filter(i => i.category === 'electronics'), ...BASE_ELECTRONICS];
  categories.toiletries = [...BASE_TOILETRIES];
  categories.health = [...BASE_HEALTH];

  // Calculate clothing based on duration
  categories.clothing = calculateClothing(durationDays, weather, destination.dressCode);

  // Add power adapter if needed
  const adapterItem = getAdapterItem(destination.regionCode);
  if (adapterItem) {
    categories.electronics.push(adapterItem);
  }

  // Weather-specific additions
  const weatherAdditions = getWeatherItems(weather);

  // Activity-specific additions
  const activityAdditions = getActivityItems(activities, weather);

  // Add activity items to the activity_specific category
  categories.activity_specific = activityAdditions;

  // Destination-specific notes
  const destinationNotes = getDestinationNotes(destination, activities);

  return {
    destination: destination.name,
    durationDays,
    categories,
    weatherAdditions,
    activityAdditions,
    destinationNotes,
  };
}

/**
 * Generate a simple packing list from minimal inputs
 * Convenience function for quick recommendations
 *
 * @example
 * const items = generateSimplePackingList('Paris', 'Rainy', ['Dinner', 'Museums']);
 * // Returns: ['Umbrella', 'Formal Wear', 'Adapter (Type E)', ...]
 */
export function generateSimplePackingList(
  destination: string,
  weatherCondition: string,
  activities: string[]
): string[] {
  const items: string[] = [];

  // Parse weather condition
  const lowerWeather = weatherCondition.toLowerCase();

  if (lowerWeather.includes('rain') || lowerWeather.includes('wet')) {
    items.push('Umbrella');
    items.push('Waterproof Jacket');
    items.push('Waterproof Bag Cover');
  }

  if (lowerWeather.includes('cold') || lowerWeather.includes('winter')) {
    items.push('Warm Coat');
    items.push('Scarf');
    items.push('Gloves');
    items.push('Warm Layers');
  }

  if (lowerWeather.includes('hot') || lowerWeather.includes('summer') || lowerWeather.includes('warm')) {
    items.push('Sunscreen');
    items.push('Sunglasses');
    items.push('Hat');
    items.push('Light Breathable Clothing');
  }

  if (lowerWeather.includes('sun') || lowerWeather.includes('clear')) {
    items.push('Sunscreen');
    items.push('Sunglasses');
  }

  // Parse activities
  for (const activity of activities) {
    const lowerActivity = activity.toLowerCase();

    if (lowerActivity.includes('dinner') || lowerActivity.includes('formal') || lowerActivity.includes('restaurant')) {
      items.push('Formal Wear');
      items.push('Dress Shoes');
    }

    if (lowerActivity.includes('beach') || lowerActivity.includes('swim')) {
      items.push('Swimsuit');
      items.push('Beach Towel');
      items.push('Flip Flops');
    }

    if (lowerActivity.includes('hik') || lowerActivity.includes('walk') || lowerActivity.includes('outdoor')) {
      items.push('Comfortable Walking Shoes');
      items.push('Daypack');
    }

    if (lowerActivity.includes('museum') || lowerActivity.includes('gallery')) {
      items.push('Comfortable Walking Shoes');
    }

    if (lowerActivity.includes('business') || lowerActivity.includes('meeting')) {
      items.push('Business Attire');
      items.push('Laptop');
    }

    if (lowerActivity.includes('photo')) {
      items.push('Camera');
      items.push('Extra Memory Card');
      items.push('Camera Charger');
    }
  }

  // Destination-specific - try to detect European destinations
  const europeanCountries = ['france', 'paris', 'germany', 'berlin', 'italy', 'rome', 'spain', 'madrid', 'barcelona'];
  const ukCountries = ['uk', 'london', 'england', 'scotland', 'ireland'];
  const asiaCountries = ['japan', 'tokyo', 'china', 'beijing', 'korea', 'seoul', 'thailand', 'bangkok', 'singapore'];

  const lowerDest = destination.toLowerCase();

  if (europeanCountries.some(c => lowerDest.includes(c))) {
    items.push('Adapter (Type C/E/F)');
  } else if (ukCountries.some(c => lowerDest.includes(c))) {
    items.push('Adapter (Type G)');
  } else if (asiaCountries.some(c => lowerDest.includes(c))) {
    if (lowerDest.includes('japan')) {
      items.push('Adapter (Type A/B)');
    } else if (lowerDest.includes('china')) {
      items.push('Adapter (Type I/C)');
    } else {
      items.push('Universal Adapter');
    }
  }

  // Remove duplicates
  return [...new Set(items)];
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateClothing(
  days: number,
  weather: WeatherSummary,
  dressCode?: 'casual' | 'smart_casual' | 'formal' | 'conservative'
): PackingItem[] {
  const items: PackingItem[] = [];

  // Calculate quantities (generally pack for 4-5 days max, plan to do laundry)
  const effectiveDays = Math.min(days, 5);
  const underwearCount = Math.min(days + 1, 8); // Extra underwear, max 8
  const sockCount = Math.min(days + 1, 7);
  const topCount = effectiveDays;
  const bottomCount = Math.ceil(effectiveDays / 2);

  items.push(
    { name: 'Underwear', category: 'clothing', quantity: underwearCount, priority: 'essential' },
    { name: 'Socks', category: 'clothing', quantity: sockCount, priority: 'essential' },
    { name: 'Sleepwear', category: 'clothing', quantity: 1, priority: 'recommended' }
  );

  // Temperature-based clothing
  if (weather.avgTempC < 15) {
    // Cold weather
    items.push(
      { name: 'Long-sleeve shirts/sweaters', category: 'clothing', quantity: topCount, priority: 'essential' },
      { name: 'Pants/jeans', category: 'clothing', quantity: bottomCount, priority: 'essential' },
      { name: 'Warm jacket/coat', category: 'clothing', quantity: 1, priority: 'essential' },
      { name: 'Warm layers (fleece/cardigan)', category: 'clothing', quantity: 2, priority: 'recommended' }
    );
  } else if (weather.avgTempC >= 15 && weather.avgTempC < 25) {
    // Mild weather
    items.push(
      { name: 'T-shirts/casual tops', category: 'clothing', quantity: topCount, priority: 'essential' },
      { name: 'Light long-sleeve', category: 'clothing', quantity: 2, priority: 'recommended' },
      { name: 'Pants/jeans', category: 'clothing', quantity: bottomCount - 1, priority: 'essential' },
      { name: 'Shorts/skirts', category: 'clothing', quantity: 1, priority: 'optional' },
      { name: 'Light jacket/cardigan', category: 'clothing', quantity: 1, priority: 'recommended' }
    );
  } else {
    // Warm/hot weather
    items.push(
      { name: 'T-shirts/tank tops', category: 'clothing', quantity: topCount, priority: 'essential' },
      { name: 'Shorts/skirts', category: 'clothing', quantity: bottomCount, priority: 'essential' },
      { name: 'Light pants', category: 'clothing', quantity: 1, priority: 'recommended' },
      { name: 'Light cardigan (for AC)', category: 'clothing', quantity: 1, priority: 'optional' }
    );
  }

  // Footwear
  items.push(
    { name: 'Comfortable walking shoes', category: 'clothing', quantity: 1, priority: 'essential' }
  );

  // Dress code additions
  if (dressCode === 'formal' || dressCode === 'smart_casual') {
    items.push(
      { name: 'Dress shirt/blouse', category: 'clothing', quantity: 1, priority: 'recommended' },
      { name: 'Dress pants/skirt', category: 'clothing', quantity: 1, priority: 'recommended' },
      { name: 'Dress shoes', category: 'clothing', quantity: 1, priority: 'recommended' }
    );
  }

  if (dressCode === 'conservative') {
    items.push(
      { name: 'Modest clothing (covered shoulders/knees)', category: 'clothing', priority: 'essential', reason: 'Required for religious sites' }
    );
  }

  return items;
}

function getWeatherItems(weather: WeatherSummary): PackingItem[] {
  const items: PackingItem[] = [];

  // Rain gear
  if (weather.conditions.includes('rainy')) {
    items.push(
      { name: 'Umbrella', category: 'accessories', priority: 'essential', isWeatherDependent: true },
      { name: 'Waterproof jacket', category: 'clothing', priority: 'recommended', isWeatherDependent: true },
      { name: 'Waterproof bag/backpack cover', category: 'accessories', priority: 'optional', isWeatherDependent: true }
    );
  }

  // Sun protection
  if (weather.conditions.includes('sunny') || (weather.avgUvIndex && weather.avgUvIndex >= 6)) {
    items.push(
      { name: 'Sunscreen SPF 30+', category: 'toiletries', priority: 'essential', isWeatherDependent: true },
      { name: 'Sunglasses', category: 'accessories', priority: 'essential', isWeatherDependent: true },
      { name: 'Hat/cap', category: 'accessories', priority: 'recommended', isWeatherDependent: true }
    );
  }

  // Cold weather
  if (weather.minTempC < 10) {
    items.push(
      { name: 'Warm coat', category: 'clothing', priority: 'essential', isWeatherDependent: true },
      { name: 'Scarf', category: 'accessories', priority: 'recommended', isWeatherDependent: true },
      { name: 'Gloves', category: 'accessories', priority: 'recommended', isWeatherDependent: true }
    );
  }

  if (weather.minTempC < 5) {
    items.push(
      { name: 'Thermal underwear', category: 'clothing', priority: 'recommended', isWeatherDependent: true },
      { name: 'Warm hat/beanie', category: 'accessories', priority: 'recommended', isWeatherDependent: true }
    );
  }

  // Snow
  if (weather.conditions.includes('snowy')) {
    items.push(
      { name: 'Waterproof boots', category: 'clothing', priority: 'essential', isWeatherDependent: true },
      { name: 'Warm waterproof gloves', category: 'accessories', priority: 'essential', isWeatherDependent: true }
    );
  }

  // Humid conditions
  if (weather.conditions.includes('humid')) {
    items.push(
      { name: 'Moisture-wicking clothing', category: 'clothing', priority: 'recommended', isWeatherDependent: true },
      { name: 'Anti-chafing products', category: 'toiletries', priority: 'optional', isWeatherDependent: true }
    );
  }

  return items;
}

function getActivityItems(activities: ActivityType[], weather: WeatherSummary): PackingItem[] {
  const items: PackingItem[] = [];
  const addedItems = new Set<string>();

  const addItem = (item: PackingItem) => {
    if (!addedItems.has(item.name)) {
      addedItems.add(item.name);
      items.push(item);
    }
  };

  for (const activity of activities) {
    switch (activity) {
      case 'dining_formal':
        addItem({ name: 'Formal outfit', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Dress shoes', category: 'clothing', priority: 'essential', isActivityDependent: true });
        break;

      case 'beach':
        addItem({ name: 'Swimsuit', category: 'clothing', quantity: 2, priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Beach towel', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Flip flops/sandals', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Beach bag', category: 'accessories', priority: 'optional', isActivityDependent: true });
        addItem({ name: 'Sunscreen SPF 50', category: 'toiletries', priority: 'essential', isActivityDependent: true });
        break;

      case 'hiking':
        addItem({ name: 'Hiking boots/shoes', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Daypack/backpack', category: 'accessories', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Water bottle', category: 'accessories', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Trail snacks', category: 'essentials', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Moisture-wicking socks', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        break;

      case 'museum':
      case 'sightseeing':
        addItem({ name: 'Comfortable walking shoes', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Small crossbody bag', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        break;

      case 'nightlife':
        addItem({ name: 'Going-out outfit', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        break;

      case 'business':
        addItem({ name: 'Business attire', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Laptop', category: 'electronics', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Laptop charger', category: 'electronics', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Business cards', category: 'documents', priority: 'recommended', isActivityDependent: true });
        break;

      case 'water_sports':
        addItem({ name: 'Rash guard', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Water shoes', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Waterproof phone case', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Dry bag', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        break;

      case 'winter_sports':
        addItem({ name: 'Ski/snow pants', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Thermal base layers', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Ski socks', category: 'clothing', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Goggles', category: 'accessories', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Hand/toe warmers', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        break;

      case 'spa':
        addItem({ name: 'Flip flops for spa', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Swimsuit (for pools/saunas)', category: 'clothing', priority: 'recommended', isActivityDependent: true });
        break;

      case 'photography':
        addItem({ name: 'Camera', category: 'electronics', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Camera charger', category: 'electronics', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Extra memory cards', category: 'electronics', priority: 'essential', isActivityDependent: true });
        addItem({ name: 'Camera bag', category: 'accessories', priority: 'recommended', isActivityDependent: true });
        addItem({ name: 'Tripod (compact)', category: 'electronics', priority: 'optional', isActivityDependent: true });
        break;
    }
  }

  return items;
}

function getAdapterItem(regionCode?: string): PackingItem | null {
  if (!regionCode) return null;

  const adapterInfo = POWER_ADAPTERS[regionCode.toUpperCase()];
  if (!adapterInfo) return null;

  // Check if different from US standard
  if (regionCode.toUpperCase() === 'US') return null;

  return {
    name: `Power Adapter (${adapterInfo.type})`,
    category: 'electronics',
    priority: 'essential',
    reason: `Required for ${adapterInfo.voltage} outlets`,
  };
}

function getDestinationNotes(destination: DestinationInfo, activities: ActivityType[]): string[] {
  const notes: string[] = [];

  // Voltage warning
  if (destination.differentVoltage) {
    notes.push('Check that electronics support dual voltage (100-240V) or bring a converter');
  }

  // Dress code notes
  if (destination.dressCode === 'conservative') {
    notes.push('Conservative dress expected - cover shoulders and knees');
  }

  if (destination.religiousSiteDressCode) {
    notes.push('Religious sites require modest dress - bring a cover-up or scarf');
  }

  // Activity-specific notes
  if (activities.includes('dining_formal')) {
    notes.push('Some restaurants have dress codes - check ahead for specific requirements');
  }

  if (activities.includes('hiking')) {
    notes.push('Break in hiking shoes before the trip');
  }

  return notes;
}

/**
 * Convert PackingList to flat array of item names
 */
export function flattenPackingList(list: PackingList): string[] {
  const items: string[] = [];

  for (const category of Object.values(list.categories)) {
    for (const item of category) {
      if (item.quantity && item.quantity > 1) {
        items.push(`${item.name} (x${item.quantity})`);
      } else {
        items.push(item.name);
      }
    }
  }

  return [...new Set(items)];
}

/**
 * Get essential items only
 */
export function getEssentialItems(list: PackingList): PackingItem[] {
  const essentials: PackingItem[] = [];

  for (const category of Object.values(list.categories)) {
    for (const item of category) {
      if (item.priority === 'essential') {
        essentials.push(item);
      }
    }
  }

  return essentials;
}
