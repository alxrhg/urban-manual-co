/**
 * Travel Intelligence Engine
 * Core intelligence system - Intelligence is the product, not a feature
 */

import { createClient } from '@supabase/supabase-js';
import type { ArchitectureDestination, ArchitecturalJourney, ArchitecturalInsight } from '@/types/architecture';
import { generateRealTimeAdjustments } from './realtime';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export interface TravelIntelligenceInput {
  destination: string; // City
  dates: { start: Date; end: Date };
  preferences: {
    architectural_interests?: string[]; // Movements, architects, materials
    travel_style?: 'intensive' | 'balanced' | 'relaxed';
    budget_range?: 'budget' | 'moderate' | 'luxury';
    group_size?: number;
    special_requirements?: string[];
  };
}

export interface TravelIntelligenceOutput {
  architectural_journey: ArchitecturalJourney;
  optimized_itinerary: DayItinerary[];
  design_narrative: string;
  architectural_insights: ArchitecturalInsight[];
  recommendations: Recommendation[];
  real_time_adjustments: Adjustment[];
}

export interface DayItinerary {
  date: string;
  destinations: ArchitectureDestination[];
  narrative: string;
  total_time_minutes: number;
  walking_distance_km: number;
}

export interface Recommendation {
  type: 'architect' | 'movement' | 'material' | 'similar';
  title: string;
  description: string;
  destinations: ArchitectureDestination[];
}

export interface Adjustment {
  type: 'weather' | 'crowding' | 'event' | 'availability';
  message: string;
  affected_destinations: number[];
  suggested_alternatives?: ArchitectureDestination[];
}

/**
 * Generate travel intelligence
 * This is the core product - intelligence, not just trip planning
 */
export async function generateTravelIntelligence(
  input: TravelIntelligenceInput
): Promise<TravelIntelligenceOutput> {
  // 1. Generate architectural journey (core product)
  const architecturalJourney = await generateArchitecturalJourney(input);

  // 2. Generate optimized itinerary
  const optimizedItinerary = await generateOptimizedItinerary(
    architecturalJourney.destinations,
    input.dates,
    input.preferences
  );

  // 3. Generate design narrative
  const designNarrative = await generateDesignNarrative(
    architecturalJourney,
    input.destination
  );

  // 4. Generate architectural insights
  const architecturalInsights = await generateArchitecturalInsights(
    architecturalJourney.destinations
  );

  // 5. Generate recommendations
  const recommendations = await generateRecommendations(
    architecturalJourney,
    input.preferences
  );

  // 6. Generate real-time adjustments
  const destinationIds = architecturalJourney.destinations.map(d => d.id);
  const realTimeAdjustments = await generateRealTimeAdjustments(
    destinationIds,
    input.dates
  );

  return {
    architectural_journey: architecturalJourney,
    optimized_itinerary: optimizedItinerary,
    design_narrative: designNarrative,
    architectural_insights: architecturalInsights,
    recommendations: recommendations,
    real_time_adjustments: realTimeAdjustments,
  };
}

/**
 * Generate architectural journey - the core intelligence product
 */
async function generateArchitecturalJourney(
  input: TravelIntelligenceInput
): Promise<ArchitecturalJourney> {
  let query = supabase
    .from('destinations')
    .select(`
      id,
      name,
      slug,
      city,
      country,
      category,
      image,
      architect_id,
      movement_id,
      architectural_significance,
      design_story,
      intelligence_score,
      created_at
    `)
    .eq('city', input.destination.toLowerCase().replace(/\s+/g, '-'))
    .not('architect_id', 'is', null)
    .order('intelligence_score', { ascending: false })
    .limit(20);

  // Filter by architectural interests if provided
  if (input.preferences.architectural_interests && input.preferences.architectural_interests.length > 0) {
    // This is a simplified version - in production, would need to join with movements/architects
    // For now, we'll filter client-side after fetching
  }

  const { data: destinationsData, error } = await query;

  if (error || !destinationsData) {
    throw new Error(`Failed to fetch destinations: ${error?.message}`);
  }

  // Transform destinations to match ArchitectureDestination type
  const destinations: ArchitectureDestination[] = destinationsData.map((dest: any) => ({
    ...dest,
    country: dest.country || '',
    created_at: dest.created_at || new Date().toISOString(),
  }));

  // Determine journey type and focus
  let journeyType: ArchitecturalJourney['type'] = 'city';
  let focus = input.destination;

  // If architectural interests specified, determine type
  if (input.preferences.architectural_interests && input.preferences.architectural_interests.length > 0) {
    const firstInterest = input.preferences.architectural_interests[0];
    // Simple heuristic - could be enhanced
    if (firstInterest.includes('brutalism') || firstInterest.includes('modernism')) {
      journeyType = 'movement';
      focus = firstInterest;
    } else if (firstInterest.includes('tadao') || firstInterest.includes('ando')) {
      journeyType = 'architect';
      focus = firstInterest;
    }
  }

  // Generate narrative
  const narrative = generateJourneyNarrative(destinations, journeyType, focus);

  // Generate insights
  const insights = await generateJourneyInsights(destinations);

  return {
    id: `journey-${Date.now()}`,
    title: generateJourneyTitle(destinations, journeyType, focus),
    description: narrative,
    type: journeyType,
    focus: focus,
    destinations: destinations as ArchitectureDestination[],
    narrative: narrative,
    insights: insights,
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate optimized itinerary
 */
async function generateOptimizedItinerary(
  destinations: ArchitectureDestination[],
  dates: { start: Date; end: Date },
  preferences: TravelIntelligenceInput['preferences']
): Promise<DayItinerary[]> {
  const days: DayItinerary[] = [];
  const startDate = new Date(dates.start);
  const endDate = new Date(dates.end);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Distribute destinations across days
  const destinationsPerDay = Math.ceil(destinations.length / dayCount);
  const travelStyle = preferences.travel_style || 'balanced';

  // Adjust destinations per day based on travel style
  let adjustedPerDay = destinationsPerDay;
  if (travelStyle === 'intensive') {
    adjustedPerDay = Math.ceil(destinationsPerDay * 1.5);
  } else if (travelStyle === 'relaxed') {
    adjustedPerDay = Math.floor(destinationsPerDay * 0.7);
  }

  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const startIdx = i * adjustedPerDay;
    const dayDestinations = destinations.slice(startIdx, startIdx + adjustedPerDay);

    days.push({
      date: dateStr,
      destinations: dayDestinations,
      narrative: generateDayNarrative(dayDestinations, date),
      total_time_minutes: estimateTime(dayDestinations, travelStyle),
      walking_distance_km: estimateDistance(dayDestinations),
    });
  }

  return days;
}

/**
 * Generate design narrative
 */
async function generateDesignNarrative(
  journey: ArchitecturalJourney,
  city: string
): Promise<string> {
  if (journey.type === 'movement') {
    return `Explore the evolution of ${journey.focus} architecture in ${city}. This journey takes you through ${journey.destinations.length} carefully selected destinations that exemplify the movement's key characteristics and demonstrate its impact on the city's architectural landscape.`;
  } else if (journey.type === 'architect') {
    return `Discover the works of ${journey.focus} in ${city}. This curated journey showcases ${journey.destinations.length} destinations designed by this renowned architect, revealing their design philosophy and architectural vision.`;
  } else {
    return `An architectural journey through ${city}, featuring ${journey.destinations.length} destinations that represent the city's most significant design achievements. From historic landmarks to contemporary masterpieces, explore the architectural diversity that defines ${city}.`;
  }
}

/**
 * Generate architectural insights
 */
async function generateArchitecturalInsights(
  destinations: ArchitectureDestination[]
): Promise<ArchitecturalInsight[]> {
  const insights: ArchitecturalInsight[] = [];

  // Group by architect
  const byArchitect = new Map<string, ArchitectureDestination[]>();
  for (const dest of destinations) {
    if (dest.architect_id) {
      if (!byArchitect.has(dest.architect_id)) {
        byArchitect.set(dest.architect_id, []);
      }
      byArchitect.get(dest.architect_id)!.push(dest);
    }
  }

  // Insight: Multiple works by same architect
  for (const [architectId, archDests] of byArchitect.entries()) {
    if (archDests.length > 1) {
      insights.push({
        type: 'evolution',
        title: `Multiple works by same architect`,
        description: `Explore ${archDests.length} destinations designed by the same architect, revealing their design evolution.`,
        destinations: archDests.map(d => d.id),
      });
    }
  }

  // Group by movement
  const byMovement = new Map<string, ArchitectureDestination[]>();
  for (const dest of destinations) {
    if (dest.movement_id) {
      if (!byMovement.has(dest.movement_id)) {
        byMovement.set(dest.movement_id, []);
      }
      byMovement.get(dest.movement_id)!.push(dest);
    }
  }

  // Insight: Movement concentration
  for (const [movementId, movementDests] of byMovement.entries()) {
    if (movementDests.length > 2) {
      insights.push({
        type: 'movement',
        title: `Design movement concentration`,
        description: `${movementDests.length} destinations represent the same design movement, showing its influence in the city.`,
        destinations: movementDests.map(d => d.id),
      });
    }
  }

  return insights;
}

/**
 * Generate recommendations
 */
async function generateRecommendations(
  journey: ArchitecturalJourney,
  preferences: TravelIntelligenceInput['preferences']
): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Recommend more by same architect
  if (journey.type === 'architect') {
    // Would fetch more destinations by same architect
    recommendations.push({
      type: 'architect',
      title: `More works by ${journey.focus}`,
      description: `Discover additional destinations designed by this architect.`,
      destinations: [],
    });
  }

  return recommendations;
}

// Real-time adjustments are now handled by realtime.ts service

// Helper functions

function generateJourneyTitle(
  destinations: ArchitectureDestination[],
  type: ArchitecturalJourney['type'],
  focus: string
): string {
  if (type === 'movement') {
    return `${focus} Architecture Journey`;
  } else if (type === 'architect') {
    return `${focus}'s Works`;
  } else {
    return `Architectural Journey`;
  }
}

function generateJourneyNarrative(
  destinations: ArchitectureDestination[],
  type: ArchitecturalJourney['type'],
  focus: string
): string {
  // Simplified narrative generation
  return `A curated journey through ${destinations.length} architectural destinations.`;
}

async function generateJourneyInsights(
  destinations: ArchitectureDestination[]
): Promise<ArchitecturalInsight[]> {
  return [];
}

function generateDayNarrative(
  destinations: ArchitectureDestination[],
  date: Date
): string {
  return `Explore ${destinations.length} architectural destinations on ${date.toLocaleDateString()}.`;
}

function estimateTime(
  destinations: ArchitectureDestination[],
  travelStyle: string
): number {
  const baseTime = 60; // 1 hour per destination
  const styleMultiplier = travelStyle === 'intensive' ? 0.8 : travelStyle === 'relaxed' ? 1.5 : 1.0;
  return Math.round(destinations.length * baseTime * styleMultiplier);
}

function estimateDistance(destinations: ArchitectureDestination[]): number {
  // Simplified - would use actual coordinates in production
  return destinations.length * 2; // ~2km between destinations
}

