import { Destination } from '@/types/destination';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface TasteProfile {
  travel_style?: string | null;
  interests?: string[] | null;
  travel_companions?: string | null;
  budget_preference?: string | null;
}

export interface UserProfileForScoring {
  taste_profile?: TasteProfile | null;
  implicit_interests?: Record<string, number> | null;
}

export interface ManualScoreContext {
  userLocation?: { lat: number; lng: number };
  timeOfDay?: TimeOfDay;
}

export interface ManualScoreBreakdown {
  pScore: number;
  cScore: number;
  qScore: number;
  tScore: number;
}

export interface ManualScoreResult<T extends Destination = Destination> {
  item: T;
  score: number;
  breakdown: ManualScoreBreakdown;
}

interface ManualScoreDestination extends Destination {
  created_at?: string | null;
  review_count?: number | null;
}

const TIME_OF_DAY_CATEGORY_BOOSTS: Record<TimeOfDay, Record<string, number>> = {
  morning: { cafe: 15, bakery: 15, breakfast: 15 },
  afternoon: { museum: 15, gallery: 15, shop: 10 },
  evening: { restaurant: 15, wine_bar: 15, theatre: 10 },
  night: { bar: 15, club: 15, nightlife: 15 },
};

function normalizeProfile(profile: UserProfileForScoring): Required<UserProfileForScoring> {
  const tasteProfile: TasteProfile = profile.taste_profile || {};

  return {
    taste_profile: {
      travel_style: tasteProfile.travel_style || '',
      travel_companions: tasteProfile.travel_companions || '',
      budget_preference: tasteProfile.budget_preference || '',
      interests: Array.isArray(tasteProfile.interests)
        ? tasteProfile.interests.filter(Boolean)
        : [],
    },
    implicit_interests: profile.implicit_interests || {},
  };
}

function normalizeTags(tags?: Destination['tags']): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => (typeof tag === 'string' ? tag.toLowerCase() : ''))
    .filter(Boolean);
}

function calculateDistance(
  pointA: { lat: number; lng: number },
  pointB: { lat: number; lng: number }
): number {
  const R = 6371; // km
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(pointB.lat - pointA.lat);
  const dLng = toRad(pointB.lng - pointA.lng);
  const lat1 = toRad(pointA.lat);
  const lat2 = toRad(pointB.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function calculateManualScore<T extends ManualScoreDestination>(
  profile: UserProfileForScoring,
  contentItem: T,
  context?: ManualScoreContext
): ManualScoreResult<T> {
  const normalizedProfile = normalizeProfile(profile);
  const normalizedTags = normalizeTags(contentItem.tags);

  // Personalization Score (40%)
  let pScore = 0;
  const profileInterests = normalizedProfile.taste_profile.interests.map((interest) =>
    interest.toLowerCase()
  );
  const interestOverlap = profileInterests.filter((interest) =>
    normalizedTags.includes(interest)
  );
  pScore += interestOverlap.length * 10;

  const travelStyle = normalizedProfile.taste_profile.travel_style.toLowerCase();
  if (travelStyle && (normalizedTags.includes(travelStyle) ||
    (contentItem.category || '').toLowerCase() === travelStyle)) {
    pScore += 20;
  }

  Object.entries(normalizedProfile.implicit_interests).forEach(([tag, weight]) => {
    if (normalizedTags.includes(tag.toLowerCase())) {
      pScore += Number(weight) * 2;
    }
  });

  // Context Score (30%)
  let cScore = 0;
  if (
    context?.userLocation &&
    typeof contentItem.latitude === 'number' &&
    typeof contentItem.longitude === 'number'
  ) {
    const distance = calculateDistance(context.userLocation, {
      lat: contentItem.latitude,
      lng: contentItem.longitude,
    });

    if (distance < 1) cScore += 30;
    else if (distance < 5) cScore += 20;
    else if (distance < 10) cScore += 10;
  }

  if (context?.timeOfDay) {
    const category = (contentItem.category || '').toLowerCase();
    const boost = TIME_OF_DAY_CATEGORY_BOOSTS[context.timeOfDay]?.[category];
    if (boost) {
      cScore += boost;
    }
  }

  // Quality Score (20%)
  const rating = typeof contentItem.rating === 'number' ? contentItem.rating : 0;
  const reviewCount =
    typeof contentItem.review_count === 'number'
      ? contentItem.review_count
      : typeof contentItem.user_ratings_total === 'number'
        ? contentItem.user_ratings_total
        : 0;

  let qScore = 0;
  qScore += Math.min(rating * 4, 20);
  qScore += Math.min(reviewCount / 10, 10);

  // Temporal Score (10%)
  let tScore = 0;
  const createdAt = contentItem.created_at ? new Date(contentItem.created_at) : null;
  if (createdAt && !Number.isNaN(createdAt.getTime())) {
    const daysSinceCreated = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated < 7) tScore = 10;
    else if (daysSinceCreated < 30) tScore = 7;
    else if (daysSinceCreated < 90) tScore = 4;
  }

  const finalScore =
    pScore * 0.4 +
    cScore * 0.3 +
    qScore * 0.2 +
    tScore * 0.1;

  return {
    item: contentItem,
    score: clamp(finalScore, 0, 100),
    breakdown: {
      pScore,
      cScore,
      qScore,
      tScore,
    },
  };
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}
