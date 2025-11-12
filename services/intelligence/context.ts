import { createServiceRoleClient } from '@/lib/supabase-server';
import { fetchWeather, WeatherData } from '@/lib/enrichment/weather';
import { Event, fetchNearbyEvents } from '@/lib/enrichment/events';
import {
  DestinationMetadata,
  getDestinationMetadataBySlug,
  getDestinationsByCity,
} from '@/data/destinations';

interface AggregatorOptions {
  userId?: string;
  destinationId?: number;
  destinationSlug?: string;
  city?: string;
  coordinates?: { lat: number; lng: number };
  recentSearchLimit?: number;
  skipLiveProviders?: boolean;
}

interface UserProfileSummary {
  id: string;
  username?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  instagramHandle?: string | null;
  displayName?: string | null;
}

interface UserPreferenceSummary {
  favoriteCities?: string[];
  favoriteCategories?: string[];
  dietaryPreferences?: string[];
  dietaryRestrictions?: string[];
  travelStyle?: string | null;
  pricePreference?: number | null;
  interests?: string[];
}

interface UserSettingsSummary {
  privacyMode?: boolean;
  allowTracking?: boolean;
  emailNotifications?: boolean;
}

interface RecentSearchSummary {
  query: string;
  timestamp: string;
}

interface DestinationRecordSummary {
  id: number;
  slug: string;
  name?: string;
  city?: string;
  category?: string;
  tags: string[];
  description?: string | null;
  content?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  priceLevel?: number | null;
  cachedWeather?: WeatherData | null;
  cachedEvents?: Event[];
}

interface AggregatedContext {
  user: {
    profile: UserProfileSummary | null;
    preferences: UserPreferenceSummary | null;
    settings: UserSettingsSummary | null;
  };
  activity: {
    recentSearches: RecentSearchSummary[];
  };
  destination: {
    record: DestinationRecordSummary | null;
    metadata: DestinationMetadata | null;
    related: DestinationMetadata[];
  };
  live: {
    weather: WeatherData | null;
    events: Event[];
    source: 'live' | 'cached' | null;
  };
  prompt: string;
}

export class IntelligenceContextAggregator {
  private supabase;

  constructor() {
    try {
      this.supabase = createServiceRoleClient();
    } catch (error) {
      this.supabase = null;
    }
  }

  async buildContext(options: AggregatorOptions = {}): Promise<AggregatedContext> {
    const {
      userId,
      destinationId,
      destinationSlug,
      city,
      coordinates,
      recentSearchLimit = 8,
      skipLiveProviders = false,
    } = options;

    const context: AggregatedContext = {
      user: {
        profile: null,
        preferences: null,
        settings: null,
      },
      activity: {
        recentSearches: [],
      },
      destination: {
        record: null,
        metadata: null,
        related: [],
      },
      live: {
        weather: null,
        events: [],
        source: null,
      },
      prompt: '',
    };

    let resolvedSlug = destinationSlug?.toLowerCase();
    let resolvedCity = city;
    let resolvedCoordinates = coordinates ? { ...coordinates } : undefined;

    if (userId && this.supabase) {
      const [userSummary, recentSearches] = await Promise.all([
        this.fetchUserSummaries(userId),
        this.fetchRecentSearches(userId, recentSearchLimit),
      ]);

      context.user = userSummary;
      context.activity.recentSearches = recentSearches;
    }

    let destinationRecord: DestinationRecordSummary | null = null;
    if (this.supabase && (destinationId || resolvedSlug)) {
      destinationRecord = await this.fetchDestinationRecord({
        destinationId,
        destinationSlug: resolvedSlug,
      });

      if (destinationRecord) {
        context.destination.record = destinationRecord;
        if (!resolvedSlug) {
          resolvedSlug = destinationRecord.slug.toLowerCase();
        }
        if (!resolvedCity && destinationRecord.city) {
          resolvedCity = destinationRecord.city;
        }
        if (
          !resolvedCoordinates &&
          isNumber(destinationRecord.latitude) &&
          isNumber(destinationRecord.longitude)
        ) {
          resolvedCoordinates = {
            lat: destinationRecord.latitude!,
            lng: destinationRecord.longitude!,
          };
        }

        if (destinationRecord.cachedWeather) {
          context.live.weather = destinationRecord.cachedWeather;
          context.live.source = 'cached';
        }

        if (destinationRecord.cachedEvents?.length) {
          context.live.events = destinationRecord.cachedEvents;
        }
      }
    }

    if (resolvedSlug) {
      const metadata = getDestinationMetadataBySlug(resolvedSlug);
      if (metadata) {
        context.destination.metadata = metadata;
        if (!resolvedCity && metadata.city) {
          resolvedCity = metadata.city;
        }
        if (!resolvedCoordinates && metadata.coordinates) {
          resolvedCoordinates = metadata.coordinates;
        }
      }
    }

    if (resolvedCity) {
      const related = getDestinationsByCity(resolvedCity)
        .filter(dest => dest.slug.toLowerCase() !== (resolvedSlug || ''))
        .slice(0, 5);
      context.destination.related = related;
    }

    if (!skipLiveProviders && resolvedCoordinates) {
      const [weather, events] = await Promise.all([
        fetchWeather(resolvedCoordinates.lat, resolvedCoordinates.lng),
        fetchNearbyEvents(resolvedCoordinates.lat, resolvedCoordinates.lng, 15, 6),
      ]);

      if (weather) {
        context.live.weather = weather;
        context.live.source = 'live';
      }

      if (events.length > 0) {
        context.live.events = events;
      }
    } else if (context.live.weather && !context.live.source) {
      context.live.source = 'cached';
    }

    context.prompt = this.composePromptContext(context);

    return context;
  }

  private async fetchUserSummaries(userId: string): Promise<AggregatedContext['user']> {
    if (!this.supabase) {
      return {
        profile: null,
        preferences: null,
        settings: null,
      };
    }

    try {
      const [profileResult, preferenceResult] = await Promise.all([
        this.supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, website, instagram_handle')
          .eq('id', userId)
          .maybeSingle(),
        this.supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

      const profile = profileResult.data;
      const preferences = preferenceResult.data;

      const userProfile: UserProfileSummary | null = profile
        ? {
            id: profile.id,
            username: profile.username,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            bio: profile.bio,
            website: profile.website,
            instagramHandle: profile.instagram_handle,
            displayName:
              (preferences as any)?.display_name || profile.full_name || profile.username,
          }
        : null;

      const userPreferences: UserPreferenceSummary | null = preferences
        ? {
            favoriteCities: toStringArray(preferences.favorite_cities),
            favoriteCategories: toStringArray(preferences.favorite_categories),
            dietaryPreferences: toStringArray(
              preferences.dietary_preferences || preferences.dietary_restrictions
            ),
            dietaryRestrictions: toStringArray(preferences.dietary_restrictions),
            travelStyle: preferences.travel_style,
            pricePreference: preferences.price_preference,
            interests: toStringArray(preferences.interests),
          }
        : null;

      const settings: UserSettingsSummary | null = preferences
        ? {
            privacyMode: preferences.privacy_mode ?? undefined,
            allowTracking: preferences.allow_tracking ?? undefined,
            emailNotifications: preferences.email_notifications ?? undefined,
          }
        : null;

      return {
        profile: userProfile,
        preferences: userPreferences,
        settings,
      };
    } catch (error) {
      console.error('ContextAggregator: failed to fetch user data', error);
      return {
        profile: null,
        preferences: null,
        settings: null,
      };
    }
  }

  private async fetchRecentSearches(
    userId: string,
    limit: number,
  ): Promise<RecentSearchSummary[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('user_interactions')
        .select('search_query, created_at')
        .eq('user_id', userId)
        .eq('interaction_type', 'search')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return [];
      }

      return data
        .filter(record => Boolean(record.search_query))
        .map(record => ({
          query: record.search_query as string,
          timestamp: record.created_at,
        }));
    } catch (error) {
      console.error('ContextAggregator: failed to fetch recent searches', error);
      return [];
    }
  }

  private async fetchDestinationRecord({
    destinationId,
    destinationSlug,
  }: {
    destinationId?: number;
    destinationSlug?: string;
  }): Promise<DestinationRecordSummary | null> {
    if (!this.supabase) return null;

    try {
      let query = this.supabase
        .from('destinations')
        .select(
          'id, slug, name, city, category, tags, content, description, latitude, longitude, rating, price_level, current_weather_json, nearby_events_json'
        )
        .limit(1);

      if (destinationId) {
        query = query.eq('id', destinationId);
      } else if (destinationSlug) {
        query = query.eq('slug', destinationSlug);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        console.warn('ContextAggregator: destination lookup failed', error?.message);
        return null;
      }

      return this.normalizeDestinationRecord(data);
    } catch (error) {
      console.error('ContextAggregator: error fetching destination record', error);
      return null;
    }
  }

  private normalizeDestinationRecord(record: any): DestinationRecordSummary {
    const tags = toStringArray(record.tags || record.card_tags);
    const cachedWeather = parseJson<WeatherData>(record.current_weather_json);
    const cachedEvents = parseJson<Event[]>(record.nearby_events_json) || [];

    return {
      id: record.id,
      slug: (record.slug || '').toString(),
      name: record.name || undefined,
      city: record.city || undefined,
      category: record.category || undefined,
      tags,
      description: record.description || record.summary || null,
      content: record.content || null,
      latitude: record.latitude ?? null,
      longitude: record.longitude ?? null,
      rating: isNumber(record.rating) ? record.rating : null,
      priceLevel: isNumber(record.price_level) ? record.price_level : null,
      cachedWeather: cachedWeather || null,
      cachedEvents,
    };
  }

  private composePromptContext(context: AggregatedContext): string {
    const sections: string[] = [];

    const { profile, preferences } = context.user;
    if (profile || preferences) {
      const lines: string[] = [];

      if (profile) {
        const profileParts: string[] = [];
        if (profile.displayName) {
          profileParts.push(`Display name: ${profile.displayName}`);
        }
        if (profile.username && profile.username !== profile.displayName) {
          profileParts.push(`Username: @${profile.username}`);
        }
        if (profile.bio) {
          profileParts.push(`Bio: ${profile.bio}`);
        }
        if (profile.website) {
          profileParts.push(`Website: ${profile.website}`);
        }
        if (profile.instagramHandle) {
          profileParts.push(`Instagram: @${profile.instagramHandle}`);
        }

        if (profileParts.length > 0) {
          lines.push(profileParts.join('\n'));
        }
      }

      if (preferences) {
        const preferenceParts: string[] = [];
        if (preferences.favoriteCities?.length) {
          preferenceParts.push(`Favorite cities: ${preferences.favoriteCities.join(', ')}`);
        }
        if (preferences.favoriteCategories?.length) {
          preferenceParts.push(
            `Preferred categories: ${preferences.favoriteCategories.join(', ')}`,
          );
        }
        if (preferences.travelStyle) {
          preferenceParts.push(`Travel style: ${preferences.travelStyle}`);
        }
        if (preferences.pricePreference) {
          preferenceParts.push(`Price preference: ${'$'.repeat(preferences.pricePreference)}`);
        }
        const dietary = preferences.dietaryPreferences || preferences.dietaryRestrictions;
        if (dietary?.length) {
          preferenceParts.push(`Dietary considerations: ${dietary.join(', ')}`);
        }
        if (preferences.interests?.length) {
          preferenceParts.push(`Interests: ${preferences.interests.join(', ')}`);
        }

        if (preferenceParts.length > 0) {
          lines.push(preferenceParts.join('\n'));
        }
      }

      if (context.activity.recentSearches.length > 0) {
        const searchSummary = context.activity.recentSearches
          .slice(0, 5)
          .map(search => `• ${search.query}`)
          .join('\n');
        lines.push(`Recent searches:\n${searchSummary}`);
      }

      if (lines.length > 0) {
        sections.push(`User context:\n${lines.join('\n\n')}`);
      }
    }

    const { record, metadata, related } = context.destination;
    if (record || metadata) {
      const lines: string[] = [];
      const name = record?.name || metadata?.name;
      const city = record?.city || metadata?.city;
      const category = record?.category || metadata?.category;
      if (name) {
        lines.push(`Destination: ${name}${city ? ` (${city})` : ''}`);
      } else if (city) {
        lines.push(`Destination city: ${city}`);
      }
      if (category) {
        lines.push(`Category: ${category}`);
      }
      const tags = record?.tags?.length ? record.tags : metadata?.highlights;
      if (tags && tags.length) {
        lines.push(`Highlights: ${tags.slice(0, 6).join(', ')}`);
      }
      const description = record?.description || metadata?.summary;
      if (description) {
        lines.push(`Summary: ${description}`);
      }
      if (record?.rating) {
        lines.push(`Rating: ${record.rating}/5`);
      }
      if (related.length > 0) {
        lines.push(
          `Other notable spots in ${city || metadata?.city}: ${related
            .slice(0, 3)
            .map(dest => dest.name)
            .join(', ')}`,
        );
      }

      if (lines.length > 0) {
        sections.push(`Destination context:\n${lines.join('\n')}`);
      }
    }

    const { weather, events, source } = context.live;
    if (weather || events.length > 0) {
      const lines: string[] = [];
      if (weather?.current) {
        const weatherLine = `${Math.round(weather.current.temperature)}°C, ${weather.current.weatherDescription}`;
        lines.push(`Weather (${source === 'live' ? 'live' : 'cached'}): ${weatherLine}`);
      }
      if (events.length > 0) {
        const eventSummary = events
          .slice(0, 3)
          .map(event => `${event.name} on ${formatDate(event.startDate)}`)
          .join('; ');
        lines.push(`Upcoming events: ${eventSummary}`);
      }
      if (lines.length > 0) {
        sections.push(`Live context:\n${lines.join('\n')}`);
      }
    }

    return sections.join('\n\n');
  }
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter(item => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }
  return [];
}

function parseJson<T>(value: unknown): T | null {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  if (typeof value !== 'string') return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return 'unknown date';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const intelligenceContextAggregator = new IntelligenceContextAggregator();
