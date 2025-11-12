'use client';

import {
  useEffect,
  useState,
  useCallback,
  memo,
  useRef,
  useMemo,
} from 'react';
import Image from 'next/image';
import { MapPin, Sparkles, X, PlusCircle } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { CARD_MEDIA, CARD_META, CARD_TITLE, CARD_WRAPPER } from './CardStyles';
import { Destination } from '@/types/destination';
import { UserProfile } from '@/types/personalization';
import { RefinementChips, type RefinementTag } from './RefinementChips';
import { getSessionId } from '@/lib/tracking';

interface SmartRecommendationsProps {
  onCardClick?: (destination: Destination) => void;
  userProfile?: UserProfile | null;
}

interface RecommendationWithReason {
  destination: Destination;
  reason?: string;
  score?: number;
}

interface PreferenceChipConfig {
  type: 'city' | 'category';
  value: string;
  label: string;
}

function normalizeDestination(raw: unknown): Destination | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;

  const ensureString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value : undefined;

  const slug = ensureString(record.slug);
  const name = ensureString(record.name);
  const city = ensureString(record.city);
  const category = ensureString(record.category);

  if (!slug || !name || !city || !category) {
    return null;
  }

  const imageCandidates: Array<unknown> = [
    record.image,
    record.image_url,
    record.primary_photo_url,
    record.hero_image,
  ];

  const photosValue = record.photos_json;
  if (photosValue) {
    try {
      const parsed = Array.isArray(photosValue)
        ? photosValue
        : typeof photosValue === 'string'
          ? JSON.parse(photosValue)
          : [];
      if (Array.isArray(parsed)) {
        const firstPhoto = parsed[0];
        if (typeof firstPhoto === 'string') {
          imageCandidates.push(firstPhoto);
        } else if (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto) {
          imageCandidates.push((firstPhoto as { url?: string }).url);
        }
      }
    } catch (error) {
      // Ignore parse errors and continue with other candidates
    }
  }

  const image = imageCandidates.find(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
  );

  const ratingValue = record.rating;
  const rating =
    typeof ratingValue === 'number'
      ? ratingValue
      : typeof ratingValue === 'string'
        ? Number.parseFloat(ratingValue)
        : undefined;

  const priceValue = record.price_level ?? record.priceLevel;
  const priceLevel = typeof priceValue === 'number' ? priceValue : undefined;

  const michelin =
    typeof record.michelin_stars === 'number' ? record.michelin_stars : undefined;

  const destination: Destination = {
    slug,
    name,
    city,
    category,
    id: typeof record.id === 'number' ? record.id : undefined,
    description: ensureString(record.description) ?? ensureString(record.summary),
    image: image ?? undefined,
    rating: Number.isFinite(rating) ? rating : undefined,
    price_level: Number.isFinite(priceLevel) ? priceLevel : undefined,
    michelin_stars: michelin,
  };

  if (Array.isArray(record.tags)) {
    destination.tags = record.tags as string[];
  }

  if (typeof record.crown === 'boolean') {
    destination.crown = record.crown;
  }

  return destination;
}

const STORAGE_KEY = 'um_smart_reco_preferences';
const EXPERIMENT_HEADER = 'smart-recos-v2';

type FeedbackAction = 'dismiss' | 'more_like_this';

function SmartRecommendationsComponent({ onCardClick, userProfile }: SmartRecommendationsProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationWithReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextLabel, setContextLabel] = useState<string>('For You');
  const [isVisible, setIsVisible] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<Set<string>>(new Set());
  const [preferencesReady, setPreferencesReady] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const sessionIdRef = useRef<string>('');

  const preferenceChips = useMemo<PreferenceChipConfig[]>(() => {
    const chips: PreferenceChipConfig[] = [];
    const seen = new Set<string>();

    const pushChip = (type: PreferenceChipConfig['type'], value?: string | null) => {
      if (!value) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = `${type}-${trimmed.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      chips.push({
        type,
        value: trimmed.toLowerCase(),
        label: trimmed,
      });
    };

    userProfile?.favorite_cities?.forEach((city) => pushChip('city', city));
    userProfile?.favorite_categories?.forEach((category) => pushChip('category', category));

    return chips;
  }, [userProfile?.favorite_cities, userProfile?.favorite_categories]);

  const [activePreferenceKeys, setActivePreferenceKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    sessionIdRef.current = getSessionId();
  }, []);

  useEffect(() => {
    if (preferencesReady) {
      return;
    }

    if (preferenceChips.length === 0) {
      setPreferencesReady(true);
      return;
    }

    let storedKeys: string[] | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            storedKeys = parsed.filter((value) => typeof value === 'string');
          }
        }
      } catch (error) {
        console.warn('Failed to read stored smart recommendation preferences:', error);
      }
    }

    const defaultKeys =
      storedKeys && storedKeys.length > 0
        ? new Set(storedKeys)
        : new Set(preferenceChips.map((chip) => `${chip.type}-${chip.value}`));

    setActivePreferenceKeys(defaultKeys);
    setPreferencesReady(true);
  }, [preferenceChips, preferencesReady]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const values = Array.from(activePreferenceKeys);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch (error) {
      console.warn('Failed to persist smart recommendation preferences:', error);
    }
  }, [activePreferenceKeys]);

  const preferenceWeights = useMemo(() => {
    if (preferenceChips.length === 0) {
      return undefined;
    }

    const selectedKeys = Array.from(activePreferenceKeys);
    const hasSelections = selectedKeys.length > 0;

    const cities: Record<string, number> = {};
    const categories: Record<string, number> = {};

    preferenceChips.forEach((chip) => {
      const key = `${chip.type}-${chip.value}`;
      const isActive = hasSelections ? activePreferenceKeys.has(key) : true;
      const weight = isActive ? 1.25 : 0.85;
      if (chip.type === 'city') {
        cities[chip.value] = weight;
      } else if (chip.type === 'category') {
        categories[chip.value] = weight;
      }
    });

    const payload: {
      cities?: Record<string, number>;
      categories?: Record<string, number>;
      selectedKeys?: string[];
    } = {};

    if (Object.keys(cities).length > 0) {
      payload.cities = cities;
    }
    if (Object.keys(categories).length > 0) {
      payload.categories = categories;
    }
    if (hasSelections) {
      payload.selectedKeys = selectedKeys;
    }

    return payload;
  }, [activePreferenceKeys, preferenceChips]);

  const preferenceTags = useMemo<RefinementTag[]>(() =>
    preferenceChips.map((chip) => ({
      type: chip.type,
      value: chip.value,
      label: chip.label,
    })),
  [preferenceChips]);

  const computeContextLabel = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFridayEvening = dayOfWeek === 5 && hour >= 17;

    if (isWeekend) return 'Weekend Picks';
    if (isFridayEvening) return 'Weekend is Near';
    if (hour >= 17 && hour <= 22) return 'Tonight';
    if (hour >= 6 && hour <= 11) return 'Morning Favorites';
    return 'For You';
  }, []);

  const loadSmartRecommendations = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setContextLabel(computeContextLabel());

    let loaded = false;

    const buildRecommendation = (item: unknown): RecommendationWithReason | null => {
      if (typeof item !== 'object' || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      const destination = normalizeDestination(record.destination ?? item);
      if (!destination) {
        return null;
      }

      return {
        destination,
        reason: typeof record.reason === 'string' ? record.reason : undefined,
        score: typeof record.score === 'number' ? record.score : undefined,
      };
    };

    try {
      const payload: Record<string, unknown> = { limit: 12 };
      if (preferenceWeights) {
        payload.preferenceWeights = preferenceWeights;
      }

      const response = await fetch('/api/intelligence/recommendations/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Experiment-Variant': EXPERIMENT_HEADER,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
          const normalized = data.recommendations
            .map((item: unknown) => buildRecommendation(item))
            .filter((value): value is RecommendationWithReason => Boolean(value));

          if (normalized.length > 0) {
            setRecommendations(normalized);
            loaded = true;
          }
        }
      } else {
        console.warn('Advanced recommendations API returned an error', await response.text());
      }
    } catch (error) {
      console.warn('Advanced recommendations API failed, attempting fallback:', error);
    }

    if (!loaded) {
      try {
        const now = new Date();
        const fallbackResponse = await fetch('/api/discovery/recommendations/contextual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            context: {
              time: now.toISOString(),
              weather: null,
              city: null,
            },
            pageSize: 12,
          }),
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
            const transformed = data.recommendations
              .map((rec: unknown) => {
                if (typeof rec !== 'object' || rec === null) {
                  return null;
                }
                const record = rec as Record<string, unknown>;
                const slugCandidate = typeof record.slug === 'string'
                  ? record.slug
                  : record.id !== undefined
                    ? String(record.id)
                    : undefined;
                let imageCandidate: string | undefined;
                if (Array.isArray(record.images) && typeof record.images[0] === 'string') {
                  imageCandidate = record.images[0] as string;
                } else if (typeof record.image === 'string') {
                  imageCandidate = record.image;
                }
                const normalized = normalizeDestination({
                  ...record,
                  slug: slugCandidate,
                  price_level:
                    typeof record.price_level === 'number'
                      ? record.price_level
                      : record.priceLevel,
                  image: imageCandidate,
                });
                if (!normalized) {
                  return null;
                }
                if (typeof record.rating === 'number') {
                  normalized.rating = record.rating;
                }
                return {
                  destination: normalized,
                  reason: 'Contextual favorite',
                } satisfies RecommendationWithReason | null;
              })
              .filter((value): value is RecommendationWithReason => Boolean(value && value.destination?.slug && value.destination?.name));

            if (transformed.length > 0) {
              setRecommendations(transformed);
              loaded = true;
            }
          }
        }
      } catch (error) {
        console.warn('Contextual recommendations fallback failed:', error);
      }
    }

    if (!loaded) {
      try {
        const response = await fetch(`/api/recommendations/smart?context=personalized&userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.recommendations)) {
            const normalized = data.recommendations
              .map((raw: unknown) => buildRecommendation(raw))
              .filter((value): value is RecommendationWithReason => Boolean(value));
            setRecommendations(normalized);
            loaded = true;
          }
        }
      } catch (error) {
        console.error('Legacy smart recommendations failed:', error);
      }
    }

    if (!loaded) {
      setRecommendations([]);
    }

    setLoading(false);
  }, [user, preferenceWeights, computeContextLabel]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { rootMargin: '100px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isVisible && preferencesReady) {
      void loadSmartRecommendations();
    }
  }, [user, isVisible, preferencesReady, loadSmartRecommendations]);

  const handlePreferenceToggle = useCallback((tag: RefinementTag) => {
    const key = `${tag.type}-${tag.value}`;
    setActivePreferenceKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    void import('@/lib/analytics/track').then(({ trackEvent }) => {
      trackEvent({
        event_type: 'preference_toggle',
        metadata: {
          source: 'smart_recommendations',
          type: tag.type,
          value: tag.label,
          active: !activePreferenceKeys.has(key),
        },
      }).catch(() => {
        // Ignore analytics failures
      });
    });
  }, [activePreferenceKeys]);

  const updatePendingState = useCallback((slug: string, isPending: boolean) => {
    setPendingFeedback((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(slug);
      } else {
        next.delete(slug);
      }
      return next;
    });
  }, []);

  const sendFeedback = useCallback(async (
    action: FeedbackAction,
    recommendation: RecommendationWithReason
  ) => {
    const destination = recommendation.destination;
    if (!destination || !destination.slug) {
      return;
    }

    const sessionId = sessionIdRef.current || getSessionId();
    const rawId = destination.id;
    let numericId: number | undefined;
    if (typeof rawId === 'number' && Number.isFinite(rawId)) {
      numericId = rawId;
    } else if (typeof rawId === 'string') {
      const parsed = Number.parseInt(rawId, 10);
      if (Number.isFinite(parsed)) {
        numericId = parsed;
      }
    }

    try {
      await fetch('/api/profile/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Experiment-Variant': EXPERIMENT_HEADER,
        },
        body: JSON.stringify({
          action,
          destinationId: numericId,
          destinationSlug: destination.slug,
          reason: recommendation.reason,
          preferenceType: destination.category ? 'category' : destination.city ? 'city' : undefined,
          preferenceValue: destination.category ?? destination.city,
          sessionId,
          metadata: {
            source: 'smart_recommendations',
            context: contextLabel,
            selectedPreferences: Array.from(activePreferenceKeys),
          },
        }),
      });
    } catch (error) {
      console.warn('Failed to send profile feedback:', error);
    }

    void import('@/lib/analytics/track').then(({ trackEvent }) => {
      trackEvent({
        event_type: 'feedback',
        destination_id: numericId,
        destination_slug: destination.slug,
        metadata: {
          source: 'smart_recommendations',
          action,
          reason: recommendation.reason,
        },
      }).catch(() => {
        // Ignore analytics errors
      });
    });
  }, [activePreferenceKeys, contextLabel]);

  const handleFeedbackAction = useCallback(async (
    action: FeedbackAction,
    recommendation: RecommendationWithReason
  ) => {
    const slug = recommendation.destination.slug;
    updatePendingState(slug, true);

    try {
      await sendFeedback(action, recommendation);

      if (action === 'dismiss') {
        setRecommendations((prev) => prev.filter((item) => item.destination.slug !== slug));
      } else {
        await loadSmartRecommendations();
      }
    } finally {
      updatePendingState(slug, false);
    }
  }, [loadSmartRecommendations, sendFeedback, updatePendingState]);

  if (!user) return null;
  if (loading && recommendations.length === 0) return null;
  if (!recommendations.length) return null;

  return (
    <section ref={sectionRef} className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-gray-400" />
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
          {contextLabel}
        </h2>
      </div>

      {preferenceTags.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-[1.5px]">
              Tune your picks
            </span>
            {loading && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">Refreshing…</span>
            )}
          </div>
          <RefinementChips
            tags={preferenceTags}
            onChipClick={handlePreferenceToggle}
            activeTags={activePreferenceKeys}
          />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
        {recommendations.slice(0, 7).map((rec) => {
          const destination = rec.destination;
          const isPending = pendingFeedback.has(destination.slug);

          return (
            <div key={destination.slug} className="flex flex-col">
              <button
                onClick={() => {
                  if (onCardClick) {
                    onCardClick(destination);
                  }
                }}
                className={`${CARD_WRAPPER} text-left`}
                aria-label={`View ${destination.name}`}
              >
                <div className={CARD_MEDIA}>
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-8 w-8 opacity-20" />
                    </div>
                  )}
                  {rec.reason && (
                    <div className="absolute top-2 left-2 right-2 max-h-[3rem] overflow-hidden">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-gray-700 shadow-sm backdrop-blur dark:bg-gray-900/85 dark:text-gray-200">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        <span className="truncate">{rec.reason}</span>
                      </span>
                    </div>
                  )}
                  {destination.michelin_stars && destination.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                      <img
                        src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                        alt="Michelin star"
                        className="h-3 w-3"
                      />
                      <span>{destination.michelin_stars}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className={CARD_TITLE}>{destination.name}</div>
                  <div className={CARD_META}>
                    {destination.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {destination.city}
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
                  onClick={() => handleFeedbackAction('dismiss', rec)}
                  disabled={isPending}
                  aria-label={`Dismiss ${destination.name}`}
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200"
                  onClick={() => handleFeedbackAction('more_like_this', rec)}
                  disabled={isPending}
                  aria-label={`Show more like ${destination.name}`}
                >
                  <PlusCircle className="h-3 w-3" />
                  More like this
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const SmartRecommendations = memo(SmartRecommendationsComponent);
