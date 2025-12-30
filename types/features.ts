/**
 * Feature types for Urban Manual comprehensive features
 */

// ============================================
// REVIEWS
// ============================================

export interface Review {
  id: string;
  destination_id: number;
  user_id: string;
  rating: number; // 1-5
  title?: string;
  content?: string;
  visit_date?: string;
  helpful_count: number;
  not_helpful_count: number;
  is_verified: boolean;
  is_featured: boolean;
  status: 'pending' | 'published' | 'hidden' | 'flagged';
  created_at: string;
  updated_at: string;
  // Joined fields
  photos?: ReviewPhoto[];
  user?: ReviewUser;
  destination?: {
    slug: string;
    name: string;
    city: string;
    image?: string;
  };
  // Current user's vote (populated when fetching)
  user_vote?: 'helpful' | 'not_helpful' | null;
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  url: string;
  caption?: string;
  order_index: number;
  created_at: string;
}

export interface ReviewUser {
  id: string;
  display_name?: string;
  username?: string;
  avatar_url?: string;
}

export interface ReviewVote {
  id: string;
  review_id: string;
  user_id: string;
  vote_type: 'helpful' | 'not_helpful';
  created_at: string;
}

export interface ReviewFlag {
  id: string;
  review_id: string;
  user_id: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
  details?: string;
  created_at: string;
}

export interface CreateReviewInput {
  destination_id: number;
  rating: number;
  title?: string;
  content?: string;
  visit_date?: string;
  photos?: { url: string; caption?: string }[];
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
  visit_date?: string;
}

// ============================================
// TRIP SHARING & COLLABORATION
// ============================================

export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id?: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  // Joined
  user?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface TripComment {
  id: string;
  trip_id: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined
  user?: ReviewUser;
  replies?: TripComment[];
}

export interface ShareTripInput {
  is_public: boolean;
  allow_comments?: boolean;
  allow_copy?: boolean;
}

export interface InviteCollaboratorInput {
  email: string;
  role: 'editor' | 'viewer';
}

// ============================================
// USER PROFILES
// ============================================

export interface UserProfile {
  id: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  website?: string;
  location?: string;
  travel_style?: string;
  favorite_categories?: string[];
  favorite_cities?: string[];
  is_public: boolean;
  show_saved_places: boolean;
  show_visited_places: boolean;
  show_lists: boolean;
  show_stats: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
}

export interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  website?: string;
  location?: string;
  travel_style?: string;
  favorite_categories?: string[];
  favorite_cities?: string[];
  is_public?: boolean;
  show_saved_places?: boolean;
  show_visited_places?: boolean;
  show_lists?: boolean;
  show_stats?: boolean;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// ============================================
// PUBLIC LISTS
// ============================================

export interface PublicList {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  cover_image?: string;
  emoji: string;
  is_public: boolean;
  is_featured: boolean;
  likes_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Joined
  items?: PublicListItem[];
  item_count?: number;
  user?: ReviewUser;
  is_liked?: boolean;
}

export interface PublicListItem {
  id: string;
  list_id: string;
  destination_id: number;
  notes?: string;
  order_index: number;
  created_at: string;
  // Joined
  destination?: {
    slug: string;
    name: string;
    city: string;
    category: string;
    image?: string;
    rating?: number;
  };
}

export interface CreateListInput {
  title: string;
  description?: string;
  cover_image?: string;
  emoji?: string;
  is_public?: boolean;
}

export interface UpdateListInput {
  title?: string;
  description?: string;
  cover_image?: string;
  emoji?: string;
  is_public?: boolean;
}

export interface AddListItemInput {
  destination_id: number;
  notes?: string;
}

// ============================================
// DESTINATION SUGGESTIONS
// ============================================

export interface DestinationSuggestion {
  id: string;
  user_id: string;
  name: string;
  city: string;
  country?: string;
  category: string;
  address?: string;
  website?: string;
  instagram_handle?: string;
  why_add: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  upvotes: number;
  downvotes: number;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'duplicate';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  destination_id?: number;
  created_at: string;
  // Joined
  user?: ReviewUser;
  user_vote?: 'up' | 'down' | null;
}

export interface CreateSuggestionInput {
  name: string;
  city: string;
  country?: string;
  category: string;
  address?: string;
  website?: string;
  instagram_handle?: string;
  why_add: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
}

// ============================================
// TRIP BUDGET
// ============================================

export interface TripBudget {
  id: string;
  trip_id: string;
  total_budget?: number;
  currency: string;
  daily_budget?: number;
  created_at: string;
  updated_at: string;
  // Computed
  total_estimated?: number;
  total_actual?: number;
  remaining?: number;
}

export interface BudgetItem {
  id: string;
  trip_id: string;
  itinerary_item_id?: string;
  category: 'food' | 'accommodation' | 'transport' | 'activities' | 'shopping' | 'other';
  description?: string;
  estimated_cost?: number;
  actual_cost?: number;
  currency: string;
  is_paid: boolean;
  day?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBudgetInput {
  total_budget?: number;
  currency?: string;
  daily_budget?: number;
}

export interface CreateBudgetItemInput {
  itinerary_item_id?: string;
  category: BudgetItem['category'];
  description?: string;
  estimated_cost?: number;
  actual_cost?: number;
  currency?: string;
  is_paid?: boolean;
  day?: number;
}

// ============================================
// USER STATS & GAMIFICATION
// ============================================

export interface UserStats {
  user_id: string;
  destinations_saved: number;
  destinations_visited: number;
  reviews_written: number;
  reviews_helpful: number;
  lists_created: number;
  lists_liked: number;
  trips_completed: number;
  cities_visited: number;
  countries_visited: number;
  photos_uploaded: number;
  suggestions_approved: number;
  followers_count: number;
  following_count: number;
  total_points: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_at?: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: 'explorer' | 'foodie' | 'reviewer' | 'social' | 'curator' | 'special';
  requirement_type: string;
  requirement_value: number;
  points: number;
  is_secret: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  // Joined
  achievement?: Achievement;
}

export interface YearInReview {
  year: number;
  user_id: string;
  total_places_saved: number;
  total_places_visited: number;
  total_cities: number;
  total_countries: number;
  total_reviews: number;
  top_cities: { city: string; count: number }[];
  top_categories: { category: string; count: number }[];
  favorite_cuisine?: string;
  achievements_earned: Achievement[];
  trips_completed: number;
  total_trip_days: number;
}

// ============================================
// NOTIFICATIONS
// ============================================

export interface NotificationPreferences {
  user_id: string;
  email_digest: 'never' | 'daily' | 'weekly' | 'monthly';
  new_in_city: boolean;
  review_on_saved: boolean;
  trip_reminder: boolean;
  collaborator_activity: boolean;
  new_followers: boolean;
  list_likes: boolean;
  achievement_earned: boolean;
  marketing: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  email_digest?: NotificationPreferences['email_digest'];
  new_in_city?: boolean;
  review_on_saved?: boolean;
  trip_reminder?: boolean;
  collaborator_activity?: boolean;
  new_followers?: boolean;
  list_likes?: boolean;
  achievement_earned?: boolean;
  marketing?: boolean;
}

// ============================================
// SEARCH
// ============================================

export interface SearchHistory {
  id: string;
  user_id?: string;
  session_id?: string;
  query: string;
  result_count?: number;
  clicked_destination_id?: number;
  created_at: string;
}

export interface PopularSearch {
  id: string;
  query: string;
  search_count: number;
  last_searched_at: string;
  is_trending: boolean;
}

// ============================================
// ADVANCED FILTERS
// ============================================

export interface AdvancedFilters {
  // Location
  city?: string;
  country?: string;
  neighborhood?: string;
  nearbyLat?: number;
  nearbyLng?: number;
  distanceKm?: number;

  // Category & Type
  category?: string;
  categories?: string[];
  brand?: string;

  // Quality & Ratings
  minRating?: number;
  maxRating?: number;
  minCommunityRating?: number;
  minReviewCount?: number;
  michelin?: boolean;
  michelinStars?: number[]; // [1, 2, 3]
  crown?: boolean;

  // Price
  minPrice?: number;
  maxPrice?: number;
  priceLevel?: number[]; // [1, 2, 3, 4]

  // Features
  openNow?: boolean;
  hasReservation?: boolean;
  reservationRequired?: boolean;

  // Atmosphere & Vibe
  atmosphereTags?: string[];
  bestFor?: string[];
  noiseLevel?: string;
  dressCode?: string;

  // Dietary
  dietaryOptions?: string[];

  // Sorting
  sortBy?: 'rating' | 'community_rating' | 'newest' | 'trending' | 'saves_count' | 'distance' | 'price_asc' | 'price_desc';
}

export const ATMOSPHERE_TAGS = [
  'romantic',
  'casual',
  'trendy',
  'quiet',
  'lively',
  'cozy',
  'upscale',
  'hip',
  'traditional',
  'modern',
  'intimate',
  'spacious',
  'outdoor',
  'rooftop',
  'waterfront',
] as const;

export const BEST_FOR_OPTIONS = [
  'date_night',
  'business',
  'family',
  'solo',
  'groups',
  'celebration',
  'brunch',
  'late_night',
  'quick_bite',
  'special_occasion',
] as const;

export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'halal',
  'kosher',
  'dairy_free',
  'nut_free',
  'pescatarian',
  'organic',
  'farm_to_table',
] as const;

export const NOISE_LEVELS = ['quiet', 'moderate', 'lively', 'loud'] as const;

export const DRESS_CODES = ['casual', 'smart_casual', 'business_casual', 'formal'] as const;

export type AtmosphereTag = typeof ATMOSPHERE_TAGS[number];
export type BestForOption = typeof BEST_FOR_OPTIONS[number];
export type DietaryOption = typeof DIETARY_OPTIONS[number];
export type NoiseLevel = typeof NOISE_LEVELS[number];
export type DressCode = typeof DRESS_CODES[number];

// ============================================
// TRAVEL TIME & ROUTE
// ============================================

export interface TravelEstimate {
  from: { lat: number; lng: number; name?: string };
  to: { lat: number; lng: number; name?: string };
  mode: 'walking' | 'driving' | 'transit' | 'bicycling';
  duration_minutes: number;
  distance_meters: number;
  distance_text: string;
  duration_text: string;
  cost_estimate?: number;
  co2_estimate?: number;
}

export interface OptimizedRoute {
  original_order: string[];
  optimized_order: string[];
  total_distance_meters: number;
  total_duration_minutes: number;
  legs: TravelEstimate[];
  savings_minutes?: number;
}

// ============================================
// BOOKING
// ============================================

export interface BookingLink {
  provider: 'resy' | 'opentable' | 'booking' | 'airbnb' | 'direct';
  url: string;
  price_hint?: string;
  availability?: 'available' | 'limited' | 'sold_out' | 'unknown';
}

export interface BookingIntent {
  destination_id: number;
  destination_slug: string;
  provider: string;
  clicked_at: string;
  user_id?: string;
  session_id?: string;
}
