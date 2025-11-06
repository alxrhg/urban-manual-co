# Priority Features Implementation Guide
## Detailed Technical Implementation for Selected Algorithm Improvements

**Created:** November 6, 2025
**Status:** Implementation Ready
**Branch:** `claude/plan-algorithm-improvements-011CUqn7editiJNCzzsdehBm`

---

## Overview

This document provides detailed, step-by-step implementation instructions for the priority features approved for development. Each feature includes database schema, API endpoints, service logic, and UI integration.

---

## Table of Contents

1. [Free/Low-Cost Data Sources](#1-freelow-cost-data-sources)
2. [Weather-Based Intelligence](#2-weather-based-intelligence)
3. [Event-Based Opportunities](#3-event-based-opportunities)
4. [Category Affinity Learning](#4-category-affinity-learning)
5. [Collaborative Filtering Enhancement](#5-collaborative-filtering-enhancement)
6. [Geographic Intelligence](#6-geographic-intelligence)
7. [Demand Forecasting](#7-demand-forecasting)
8. [Social Momentum Tracking](#8-social-momentum-tracking)
9. [Auto-Generated Discovery Prompts](#9-auto-generated-discovery-prompts)
10. [Knowledge Graph](#10-knowledge-graph)
11. [Multi-Signal Hybrid Scoring](#11-multi-signal-hybrid-scoring)

---

## 1. Free/Low-Cost Data Sources

### 1.1 Weather Intelligence (Open-Meteo)

**Status:** ✅ Already integrated (`/lib/enrichment/weather.ts`)
**Cost:** FREE
**Goal:** Better utilize existing weather data in recommendations

#### Implementation Steps:

**A. Add Weather Context to Recommendations**

**File:** `/lib/recommendations.ts`

```typescript
import { getCurrentWeather } from './enrichment/weather';

interface WeatherContext {
  isRainy: boolean;
  isSunny: boolean;
  temperature: number;
  conditions: string;
}

async function getWeatherContext(city: string): Promise<WeatherContext | null> {
  try {
    // Get city coordinates from destinations
    const cityCoords = await getCityCoordinates(city);
    if (!cityCoords) return null;

    const weather = await getCurrentWeather(cityCoords.lat, cityCoords.lng);

    return {
      isRainy: [61, 63, 65, 80, 81, 82].includes(weather.weatherCode),
      isSunny: [0, 1, 2].includes(weather.weatherCode),
      temperature: weather.temperature,
      conditions: weather.description
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

function applyWeatherBoost(
  destination: Destination,
  weather: WeatherContext
): number {
  let boost = 0;

  // Rainy day indoor boost
  if (weather.isRainy) {
    if (destination.category === 'museum' ||
        destination.category === 'gallery' ||
        destination.indoor_seating === true) {
      boost += 0.15;
    }
    // Penalize outdoor-only venues
    if (destination.outdoor_seating === true && !destination.indoor_seating) {
      boost -= 0.1;
    }
  }

  // Sunny day outdoor boost
  if (weather.isSunny && weather.temperature > 18) {
    if (destination.outdoor_seating === true ||
        destination.category === 'rooftop bar' ||
        destination.tags?.includes('outdoor')) {
      boost += 0.15;
    }
  }

  // Hot day cooling options
  if (weather.temperature > 28) {
    if (destination.category === 'ice cream' ||
        destination.category === 'cafe' ||
        destination.tags?.includes('air-conditioned')) {
      boost += 0.1;
    }
  }

  // Cold day cozy boost
  if (weather.temperature < 10) {
    if (destination.tags?.includes('cozy') ||
        destination.tags?.includes('fireplace') ||
        destination.category === 'cafe') {
      boost += 0.1;
    }
  }

  return boost;
}

// Update getHybridRecommendations to include weather
export async function getHybridRecommendations(
  userId: string | null,
  city: string,
  limit: number = 20
): Promise<Destination[]> {
  const weather = await getWeatherContext(city);

  // ... existing recommendation logic ...

  // Apply weather boost to each destination
  const scoredDestinations = destinations.map(dest => ({
    ...dest,
    weatherBoost: weather ? applyWeatherBoost(dest, weather) : 0
  }));

  // Re-sort with weather boost
  return scoredDestinations
    .sort((a, b) => {
      const scoreA = a.baseScore + a.weatherBoost;
      const scoreB = b.baseScore + b.weatherBoost;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
```

**B. Add Weather-Aware Search Endpoint**

**File:** `/app/api/search/weather-aware/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentWeather } from '@/lib/enrichment/weather';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ error: 'City required' }, { status: 400 });
  }

  const supabase = createClient();

  // Get weather
  const cityData = await supabase
    .from('destinations')
    .select('latitude, longitude')
    .eq('city', city)
    .limit(1)
    .single();

  if (!cityData.data) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 });
  }

  const weather = await getCurrentWeather(
    cityData.data.latitude,
    cityData.data.longitude
  );

  // Get weather-appropriate destinations
  let query = supabase
    .from('destinations')
    .select('*')
    .eq('city', city);

  // Filter based on weather
  const isRainy = [61, 63, 65, 80, 81, 82].includes(weather.weatherCode);
  const isSunny = [0, 1, 2].includes(weather.weatherCode);

  if (isRainy) {
    // Prefer indoor venues
    query = query.or('category.eq.museum,category.eq.gallery,category.eq.cafe');
  } else if (isSunny) {
    // Prefer outdoor venues
    query = query.contains('tags', ['outdoor']);
  }

  const { data: destinations } = await query.limit(20);

  return NextResponse.json({
    weather: {
      temperature: weather.temperature,
      conditions: weather.description,
      code: weather.weatherCode
    },
    recommendations: destinations
  });
}
```

**C. UI Component**

**File:** `/components/WeatherRecommendations.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { DestinationCard } from './DestinationCard';

interface WeatherRecommendationsProps {
  city: string;
}

export function WeatherRecommendations({ city }: WeatherRecommendationsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/search/weather-aware?city=${city}`)
      .then(r => r.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [city]);

  if (loading) return <div>Loading weather-based suggestions...</div>;
  if (!data) return null;

  const weatherIcon = getWeatherIcon(data.weather.code);
  const weatherSuggestion = getWeatherSuggestion(data.weather);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{weatherIcon}</span>
          <div>
            <div className="text-sm font-medium">
              {data.weather.temperature}°C · {data.weather.conditions}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {weatherSuggestion}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.recommendations.map((dest: any) => (
          <DestinationCard key={dest.id} destination={dest} />
        ))}
      </div>
    </div>
  );
}

function getWeatherIcon(code: number): string {
  if ([61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([0, 1, 2].includes(code)) return '☀️';
  if ([3, 45, 48].includes(code)) return '☁️';
  return '🌤️';
}

function getWeatherSuggestion(weather: any): string {
  if (weather.code >= 60 && weather.code <= 82) {
    return 'Perfect weather for museums, galleries, and cozy cafes';
  }
  if (weather.temperature > 25) {
    return 'Great day for rooftop bars and outdoor dining';
  }
  if (weather.temperature < 10) {
    return 'Warm up in cozy restaurants and cafes';
  }
  return 'Explore indoor and outdoor spots';
}
```

---

### 1.2 Events (Eventbrite API)

**Status:** ✅ Already integrated (`/lib/enrichment/events.ts`)
**Cost:** FREE (with OAuth token)
**Goal:** Use event data for recommendations and discovery

#### Implementation Steps:

**A. Database Schema**

```sql
-- Migration: Add events table
CREATE TABLE IF NOT EXISTS city_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_description TEXT,
  event_url TEXT,
  event_date_start TIMESTAMPTZ NOT NULL,
  event_date_end TIMESTAMPTZ,
  venue_name TEXT,
  venue_lat DECIMAL(10, 8),
  venue_lng DECIMAL(11, 8),
  category TEXT,
  image_url TEXT,
  is_free BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'eventbrite',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_city_events_city ON city_events(city);
CREATE INDEX idx_city_events_date ON city_events(event_date_start DESC);
CREATE INDEX idx_city_events_category ON city_events(category);

-- Link events to nearby destinations
CREATE TABLE IF NOT EXISTS destination_nearby_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT REFERENCES destinations(id),
  event_id UUID REFERENCES city_events(id),
  distance_meters INT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(destination_id, event_id)
);

CREATE INDEX idx_destination_events_destination ON destination_nearby_events(destination_id);
CREATE INDEX idx_destination_events_event ON destination_nearby_events(event_id);
```

**B. Event Fetching Script**

**File:** `/scripts/fetch-city-events.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { searchEvents } from '@/lib/enrichment/events';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// List of cities to fetch events for
const CITIES = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  // ... add more cities
];

async function fetchEventsForCity(city: any) {
  console.log(`Fetching events for ${city.name}...`);

  try {
    const events = await searchEvents(city.lat, city.lng, 20); // 20km radius

    if (!events || events.length === 0) {
      console.log(`No events found for ${city.name}`);
      return;
    }

    // Insert events
    const eventsToInsert = events.map(event => ({
      city: city.name,
      event_name: event.name,
      event_description: event.description,
      event_url: event.url,
      event_date_start: event.start,
      event_date_end: event.end,
      venue_name: event.venue?.name,
      venue_lat: event.venue?.latitude,
      venue_lng: event.venue?.longitude,
      category: event.category,
      image_url: event.image,
      is_free: event.isFree
    }));

    const { error } = await supabase
      .from('city_events')
      .upsert(eventsToInsert, {
        onConflict: 'city,event_name,event_date_start'
      });

    if (error) {
      console.error(`Error inserting events for ${city.name}:`, error);
    } else {
      console.log(`Inserted ${eventsToInsert.length} events for ${city.name}`);
    }

    // Link events to nearby destinations
    await linkEventsToDestinations(city.name);

  } catch (error) {
    console.error(`Error fetching events for ${city.name}:`, error);
  }
}

async function linkEventsToDestinations(city: string) {
  // Get all destinations in city
  const { data: destinations } = await supabase
    .from('destinations')
    .select('id, latitude, longitude')
    .eq('city', city)
    .not('latitude', 'is', null);

  // Get all events in city
  const { data: events } = await supabase
    .from('city_events')
    .select('id, venue_lat, venue_lng')
    .eq('city', city)
    .gte('event_date_start', new Date().toISOString()) // Only upcoming events
    .not('venue_lat', 'is', null);

  if (!destinations || !events) return;

  const links = [];

  for (const dest of destinations) {
    for (const event of events) {
      const distance = calculateDistance(
        dest.latitude,
        dest.longitude,
        event.venue_lat,
        event.venue_lng
      );

      // Only link if within 2km
      if (distance <= 2000) {
        links.push({
          destination_id: dest.id,
          event_id: event.id,
          distance_meters: Math.round(distance)
        });
      }
    }
  }

  if (links.length > 0) {
    await supabase
      .from('destination_nearby_events')
      .upsert(links, { onConflict: 'destination_id,event_id' });

    console.log(`Linked ${links.length} event-destination pairs for ${city}`);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

async function main() {
  console.log('Starting event fetch for all cities...');

  for (const city of CITIES) {
    await fetchEventsForCity(city);
    // Rate limiting: wait 2 seconds between cities
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('Event fetch complete!');
}

main();
```

**C. API Endpoint for Events**

**File:** `/app/api/events/[city]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { city: string } }
) {
  const city = params.city;
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30');
  const category = searchParams.get('category');

  const supabase = createClient();

  let query = supabase
    .from('city_events')
    .select('*')
    .eq('city', city)
    .gte('event_date_start', new Date().toISOString())
    .lte('event_date_start', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
    .order('event_date_start', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data: events, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events, count: events?.length || 0 });
}
```

**D. Events Widget Component**

**File:** `/components/EventsNearby.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Event {
  id: string;
  event_name: string;
  event_date_start: string;
  venue_name: string;
  category: string;
  image_url?: string;
  distance_meters?: number;
}

export function EventsNearby({ destinationId }: { destinationId: number }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/destinations/${destinationId}/events`)
      .then(r => r.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      });
  }, [destinationId]);

  if (loading) return <div className="animate-pulse">Loading events...</div>;
  if (events.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Events Nearby</h3>
      <div className="space-y-3">
        {events.map(event => (
          <div
            key={event.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <div className="flex gap-3">
              {event.image_url && (
                <img
                  src={event.image_url}
                  alt={event.event_name}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="font-medium">{event.event_name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {event.venue_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(event.event_date_start), { addSuffix: true })}
                  {event.distance_meters && (
                    <span className="ml-2">· {Math.round(event.distance_meters / 1000 * 10) / 10}km away</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**E. Event-Boosted Recommendations**

**File:** `/lib/recommendations.ts` (add to existing)

```typescript
function applyEventBoost(
  destination: Destination,
  nearbyEvents: number
): number {
  // Boost destinations with nearby events
  if (nearbyEvents === 0) return 0;

  // Scale boost based on number of events
  // 1 event = 0.05, 2 events = 0.08, 3+ events = 0.10
  return Math.min(0.10, 0.05 + (nearbyEvents - 1) * 0.015);
}

// In getHybridRecommendations, fetch event counts
const { data: eventCounts } = await supabase
  .from('destination_nearby_events')
  .select('destination_id, count')
  .in('destination_id', destinationIds)
  .gte('event.event_date_start', new Date().toISOString())
  .lte('event.event_date_start', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()); // Next 2 weeks

// Apply event boost
destinations.forEach(dest => {
  const eventCount = eventCounts?.find(ec => ec.destination_id === dest.id)?.count || 0;
  dest.eventBoost = applyEventBoost(dest, eventCount);
});
```

---

### 1.3 OpenStreetMap (Overpass API)

**Cost:** FREE
**Goal:** Neighborhood data, transit stops, POI enrichment

#### Implementation Steps:

**A. OSM Service**

**File:** `/lib/enrichment/openstreetmap.ts`

```typescript
interface TransitStop {
  id: string;
  name: string;
  type: 'subway' | 'bus' | 'tram' | 'train';
  lat: number;
  lon: number;
  lines: string[];
}

interface Neighborhood {
  name: string;
  type: string;
  geometry: any;
}

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

export async function getTransitStops(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): Promise<TransitStop[]> {
  const query = `
    [out:json];
    (
      node["railway"="station"](around:${radiusMeters},${lat},${lng});
      node["railway"="subway_entrance"](around:${radiusMeters},${lat},${lng});
      node["public_transport"="stop_position"](around:${radiusMeters},${lat},${lng});
      node["highway"="bus_stop"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    const data = await response.json();

    return data.elements.map((element: any) => ({
      id: element.id,
      name: element.tags.name || 'Unnamed stop',
      type: getStopType(element.tags),
      lat: element.lat,
      lon: element.lon,
      lines: extractLines(element.tags)
    }));
  } catch (error) {
    console.error('Error fetching transit stops:', error);
    return [];
  }
}

export async function getNeighborhood(
  lat: number,
  lng: number
): Promise<Neighborhood | null> {
  const query = `
    [out:json];
    (
      area["place"~"neighbourhood|suburb|quarter"](around:1000,${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    const data = await response.json();

    if (data.elements.length === 0) return null;

    const neighborhood = data.elements[0];
    return {
      name: neighborhood.tags.name,
      type: neighborhood.tags.place,
      geometry: neighborhood
    };
  } catch (error) {
    console.error('Error fetching neighborhood:', error);
    return null;
  }
}

export async function getNearbyPOIs(
  lat: number,
  lng: number,
  radiusMeters: number = 500,
  types: string[] = ['restaurant', 'cafe', 'bar', 'shop']
): Promise<any[]> {
  const typeQuery = types.map(t => `node["amenity"="${t}"](around:${radiusMeters},${lat},${lng});`).join('\n');

  const query = `
    [out:json];
    (
      ${typeQuery}
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`
    });

    const data = await response.json();
    return data.elements;
  } catch (error) {
    console.error('Error fetching POIs:', error);
    return [];
  }
}

function getStopType(tags: any): TransitStop['type'] {
  if (tags.railway === 'station' || tags.railway === 'subway_entrance') return 'subway';
  if (tags.railway === 'tram_stop') return 'tram';
  if (tags.railway === 'halt') return 'train';
  return 'bus';
}

function extractLines(tags: any): string[] {
  const lines = [];
  if (tags.line) lines.push(tags.line);
  if (tags.ref) lines.push(tags.ref);
  if (tags.route_ref) lines.push(...tags.route_ref.split(';'));
  return [...new Set(lines)];
}
```

**B. Transit Accessibility Scoring**

**File:** `/lib/transit-scoring.ts`

```typescript
import { getTransitStops } from './enrichment/openstreetmap';

interface TransitScore {
  score: number; // 0-1
  nearbyStops: number;
  uniqueLines: number;
  types: string[];
  accessibility: 'excellent' | 'good' | 'moderate' | 'limited';
}

export async function calculateTransitScore(
  lat: number,
  lng: number
): Promise<TransitScore> {
  const stops = await getTransitStops(lat, lng, 500); // 500m radius

  const uniqueLines = [...new Set(stops.flatMap(s => s.lines))].length;
  const stopCount = stops.length;
  const types = [...new Set(stops.map(s => s.type))];

  // Calculate score
  // Formula: (stops * 0.4 + lines * 0.6) / 10, capped at 1.0
  const rawScore = (stopCount * 0.4 + uniqueLines * 0.6) / 10;
  const score = Math.min(1.0, rawScore);

  let accessibility: TransitScore['accessibility'];
  if (score >= 0.8) accessibility = 'excellent';
  else if (score >= 0.6) accessibility = 'good';
  else if (score >= 0.3) accessibility = 'moderate';
  else accessibility = 'limited';

  return {
    score,
    nearbyStops: stopCount,
    uniqueLines,
    types,
    accessibility
  };
}
```

**C. Database Schema**

```sql
-- Add transit data to destinations
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transit_score DECIMAL(3, 2);
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transit_accessibility TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS nearby_transit_stops INT DEFAULT 0;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS transit_updated_at TIMESTAMPTZ;

CREATE INDEX idx_destinations_transit_score ON destinations(transit_score DESC) WHERE transit_score IS NOT NULL;
CREATE INDEX idx_destinations_neighborhood ON destinations(neighborhood) WHERE neighborhood IS NOT NULL;
```

**D. Enrichment Script**

**File:** `/scripts/enrich-transit-data.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { calculateTransitScore } from '@/lib/transit-scoring';
import { getNeighborhood } from '@/lib/enrichment/openstreetmap';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function enrichDestinationTransit(destination: any) {
  if (!destination.latitude || !destination.longitude) {
    console.log(`Skipping ${destination.name} - no coordinates`);
    return;
  }

  try {
    // Get transit score
    const transitScore = await calculateTransitScore(
      destination.latitude,
      destination.longitude
    );

    // Get neighborhood
    const neighborhood = await getNeighborhood(
      destination.latitude,
      destination.longitude
    );

    // Update destination
    const { error } = await supabase
      .from('destinations')
      .update({
        transit_score: transitScore.score,
        transit_accessibility: transitScore.accessibility,
        nearby_transit_stops: transitScore.nearbyStops,
        neighborhood: neighborhood?.name,
        transit_updated_at: new Date().toISOString()
      })
      .eq('id', destination.id);

    if (error) {
      console.error(`Error updating ${destination.name}:`, error);
    } else {
      console.log(`✓ ${destination.name}: ${transitScore.accessibility} (${transitScore.nearbyStops} stops)`);
    }

    // Rate limiting - OSM Overpass has limits
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

  } catch (error) {
    console.error(`Error enriching ${destination.name}:`, error);
  }
}

async function main() {
  // Get all destinations without transit data or older than 30 days
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .not('latitude', 'is', null)
    .or('transit_updated_at.is.null,transit_updated_at.lt.' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .limit(100); // Process in batches

  if (!destinations || destinations.length === 0) {
    console.log('No destinations to enrich');
    return;
  }

  console.log(`Enriching ${destinations.length} destinations with transit data...`);

  for (const dest of destinations) {
    await enrichDestinationTransit(dest);
  }

  console.log('Transit enrichment complete!');
}

main();
```

---

## 2. Weather-Based Intelligence

Already covered in section 1.1 above.

---

## 3. Event-Based Opportunities

Already covered in section 1.2 above.

---

## 4. Category Affinity Learning

**Goal:** Build user preference profiles based on interaction history

### Database Schema

```sql
-- User category preferences
CREATE TABLE IF NOT EXISTS user_category_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  affinity_score DECIMAL(5, 4) NOT NULL, -- 0.0 to 1.0
  confidence DECIMAL(5, 4) NOT NULL, -- Based on sample size
  sample_size INT NOT NULL, -- Number of interactions
  trending TEXT, -- 'up', 'down', 'stable'
  last_interaction_at TIMESTAMPTZ,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

CREATE INDEX idx_user_affinity_user ON user_category_affinity(user_id);
CREATE INDEX idx_user_affinity_score ON user_category_affinity(affinity_score DESC);

-- User tag preferences
CREATE TABLE IF NOT EXISTS user_tag_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  affinity_score DECIMAL(5, 4) NOT NULL,
  confidence DECIMAL(5, 4) NOT NULL,
  sample_size INT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag)
);

CREATE INDEX idx_user_tag_affinity_user ON user_tag_affinity(user_id);
CREATE INDEX idx_user_tag_affinity_score ON user_tag_affinity(affinity_score DESC);
```

### Implementation

**File:** `/lib/affinity-learning.ts`

```typescript
import { createClient } from '@/lib/supabase-server';

interface CategoryAffinity {
  category: string;
  score: number; // 0-1
  confidence: number; // 0-1
  sampleSize: number;
  trending: 'up' | 'down' | 'stable';
  lastInteraction: Date;
}

interface AffinityWeights {
  visit: number;
  save: number;
  view: number;
  search: number;
}

const WEIGHTS: AffinityWeights = {
  visit: 5,    // Visited = strongest signal
  save: 3,     // Saved = strong signal
  view: 1,     // Viewed = weak signal
  search: 2    // Searched = medium signal
};

export async function calculateCategoryAffinity(
  userId: string
): Promise<CategoryAffinity[]> {
  const supabase = createClient();

  // Get user interactions
  const [visits, saves, views] = await Promise.all([
    // Visits
    supabase
      .from('visited_places')
      .select('destination_slug, visited_at')
      .eq('user_id', userId),

    // Saves
    supabase
      .from('saved_places')
      .select('destination_slug, saved_at')
      .eq('user_id', userId),

    // Views (from user_interactions)
    supabase
      .from('user_interactions')
      .select('destination_id, interaction_type, created_at')
      .eq('user_id', userId)
      .eq('interaction_type', 'view')
  ]);

  // Get destination details for all interacted destinations
  const allSlugs = [
    ...(visits.data?.map(v => v.destination_slug) || []),
    ...(saves.data?.map(s => s.destination_slug) || [])
  ];

  const { data: destinations } = await supabase
    .from('destinations')
    .select('slug, category, tags')
    .in('slug', allSlugs);

  if (!destinations) return [];

  // Build category interaction map
  const categoryInteractions: Map<string, {
    visits: number;
    saves: number;
    views: number;
    lastInteraction: Date;
    previousPeriodScore: number;
  }> = new Map();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Process visits
  visits.data?.forEach(visit => {
    const dest = destinations.find(d => d.slug === visit.destination_slug);
    if (!dest) return;

    const visitDate = new Date(visit.visited_at);
    const category = dest.category;

    if (!categoryInteractions.has(category)) {
      categoryInteractions.set(category, {
        visits: 0,
        saves: 0,
        views: 0,
        lastInteraction: visitDate,
        previousPeriodScore: 0
      });
    }

    const cat = categoryInteractions.get(category)!;
    cat.visits++;

    // Track if this is in previous period (for trending)
    if (visitDate >= thirtyDaysAgo) {
      // Recent
    } else if (visitDate >= sixtyDaysAgo) {
      cat.previousPeriodScore += WEIGHTS.visit;
    }

    if (visitDate > cat.lastInteraction) {
      cat.lastInteraction = visitDate;
    }
  });

  // Process saves
  saves.data?.forEach(save => {
    const dest = destinations.find(d => d.slug === save.destination_slug);
    if (!dest) return;

    const saveDate = new Date(save.saved_at);
    const category = dest.category;

    if (!categoryInteractions.has(category)) {
      categoryInteractions.set(category, {
        visits: 0,
        saves: 0,
        views: 0,
        lastInteraction: saveDate,
        previousPeriodScore: 0
      });
    }

    const cat = categoryInteractions.get(category)!;
    cat.saves++;

    if (saveDate >= thirtyDaysAgo) {
      // Recent
    } else if (saveDate >= sixtyDaysAgo) {
      cat.previousPeriodScore += WEIGHTS.save;
    }

    if (saveDate > cat.lastInteraction) {
      cat.lastInteraction = saveDate;
    }
  });

  // Calculate affinity scores
  const affinities: CategoryAffinity[] = [];
  let maxScore = 0;

  // First pass: calculate raw scores
  const rawScores: Map<string, number> = new Map();

  categoryInteractions.forEach((interactions, category) => {
    const rawScore =
      interactions.visits * WEIGHTS.visit +
      interactions.saves * WEIGHTS.save +
      interactions.views * WEIGHTS.view;

    rawScores.set(category, rawScore);
    if (rawScore > maxScore) maxScore = rawScore;
  });

  // Second pass: normalize and calculate confidence
  categoryInteractions.forEach((interactions, category) => {
    const rawScore = rawScores.get(category)!;
    const normalizedScore = maxScore > 0 ? rawScore / maxScore : 0;

    // Calculate confidence based on sample size
    const totalInteractions = interactions.visits + interactions.saves + interactions.views;
    // Confidence increases with sample size, caps at 1.0 for 20+ interactions
    const confidence = Math.min(1.0, totalInteractions / 20);

    // Calculate trending
    const recentScore = rawScore;
    const previousScore = interactions.previousPeriodScore;
    let trending: 'up' | 'down' | 'stable' = 'stable';

    if (recentScore > previousScore * 1.2) trending = 'up';
    else if (recentScore < previousScore * 0.8) trending = 'down';

    affinities.push({
      category,
      score: normalizedScore,
      confidence,
      sampleSize: totalInteractions,
      trending,
      lastInteraction: interactions.lastInteraction
    });
  });

  // Sort by score (highest first)
  affinities.sort((a, b) => b.score - a.score);

  return affinities;
}

export async function saveCategoryAffinity(
  userId: string,
  affinities: CategoryAffinity[]
): Promise<void> {
  const supabase = createClient();

  const records = affinities.map(aff => ({
    user_id: userId,
    category: aff.category,
    affinity_score: aff.score,
    confidence: aff.confidence,
    sample_size: aff.sampleSize,
    trending: aff.trending,
    last_interaction_at: aff.lastInteraction.toISOString(),
    calculated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('user_category_affinity')
    .upsert(records, {
      onConflict: 'user_id,category'
    });

  if (error) {
    console.error('Error saving category affinity:', error);
    throw error;
  }
}

export async function getCategoryAffinity(
  userId: string
): Promise<CategoryAffinity[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_category_affinity')
    .select('*')
    .eq('user_id', userId)
    .order('affinity_score', { ascending: false });

  if (error || !data) return [];

  return data.map(row => ({
    category: row.category,
    score: row.affinity_score,
    confidence: row.confidence,
    sampleSize: row.sample_size,
    trending: row.trending as 'up' | 'down' | 'stable',
    lastInteraction: new Date(row.last_interaction_at)
  }));
}

// Use affinity in recommendations
export function applyCategoryAffinityBoost(
  destination: any,
  userAffinity: CategoryAffinity[]
): number {
  const affinity = userAffinity.find(a => a.category === destination.category);

  if (!affinity) return 0;

  // Boost based on affinity score and confidence
  // High affinity + high confidence = strong boost
  const boost = affinity.score * affinity.confidence * 0.25; // Max 0.25 boost

  // Additional boost for trending categories
  if (affinity.trending === 'up') {
    return boost * 1.2; // 20% extra for trending up
  }

  return boost;
}
```

### Scheduled Job

**File:** `/app/api/cron/calculate-affinity/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { calculateCategoryAffinity, saveCategoryAffinity } from '@/lib/affinity-learning';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();

  // Get all users who have interactions
  const { data: users } = await supabase
    .from('auth.users')
    .select('id')
    .limit(1000); // Process in batches

  if (!users) {
    return NextResponse.json({ message: 'No users found' });
  }

  let processed = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const affinities = await calculateCategoryAffinity(user.id);
      if (affinities.length > 0) {
        await saveCategoryAffinity(user.id, affinities);
        processed++;
      }
    } catch (error) {
      console.error(`Error processing user ${user.id}:`, error);
      errors++;
    }
  }

  return NextResponse.json({
    message: 'Affinity calculation complete',
    processed,
    errors,
    total: users.length
  });
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/calculate-affinity",
    "schedule": "0 2 * * *"
  }]
}
```

---

## 5. Collaborative Filtering Enhancement

**Goal:** Better "users like you also liked" recommendations

### Implementation

**File:** `/lib/collaborative-filtering.ts`

```typescript
import { createClient } from '@/lib/supabase-server';

interface UserSimilarity {
  userId: string;
  similarity: number; // 0-1 (Jaccard similarity)
  sharedDestinations: number;
}

interface CollaborativeRecommendation {
  destination: any;
  score: number;
  reason: string;
  supportingUsers: number;
}

export async function findSimilarUsers(
  userId: string,
  limit: number = 50
): Promise<UserSimilarity[]> {
  const supabase = createClient();

  // Get user's saved destinations
  const { data: userSaves } = await supabase
    .from('saved_places')
    .select('destination_slug')
    .eq('user_id', userId);

  if (!userSaves || userSaves.length === 0) return [];

  const userDestinations = new Set(userSaves.map(s => s.destination_slug));

  // Get all users who saved at least one of the same destinations
  const { data: otherUserSaves } = await supabase
    .from('saved_places')
    .select('user_id, destination_slug')
    .in('destination_slug', Array.from(userDestinations))
    .neq('user_id', userId);

  if (!otherUserSaves) return [];

  // Group by user and calculate similarity
  const userGroups = new Map<string, Set<string>>();

  otherUserSaves.forEach(save => {
    if (!userGroups.has(save.user_id)) {
      userGroups.set(save.user_id, new Set());
    }
    userGroups.get(save.user_id)!.add(save.destination_slug);
  });

  // Calculate Jaccard similarity for each user
  const similarities: UserSimilarity[] = [];

  for (const [otherUserId, otherDestinations] of userGroups) {
    const intersection = new Set(
      [...userDestinations].filter(d => otherDestinations.has(d))
    );
    const union = new Set([...userDestinations, ...otherDestinations]);

    const similarity = intersection.size / union.size;

    // Only include users with meaningful similarity (at least 2 shared destinations)
    if (intersection.size >= 2) {
      similarities.push({
        userId: otherUserId,
        similarity,
        sharedDestinations: intersection.size
      });
    }
  }

  // Sort by similarity (highest first)
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, limit);
}

export async function getCollaborativeRecommendations(
  userId: string,
  limit: number = 20
): Promise<CollaborativeRecommendation[]> {
  const supabase = createClient();

  // Find similar users
  const similarUsers = await findSimilarUsers(userId, 50);

  if (similarUsers.length === 0) {
    return [];
  }

  // Get user's already saved destinations
  const { data: userSaves } = await supabase
    .from('saved_places')
    .select('destination_slug')
    .eq('user_id', userId);

  const userDestinations = new Set(userSaves?.map(s => s.destination_slug) || []);

  // Get destinations saved by similar users
  const { data: similarUserSaves } = await supabase
    .from('saved_places')
    .select('destination_slug, user_id')
    .in('user_id', similarUsers.map(u => u.userId));

  if (!similarUserSaves) return [];

  // Count how many similar users saved each destination
  const destinationCounts = new Map<string, {
    count: number;
    users: string[];
    weightedScore: number;
  }>();

  similarUserSaves.forEach(save => {
    if (userDestinations.has(save.destination_slug)) return; // Skip already saved

    const userSimilarity = similarUsers.find(u => u.userId === save.user_id);
    if (!userSimilarity) return;

    if (!destinationCounts.has(save.destination_slug)) {
      destinationCounts.set(save.destination_slug, {
        count: 0,
        users: [],
        weightedScore: 0
      });
    }

    const dest = destinationCounts.get(save.destination_slug)!;
    dest.count++;
    dest.users.push(save.user_id);
    dest.weightedScore += userSimilarity.similarity; // Weight by user similarity
  });

  // Get full destination details
  const destinationSlugs = Array.from(destinationCounts.keys());
  const { data: destinations } = await supabase
    .from('destinations')
    .select('*')
    .in('slug', destinationSlugs);

  if (!destinations) return [];

  // Build recommendations
  const recommendations: CollaborativeRecommendation[] = destinations.map(dest => {
    const stats = destinationCounts.get(dest.slug)!;

    // Score = weighted sum / max possible weight
    const maxWeight = similarUsers.slice(0, 10).reduce((sum, u) => sum + u.similarity, 0);
    const score = stats.weightedScore / maxWeight;

    let reason = `${stats.count} similar user${stats.count > 1 ? 's' : ''} loved this`;

    // Find most similar user who saved this
    const topUser = similarUsers.find(u => stats.users.includes(u.userId));
    if (topUser && topUser.sharedDestinations >= 5) {
      reason = `Highly recommended by users with similar taste`;
    }

    return {
      destination: dest,
      score,
      reason,
      supportingUsers: stats.count
    };
  });

  // Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

// Use in recommendations
export async function applyCollaborativeBoost(
  userId: string,
  destination: any
): Promise<number> {
  const supabase = createClient();

  // Get similar users
  const similarUsers = await findSimilarUsers(userId, 20);

  if (similarUsers.length === 0) return 0;

  // Check how many similar users saved this destination
  const { data: saves, count } = await supabase
    .from('saved_places')
    .select('user_id', { count: 'exact' })
    .eq('destination_slug', destination.slug)
    .in('user_id', similarUsers.map(u => u.userId));

  if (!count || count === 0) return 0;

  // Calculate weighted boost
  let weightedSum = 0;
  saves?.forEach(save => {
    const user = similarUsers.find(u => u.userId === save.user_id);
    if (user) {
      weightedSum += user.similarity;
    }
  });

  // Normalize by max possible (top 10 users)
  const maxWeight = similarUsers.slice(0, 10).reduce((sum, u) => sum + u.similarity, 0);
  const boost = (weightedSum / maxWeight) * 0.20; // Max 0.20 boost

  return boost;
}
```

### Cache Similarity Matrix

**File:** `/scripts/cache-user-similarity.ts`

```typescript
// Run weekly to pre-calculate similarity matrices
import { createClient } from '@supabase/supabase-js';
import { findSimilarUsers } from '@/lib/collaborative-filtering';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create table for cached similarities
/*
CREATE TABLE IF NOT EXISTS user_similarity_cache (
  user_id UUID NOT NULL,
  similar_user_id UUID NOT NULL,
  similarity_score DECIMAL(5, 4) NOT NULL,
  shared_destinations INT NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, similar_user_id)
);

CREATE INDEX idx_similarity_cache_user ON user_similarity_cache(user_id);
CREATE INDEX idx_similarity_cache_score ON user_similarity_cache(similarity_score DESC);
*/

async function cacheUserSimilarities() {
  // Get all users with saved destinations
  const { data: users } = await supabase.rpc('get_active_users'); // Users with saves

  if (!users) return;

  console.log(`Caching similarities for ${users.length} users...`);

  for (const user of users) {
    try {
      const similarUsers = await findSimilarUsers(user.id, 50);

      if (similarUsers.length > 0) {
        const records = similarUsers.map(su => ({
          user_id: user.id,
          similar_user_id: su.userId,
          similarity_score: su.similarity,
          shared_destinations: su.sharedDestinations
        }));

        await supabase
          .from('user_similarity_cache')
          .upsert(records, {
            onConflict: 'user_id,similar_user_id'
          });

        console.log(`✓ Cached ${similarUsers.length} similarities for user ${user.id}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`Error caching similarities for user ${user.id}:`, error);
    }
  }

  console.log('Similarity caching complete!');
}

cacheUserSimilarities();
```

---

## Remaining features (6-11) continue in next section...

Would you like me to continue with:
- Demand Forecasting
- Social Momentum Tracking
- Auto-Generated Discovery Prompts
- Knowledge Graph
- Multi-Signal Hybrid Scoring

Or should I move on to create the **Premium API Sources** document?
