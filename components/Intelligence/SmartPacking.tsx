'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Backpack,
  Check,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Sun,
  Snowflake,
  Wind,
  UtensilsCrossed,
  Camera,
  Dumbbell,
  Waves,
  Mountain,
  TreePine,
  Landmark,
  Building2,
  ShoppingBag,
  Shirt,
  Footprints,
} from 'lucide-react';

// Types
interface WeatherData {
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  hasRain: boolean;
  hasSnow: boolean;
  isWindy: boolean;
  humidity: number;
}

interface ActivityCategory {
  type: string;
  count: number;
}

interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
  icon?: React.ReactNode;
}

type PackingCategory =
  | 'clothing'
  | 'outerwear'
  | 'footwear'
  | 'accessories'
  | 'toiletries'
  | 'electronics'
  | 'documents'
  | 'activity';

interface SmartPackingProps {
  weatherData?: WeatherData | null;
  activities?: ActivityCategory[];
  tripDuration?: number;
  destination?: string;
  className?: string;
}

// Packing rules based on weather
const WEATHER_PACKING_RULES: Array<{
  condition: (weather: WeatherData) => boolean;
  items: Omit<PackingItem, 'id'>[];
}> = [
  {
    condition: (w) => w.hasRain,
    items: [
      {
        name: 'Umbrella',
        category: 'accessories',
        reason: 'Rain expected',
        priority: 'essential',
        icon: <CloudRain className="w-4 h-4" />,
      },
      {
        name: 'Rain jacket',
        category: 'outerwear',
        reason: 'Rain expected',
        priority: 'essential',
        icon: <CloudRain className="w-4 h-4" />,
      },
      {
        name: 'Waterproof bag',
        category: 'accessories',
        reason: 'Protect electronics',
        priority: 'recommended',
      },
    ],
  },
  {
    condition: (w) => w.hasSnow,
    items: [
      {
        name: 'Warm boots',
        category: 'footwear',
        reason: 'Snow expected',
        priority: 'essential',
        icon: <Snowflake className="w-4 h-4" />,
      },
      {
        name: 'Thermal underwear',
        category: 'clothing',
        reason: 'Cold weather',
        priority: 'essential',
      },
      {
        name: 'Gloves',
        category: 'accessories',
        reason: 'Snow expected',
        priority: 'essential',
        icon: <Snowflake className="w-4 h-4" />,
      },
      {
        name: 'Beanie/warm hat',
        category: 'accessories',
        reason: 'Cold weather',
        priority: 'essential',
      },
    ],
  },
  {
    condition: (w) => w.minTemp < 10,
    items: [
      {
        name: 'Warm jacket',
        category: 'outerwear',
        reason: 'Cool temperatures',
        priority: 'essential',
      },
      {
        name: 'Layers (sweater/fleece)',
        category: 'clothing',
        reason: 'Cool temperatures',
        priority: 'recommended',
      },
      {
        name: 'Long pants',
        category: 'clothing',
        reason: 'Cool temperatures',
        priority: 'essential',
      },
    ],
  },
  {
    condition: (w) => w.maxTemp > 25,
    items: [
      {
        name: 'Sunscreen',
        category: 'toiletries',
        reason: 'Warm & sunny',
        priority: 'essential',
        icon: <Sun className="w-4 h-4" />,
      },
      {
        name: 'Sunglasses',
        category: 'accessories',
        reason: 'Warm & sunny',
        priority: 'essential',
        icon: <Sun className="w-4 h-4" />,
      },
      {
        name: 'Light, breathable clothing',
        category: 'clothing',
        reason: 'Warm weather',
        priority: 'essential',
      },
      {
        name: 'Hat/cap',
        category: 'accessories',
        reason: 'Sun protection',
        priority: 'recommended',
      },
      {
        name: 'Reusable water bottle',
        category: 'accessories',
        reason: 'Stay hydrated',
        priority: 'recommended',
      },
    ],
  },
  {
    condition: (w) => w.isWindy,
    items: [
      {
        name: 'Windbreaker',
        category: 'outerwear',
        reason: 'Windy conditions',
        priority: 'recommended',
        icon: <Wind className="w-4 h-4" />,
      },
    ],
  },
  {
    condition: (w) => w.humidity > 70,
    items: [
      {
        name: 'Anti-humidity hair products',
        category: 'toiletries',
        reason: 'High humidity',
        priority: 'optional',
      },
      {
        name: 'Quick-dry clothing',
        category: 'clothing',
        reason: 'High humidity',
        priority: 'recommended',
      },
    ],
  },
];

// Packing rules based on activity categories
const ACTIVITY_PACKING_RULES: Record<string, Omit<PackingItem, 'id'>[]> = {
  beach: [
    {
      name: 'Swimwear',
      category: 'clothing',
      reason: 'Beach activities',
      priority: 'essential',
      icon: <Waves className="w-4 h-4" />,
    },
    {
      name: 'Beach towel',
      category: 'accessories',
      reason: 'Beach activities',
      priority: 'essential',
    },
    {
      name: 'Flip flops/sandals',
      category: 'footwear',
      reason: 'Beach activities',
      priority: 'essential',
    },
    {
      name: 'Beach bag',
      category: 'accessories',
      reason: 'Beach activities',
      priority: 'recommended',
    },
  ],
  pool: [
    {
      name: 'Swimwear',
      category: 'clothing',
      reason: 'Pool activities',
      priority: 'essential',
      icon: <Waves className="w-4 h-4" />,
    },
    {
      name: 'Swim goggles',
      category: 'accessories',
      reason: 'Pool activities',
      priority: 'optional',
    },
  ],
  hiking: [
    {
      name: 'Hiking boots',
      category: 'footwear',
      reason: 'Hiking planned',
      priority: 'essential',
      icon: <Mountain className="w-4 h-4" />,
    },
    {
      name: 'Hiking socks',
      category: 'clothing',
      reason: 'Hiking planned',
      priority: 'essential',
    },
    {
      name: 'Daypack/backpack',
      category: 'accessories',
      reason: 'Hiking planned',
      priority: 'essential',
    },
    {
      name: 'First aid kit',
      category: 'accessories',
      reason: 'Hiking safety',
      priority: 'recommended',
    },
    {
      name: 'Trail snacks',
      category: 'activity',
      reason: 'Hiking energy',
      priority: 'recommended',
    },
  ],
  outdoor: [
    {
      name: 'Comfortable walking shoes',
      category: 'footwear',
      reason: 'Outdoor activities',
      priority: 'essential',
      icon: <TreePine className="w-4 h-4" />,
    },
    {
      name: 'Daypack',
      category: 'accessories',
      reason: 'Outdoor activities',
      priority: 'recommended',
    },
  ],
  restaurant: [
    {
      name: 'Smart casual outfit',
      category: 'clothing',
      reason: 'Dining out',
      priority: 'recommended',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
  ],
  'fine dining': [
    {
      name: 'Formal attire',
      category: 'clothing',
      reason: 'Fine dining reservations',
      priority: 'essential',
      icon: <UtensilsCrossed className="w-4 h-4" />,
    },
    {
      name: 'Dress shoes',
      category: 'footwear',
      reason: 'Fine dining dress code',
      priority: 'essential',
    },
  ],
  museum: [
    {
      name: 'Comfortable walking shoes',
      category: 'footwear',
      reason: 'Museum visits',
      priority: 'essential',
      icon: <Landmark className="w-4 h-4" />,
    },
  ],
  gallery: [
    {
      name: 'Comfortable walking shoes',
      category: 'footwear',
      reason: 'Gallery visits',
      priority: 'essential',
      icon: <Landmark className="w-4 h-4" />,
    },
  ],
  spa: [
    {
      name: 'Comfortable loungewear',
      category: 'clothing',
      reason: 'Spa day',
      priority: 'recommended',
    },
  ],
  gym: [
    {
      name: 'Workout clothes',
      category: 'clothing',
      reason: 'Gym access',
      priority: 'recommended',
      icon: <Dumbbell className="w-4 h-4" />,
    },
    {
      name: 'Athletic shoes',
      category: 'footwear',
      reason: 'Gym access',
      priority: 'recommended',
    },
  ],
  shopping: [
    {
      name: 'Foldable tote bag',
      category: 'accessories',
      reason: 'Shopping planned',
      priority: 'recommended',
      icon: <ShoppingBag className="w-4 h-4" />,
    },
    {
      name: 'Comfortable shoes',
      category: 'footwear',
      reason: 'Walking around shops',
      priority: 'recommended',
    },
  ],
  photography: [
    {
      name: 'Camera/photography gear',
      category: 'electronics',
      reason: 'Photo opportunities',
      priority: 'essential',
      icon: <Camera className="w-4 h-4" />,
    },
    {
      name: 'Extra memory cards',
      category: 'electronics',
      reason: 'Photo storage',
      priority: 'recommended',
    },
    {
      name: 'Portable charger',
      category: 'electronics',
      reason: 'Device charging',
      priority: 'recommended',
    },
  ],
  city: [
    {
      name: 'City walking shoes',
      category: 'footwear',
      reason: 'Urban exploration',
      priority: 'essential',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      name: 'Crossbody bag',
      category: 'accessories',
      reason: 'Secure city bag',
      priority: 'recommended',
    },
  ],
};

// Essential items for any trip
const ESSENTIAL_ITEMS: Omit<PackingItem, 'id'>[] = [
  {
    name: 'Passport/ID',
    category: 'documents',
    reason: 'Travel essential',
    priority: 'essential',
  },
  {
    name: 'Phone charger',
    category: 'electronics',
    reason: 'Stay connected',
    priority: 'essential',
  },
  {
    name: 'Medications',
    category: 'toiletries',
    reason: 'Health essentials',
    priority: 'essential',
  },
  {
    name: 'Toothbrush & toiletries',
    category: 'toiletries',
    reason: 'Daily hygiene',
    priority: 'essential',
  },
];

const CATEGORY_ICONS: Record<PackingCategory, React.ReactNode> = {
  clothing: <Shirt className="w-4 h-4" />,
  outerwear: <Shirt className="w-4 h-4" />,
  footwear: <Footprints className="w-4 h-4" />,
  accessories: <Backpack className="w-4 h-4" />,
  toiletries: <ShoppingBag className="w-4 h-4" />,
  electronics: <Camera className="w-4 h-4" />,
  documents: <Landmark className="w-4 h-4" />,
  activity: <Mountain className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<PackingCategory, string> = {
  clothing: 'Clothing',
  outerwear: 'Outerwear',
  footwear: 'Footwear',
  accessories: 'Accessories',
  toiletries: 'Toiletries',
  electronics: 'Electronics',
  documents: 'Documents',
  activity: 'Activity Gear',
};

export default function SmartPacking({
  weatherData,
  activities = [],
  tripDuration = 3,
  destination,
  className = '',
}: SmartPackingProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(
    new Set(['clothing', 'accessories'])
  );

  // Generate smart packing list
  const packingList = useMemo(() => {
    const items: PackingItem[] = [];
    const addedNames = new Set<string>();

    const addItem = (item: Omit<PackingItem, 'id'>) => {
      if (!addedNames.has(item.name.toLowerCase())) {
        addedNames.add(item.name.toLowerCase());
        items.push({
          ...item,
          id: `${item.category}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        });
      }
    };

    // Add essential items
    ESSENTIAL_ITEMS.forEach(addItem);

    // Add weather-based items
    if (weatherData) {
      WEATHER_PACKING_RULES.forEach((rule) => {
        if (rule.condition(weatherData)) {
          rule.items.forEach(addItem);
        }
      });
    }

    // Add activity-based items
    activities.forEach((activity) => {
      const activityType = activity.type.toLowerCase();

      // Check exact match first
      if (ACTIVITY_PACKING_RULES[activityType]) {
        ACTIVITY_PACKING_RULES[activityType].forEach(addItem);
      }

      // Check partial matches
      Object.keys(ACTIVITY_PACKING_RULES).forEach((key) => {
        if (activityType.includes(key) || key.includes(activityType)) {
          ACTIVITY_PACKING_RULES[key].forEach(addItem);
        }
      });
    });

    // Add trip duration based items
    if (tripDuration > 5) {
      addItem({
        name: 'Laundry bag',
        category: 'accessories',
        reason: `${tripDuration}+ day trip`,
        priority: 'recommended',
      });
    }

    return items;
  }, [weatherData, activities, tripDuration]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<PackingCategory, PackingItem[]> = {
      clothing: [],
      outerwear: [],
      footwear: [],
      accessories: [],
      toiletries: [],
      electronics: [],
      documents: [],
      activity: [],
    };

    packingList.forEach((item) => {
      groups[item.category].push(item);
    });

    // Sort each category by priority
    const priorityOrder = { essential: 0, recommended: 1, optional: 2 };
    Object.keys(groups).forEach((key) => {
      groups[key as PackingCategory].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    });

    return groups;
  }, [packingList]);

  const toggleItem = useCallback((itemId: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback((category: PackingCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Stats
  const totalItems = packingList.length;
  const checkedCount = checkedItems.size;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  // Categories with items
  const activeCategories = (Object.keys(groupedItems) as PackingCategory[]).filter(
    (cat) => groupedItems[cat].length > 0
  );

  if (packingList.length === 0) {
    return (
      <div
        className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 p-6 ${className}`}
      >
        <div className="text-center py-4">
          <Backpack className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-xs text-stone-500">
            Add trip details to generate smart packing suggestions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-200/50 dark:border-stone-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400/20 to-purple-400/20 flex items-center justify-center">
              <Backpack className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-stone-900 dark:text-white">
                Smart Packing List
              </h3>
              {destination && (
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  Curated for {destination}
                </p>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              {checkedCount}/{totalItems}
            </span>
          </div>
        </div>
      </div>

      {/* Category sections */}
      <div className="divide-y divide-stone-200/50 dark:divide-stone-700/50">
        {activeCategories.map((category) => {
          const items = groupedItems[category];
          const isExpanded = expandedCategories.has(category);
          const categoryChecked = items.filter((item) => checkedItems.has(item.id)).length;

          return (
            <div key={category}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 dark:text-stone-500">
                    {CATEGORY_ICONS[category]}
                  </span>
                  <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-stone-500">
                    ({categoryChecked}/{items.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stone-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400" />
                )}
              </button>

              {/* Items list */}
              {isExpanded && (
                <div className="px-5 pb-3 space-y-1">
                  {items.map((item) => {
                    const isChecked = checkedItems.has(item.id);

                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleItem(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                          isChecked
                            ? 'bg-stone-100 dark:bg-stone-800/70'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-stone-300 dark:border-stone-600'
                          }`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>

                        {/* Item content */}
                        <div className="flex-1 min-w-0 text-left">
                          <p
                            className={`text-xs transition-all ${
                              isChecked
                                ? 'text-stone-400 dark:text-stone-500 line-through'
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {item.name}
                          </p>
                        </div>

                        {/* Reason badge */}
                        <span
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${
                            item.priority === 'essential'
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300'
                              : item.priority === 'recommended'
                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                                : 'bg-stone-50 dark:bg-stone-800/50 text-stone-400 dark:text-stone-500'
                          }`}
                        >
                          {item.icon && (
                            <span className="opacity-70">{item.icon}</span>
                          )}
                          <span>{item.reason}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-stone-200/50 dark:border-stone-700/50 bg-stone-50/50 dark:bg-stone-800/30">
        <p className="text-[10px] text-stone-400 dark:text-stone-500 text-center">
          Suggestions based on weather & activities
        </p>
      </div>
    </div>
  );
}

/**
 * Utility function to analyze itinerary and extract activity categories
 */
export function analyzeItineraryForPacking(
  items: Array<{
    category?: string;
    title?: string;
    destination?: { category?: string } | null;
  }>
): ActivityCategory[] {
  const categoryCount: Record<string, number> = {};

  items.forEach((item) => {
    const category =
      item.category ||
      item.destination?.category ||
      '';

    if (category) {
      const normalizedCategory = category.toLowerCase();
      categoryCount[normalizedCategory] = (categoryCount[normalizedCategory] || 0) + 1;
    }

    // Also check title for activity hints
    const title = (item.title || '').toLowerCase();
    const activityKeywords = [
      'beach',
      'hiking',
      'pool',
      'spa',
      'gym',
      'shopping',
      'museum',
      'gallery',
      'restaurant',
      'photography',
    ];

    activityKeywords.forEach((keyword) => {
      if (title.includes(keyword)) {
        categoryCount[keyword] = (categoryCount[keyword] || 0) + 1;
      }
    });
  });

  return Object.entries(categoryCount).map(([type, count]) => ({
    type,
    count,
  }));
}

/**
 * Utility function to convert weather forecast to WeatherData format
 */
export function convertWeatherForecast(
  forecast: Array<{
    temp: { min: number; max: number };
    precipitation: number;
    precipitationProbability?: number;
    windSpeed: number;
    humidity: number;
    icon: string;
  }>
): WeatherData | null {
  if (!forecast || forecast.length === 0) return null;

  const temps = forecast.map((d) => d.temp.max);
  const minTemps = forecast.map((d) => d.temp.min);

  return {
    avgTemp: Math.round(temps.reduce((a, b) => a + b, 0) / temps.length),
    minTemp: Math.min(...minTemps),
    maxTemp: Math.max(...temps),
    hasRain: forecast.some(
      (d) => (d.precipitationProbability ?? 0) > 40 || d.precipitation > 2
    ),
    hasSnow: forecast.some((d) => d.icon === 'snow'),
    isWindy: forecast.some((d) => d.windSpeed > 30),
    humidity: Math.round(
      forecast.reduce((a, b) => a + b.humidity, 0) / forecast.length
    ),
  };
}
