'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { CompactResponseSection, type Message } from '@/src/features/search/CompactResponseSection';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { CARD_WRAPPER, CARD_MEDIA, CARD_TITLE, CARD_META } from '@/components/CardStyles';
import Image from 'next/image';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ContextualLoadingState } from '@/components/ContextualLoadingState';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { MapPin } from 'lucide-react';

// ⚡ OPTIMIZATION #9: Dynamic imports for code splitting (reduces initial bundle by ~200KB)
// Ads are heavy and not critical for initial page load
const MultiplexAd = dynamic(() => import('@/components/GoogleAd').then(mod => ({ default: mod.MultiplexAd })), {
  loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded" />,
  ssr: false, // Ads don't need SSR
});

interface Destination {
  id: number;
  name: string;
  city?: string;
  category?: string;
  description?: string;
  image?: string;
  michelin_stars?: number;
  is_open_now?: boolean;
  price_level?: number;
}

interface SearchState {
  originalQuery: string;
  refinements: string[];
  allResults: Destination[];
  filteredResults: Destination[];
  conversationHistory: Message[];
  suggestions: Array<{ label: string; refinement: string }>;
  intent?: ExtractedIntent;
  isLoading?: boolean;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [searchState, setSearchState] = useState<SearchState>({
    originalQuery: query,
    refinements: [],
    allResults: [],
    filteredResults: [],
    conversationHistory: [],
    suggestions: [],
  });

  useEffect(() => {
    if (query) performInitialSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Recompute suggestions whenever filtered results or refinements change
  useEffect(() => {
    async function updateSuggestions() {
      const newSuggestions = await generateSuggestions({
        query: searchState.originalQuery,
        results: searchState.filteredResults,
        refinements: searchState.refinements,
        filters: { /* could pass openNow/price if present */ },
      });
      setSearchState((prev) => ({
        ...prev,
        suggestions: newSuggestions,
      }));
    }
    if (searchState.filteredResults.length > 0) {
      updateSuggestions();
    }
  }, [searchState.filteredResults, searchState.refinements, searchState.originalQuery]);

  async function performInitialSearch(searchQuery: string) {
    setSearchState(prev => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch(`/api/search/intelligent?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      const results: Destination[] = data.results || [];

      setSearchState({
        originalQuery: searchQuery,
        refinements: [],
        allResults: results,
        filteredResults: results,
        conversationHistory: data.contextResponse ? [{ role: 'assistant', content: data.contextResponse }] : [],
        suggestions: data.suggestions || [],
        intent: data.intent,
        isLoading: false,
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({ ...prev, isLoading: false }));
    }
  }

  async function handleRefinement(refinement: string) {
    const newRefinements = [...searchState.refinements, refinement];
    const res = await fetch('/api/search/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalQuery: searchState.originalQuery,
        refinements: newRefinements,
        allResults: searchState.allResults.map((r) => r.id),
      }),
    });
    const data = await res.json();

    setSearchState((prev) => ({
      ...prev,
      refinements: newRefinements,
      filteredResults: data.filteredResults || [],
      conversationHistory: ([
        ...prev.conversationHistory,
        { role: 'user' as const, content: refinement },
        ...(data.contextResponse ? [{ role: 'assistant' as const, content: data.contextResponse }] : []),
      ]) as Message[],
      // Keep initial suggestions for now; can evolve to state-driven
    }));
  }

  async function handleFollowUp(message: string): Promise<string> {
    try {
      const res = await fetch('/api/search/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: searchState.originalQuery,
          followUpMessage: message,
          conversationHistory: searchState.conversationHistory,
          currentResults: searchState.filteredResults.map((r) => ({ id: r.id })),
          refinements: searchState.refinements,
          intent: searchState.intent, // Pass the original intent to preserve context
        }),
      });

      if (!res.ok) {
        throw new Error('Follow-up search failed');
      }

      const data = await res.json();
      const results: Destination[] = data.results || [];

      setSearchState((prev) => ({
        ...prev,
        refinements: [...prev.refinements, message],
        filteredResults: results,
        allResults: results.length > prev.allResults.length ? results : prev.allResults,
        conversationHistory: [
          ...prev.conversationHistory,
          { role: 'user' as const, content: message },
          ...(data.contextResponse ? [{ role: 'assistant' as const, content: data.contextResponse }] : []),
        ] as Message[],
        suggestions: data.suggestions || prev.suggestions,
      }));

      return data.contextResponse || '';
    } catch (error) {
      console.error('Follow-up error:', error);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  function handleChipClick(chipRefinement: string) {
    handleRefinement(chipRefinement);
  }

  function clearFilters() {
    setSearchState((prev) => ({
      ...prev,
      refinements: [],
      filteredResults: prev.allResults,
      conversationHistory: ([
        ...prev.conversationHistory,
        { role: 'assistant' as const, content: `Filters cleared. Showing all ${prev.allResults.length} results.` },
      ]) as Message[],
    }));
  }

  function handleIntentChipRemove(chipType: string, value: string) {
    // When user removes an intent chip, perform a new search without that constraint
    let newQuery = searchState.originalQuery;

    if (chipType === 'city') {
      newQuery = newQuery.replace(new RegExp(value, 'gi'), '').trim();
    } else if (chipType === 'category') {
      newQuery = newQuery.replace(new RegExp(value, 'gi'), '').trim();
    }

    if (newQuery && newQuery !== searchState.originalQuery) {
      performInitialSearch(newQuery);
    }
  }

  function handleAlternativeClick(alternative: string) {
    performInitialSearch(alternative);
  }

  return (
    <div className="px-6 md:px-10 py-10">
      <p className="text-xs tracking-widest text-neutral-400 mb-8">
        {new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}
      </p>

      <CompactResponseSection
        query={searchState.originalQuery}
        messages={searchState.conversationHistory}
        suggestions={searchState.suggestions}
        onChipClick={handleChipClick}
        onFollowUp={handleFollowUp}
      />

      {/* Intent Confirmation Chips */}
      {searchState.intent && !searchState.isLoading && (
        <div className="mb-6">
          <IntentConfirmationChips
            intent={searchState.intent}
            onChipRemove={handleIntentChipRemove}
            editable={true}
          />
        </div>
      )}

      {/* Loading State */}
      {searchState.isLoading && (
        <ContextualLoadingState intent={searchState.intent} query={searchState.originalQuery} />
      )}

      {/* Empty State */}
      {!searchState.isLoading && searchState.filteredResults.length === 0 && searchState.originalQuery && (
        <SmartEmptyState
          query={searchState.originalQuery}
          intent={searchState.intent}
          onAlternativeClick={handleAlternativeClick}
        />
      )}

      {/* Results */}
      {!searchState.isLoading && searchState.filteredResults.length > 0 && (
        <>
          <div className="mb-4 text-sm text-neutral-500">
            Showing {searchState.filteredResults.length}
            {searchState.allResults.length > 0 && searchState.filteredResults.length !== searchState.allResults.length && (
              <span> of {searchState.allResults.length}</span>
            )}
            {searchState.refinements.length > 0 && (
              <span> (filtered by: {searchState.refinements.join(', ')})</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
            {searchState.filteredResults.map((d, idx) => (
              <button
                key={d.id}
                onClick={() => router.push(`/destination/${(d as any).slug || d.id}`)}
                className={`${CARD_WRAPPER} text-left w-full`}
              >
                <div className={`${CARD_MEDIA} mb-2`}>
                  {d.image ? (
                    <Image
                      src={d.image}
                      alt={d.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <MapPin className="h-12 w-12 opacity-20" />
                    </div>
                  )}
                  {d.michelin_stars && d.michelin_stars > 0 && (
                    <div className="absolute bottom-2 left-2 px-3 py-1 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-600 dark:text-gray-400 text-xs bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center gap-1.5">
                      <img
                        src="https://guide.michelin.com/assets/images/icons/1star-1f2c04d7e6738e8a3312c9cda4b64fd0.svg"
                        alt="Michelin star"
                        className="h-3 w-3"
                      />
                      <span>{d.michelin_stars}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <h3 className={CARD_TITLE}>{d.name}</h3>
                  <div className={CARD_META}>
                    {d.city && (
                      <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                        {d.city}
                      </span>
                    )}
                    {d.category && (
                      <>
                        <span className="text-gray-300 dark:text-gray-700">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500 capitalize line-clamp-1">
                          {d.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {searchState.refinements.length > 0 && (
            <button onClick={clearFilters} className="mt-6 text-sm text-neutral-500 hover:text-neutral-900">
              Clear all filters
            </button>
          )}

          {/* Ad after grid */}
          <div className="mt-8">
            <MultiplexAd slot="3271683710" />
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6 md:px-10 py-10"><div className="text-sm text-neutral-500 mb-4">with our in-house travel intelligence…</div><div className="h-4 w-48 bg-gray-200 rounded mb-6" /><div className="h-5 w-80 bg-gray-200 rounded mb-8" /><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-gray-200" />
      ))}
    </div></div>}>
      <SearchPageContent />
    </Suspense>
  );
}


