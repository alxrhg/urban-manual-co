'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, MapPin, ArrowRight } from 'lucide-react';

import { PageContainer } from '@/components/PageContainer';
import { PageIntro } from '@/components/PageIntro';
import { DestinationCard } from '@/components/DestinationCard';
import { Destination } from '@/types/destination';
import { SmartTripPlanResponse } from '@/types/trip-guide';
import { trpc } from '@/lib/trpc/client';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Any experience' },
  { value: 'restaurant', label: 'Dining' },
  { value: 'cafe', label: 'Cafés' },
  { value: 'bar', label: 'Bars & Nightlife' },
  { value: 'museum', label: 'Museums & Culture' },
  { value: 'park', label: 'Parks & Outdoor' },
  { value: 'shopping', label: 'Shops & Boutiques' },
  { value: 'hotel', label: 'Hotels & Stays' },
  { value: 'spa', label: 'Wellness & Spa' },
];

const TAG_SUGGESTIONS = [
  'romantic',
  'cozy',
  'group',
  'family',
  'vegan',
  'vegetarian',
  'gluten_free',
  'wifi',
  'nightlife',
  'brunch',
  'upscale',
  'budget',
];

const PRICE_LABELS: Record<number, string> = {
  1: 'Casual',
  2: 'Comfortable',
  3: 'Elevated',
  4: 'Luxury',
};

interface SmartTripFormState {
  text: string;
  city: string;
  category: string;
  priceLevel?: number;
  groupSize?: number;
  days?: number;
  budget?: string;
  tags: string[];
  customTag: string;
}

const INITIAL_FORM: SmartTripFormState = {
  text: '',
  city: '',
  category: '',
  tags: [],
  customTag: '',
};

function toDestination(result: SmartTripPlanResponse['destinations'][number]): Destination {
  return {
    slug: result.slug,
    name: result.name,
    city: result.city,
    category: result.category,
    description: result.description ?? undefined,
    image: result.image || result.primary_photo_url || undefined,
    tags: result.tags ?? [],
    price_level: result.price_level ?? undefined,
    rating: result.rating ?? undefined,
  };
}

export function SmartTripGuide() {
  const router = useRouter();
  const [form, setForm] = useState<SmartTripFormState>(INITIAL_FORM);
  const [showResults, setShowResults] = useState(false);

  const mutation = trpc.tripGuide.plan.useMutation({
    onSuccess: () => {
      setShowResults(true);
    },
  });

  const destinations = useMemo(() => {
    if (!mutation.data?.destinations) return [];
    return mutation.data.destinations.map(toDestination);
  }, [mutation.data]);

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((item) => item !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      preferences: {
        text: form.text || undefined,
        city: form.city || undefined,
        category: form.category || undefined,
        tags: form.tags,
        priceLevel: form.priceLevel,
        groupSize: form.groupSize,
        days: form.days,
        budget: form.budget,
      },
    };
    mutation.mutate(payload);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setShowResults(false);
    mutation.reset();
  };

  const handleAddCustomTag = () => {
    const tag = form.customTag.trim().toLowerCase();
    if (!tag) return;
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
      customTag: '',
    }));
  };

  return (
    <PageContainer className="pb-24">
      <PageIntro
        eyebrow="Smart Trip Guide"
        title="Describe your perfect day and let us curate the plan"
        description="Share the vibe you're after and we will translate it into concrete filters, find the right places, and summarize a route for you."
        icon={Sparkles}
      />

      <section className="mt-10 grid gap-12 lg:grid-cols-[420px,1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/60"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="smart-trip-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                What would you like to experience?
              </label>
              <textarea
                id="smart-trip-text"
                value={form.text}
                onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Example: A cozy coffee crawl in Tokyo with spots good for remote work and a late-night dessert."
                rows={4}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="smart-trip-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  City
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-gray-600 dark:focus-within:ring-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <input
                    id="smart-trip-city"
                    value={form.city}
                    onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="Tokyo, Paris, Mexico City..."
                    className="flex-1 border-none bg-transparent text-sm text-gray-700 outline-none dark:text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="smart-trip-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Focus
                </label>
                <select
                  id="smart-trip-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value || 'any'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="smart-trip-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preferred price level
                </label>
                <select
                  id="smart-trip-price"
                  value={form.priceLevel?.toString() || ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priceLevel: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                >
                  <option value="">No preference</option>
                  {[1, 2, 3, 4].map((level) => (
                    <option key={level} value={level}>
                      {level} · {PRICE_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="smart-trip-budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Budget note
                </label>
                <input
                  id="smart-trip-budget"
                  value={form.budget ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                  placeholder="Under 50€ per person, Open to splurge..."
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="smart-trip-group" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Group size
                </label>
                <input
                  id="smart-trip-group"
                  type="number"
                  min={1}
                  value={form.groupSize ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      groupSize: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                />
              </div>

              <div>
                <label htmlFor="smart-trip-days" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  How many days?
                </label>
                <input
                  id="smart-trip-days"
                  type="number"
                  min={1}
                  value={form.days ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      days: event.target.value ? Number(event.target.value) : undefined,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add tags</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TAG_SUGGESTIONS.map((tag) => {
                  const selected = form.tags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selected
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      #{tag.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={form.customTag}
                  onChange={(event) => setForm((prev) => ({ ...prev, customTag: event.target.value }))}
                  placeholder="Custom tag"
                  className="flex-1 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-600 dark:focus:ring-gray-700"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTag}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900"
                >
                  Add
                </button>
              </div>
              {form.tags.length > 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Selected tags: {form.tags.map((tag) => `#${tag.replace('_', ' ')}`).join(', ')}
                </p>
              )}
            </div>

            {mutation.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                We could not plan this trip right now. Please try again.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={mutation.isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {mutation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Crafting itinerary...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate guide
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/60">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Itinerary summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {mutation.isLoading && 'Gathering curated matches based on your request...'}
              {!mutation.isLoading && mutation.data?.itinerarySummary}
              {!mutation.isLoading && !mutation.data && 'Describe what you are in the mood for and we will build the outline here.'}
            </p>
            {mutation.data?.criteria && (
              <dl className="mt-4 grid grid-cols-1 gap-3 text-xs text-gray-500 dark:text-gray-400 sm:grid-cols-2">
                {mutation.data.criteria.city && (
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">City</dt>
                    <dd>{mutation.data.criteria.city}</dd>
                  </div>
                )}
                {mutation.data.criteria.category && (
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Focus</dt>
                    <dd>{mutation.data.criteria.category}</dd>
                  </div>
                )}
                {mutation.data.criteria.tags.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Tags</dt>
                    <dd>{mutation.data.criteria.tags.map((tag) => `#${tag.replace('_', ' ')}`).join(' · ')}</dd>
                  </div>
                )}
                {mutation.data.criteria.maxPriceLevel !== undefined && (
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Max price level</dt>
                    <dd>{mutation.data.criteria.maxPriceLevel}</dd>
                  </div>
                )}
                {mutation.data.criteria.groupSize && (
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Group size</dt>
                    <dd>{mutation.data.criteria.groupSize}</dd>
                  </div>
                )}
                {mutation.data.criteria.durationDays && (
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Planned days</dt>
                    <dd>{mutation.data.criteria.durationDays}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Curated destinations</h2>
              {destinations.length > 0 && (
                <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  {destinations.length} matches
                </span>
              )}
            </div>

            {mutation.isLoading && (
              <div className="rounded-3xl border border-gray-200 bg-white/60 px-6 py-12 text-center text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
                Curating places that fit your brief...
              </div>
            )}

            {!mutation.isLoading && showResults && destinations.length === 0 && (
              <div className="rounded-3xl border border-gray-200 bg-white/60 px-6 py-12 text-center text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300">
                We did not find perfect matches. Try adjusting the city, tags, or price range.
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.slug}
                  destination={destination}
                  onClick={() => router.push(`/destination/${destination.slug}`)}
                />
              ))}
            </div>

            {destinations.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const slug = destinations[0]?.slug;
                  if (slug) router.push(`/destination/${slug}`);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:text-white"
              >
                Explore first pick
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </PageContainer>
  );
}

export default SmartTripGuide;

