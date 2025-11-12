'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompactResponseSection, type Message } from '@/src/features/search/CompactResponseSection';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { DestinationCard } from '@/components/DestinationCard';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ContextualLoadingState } from '@/components/ContextualLoadingState';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { MultiplexAd } from '@/components/GoogleAd';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemsPerPage } from '@/hooks/useGridColumns';

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

type SuggestedPersonalizationChip = {
  label: string;
  refinement: string;
  type: 'category' | 'city';
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows

  const [searchState, setSearchState] = useState<SearchState>({
    originalQuery: query,
    refinements: [],
    allResults: [],
    filteredResults: [],
    conversationHistory: [],
    suggestions: [],
  });
  const [suggestedFilters, setSuggestedFilters] = useState<SuggestedPersonalizationChip[]>([]);
  const [suggestedSource, setSuggestedSource] = useState<'user' | 'default'>('default');

  const performInitialSearch = useCallback(async (searchQuery: string) => {
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
      setCurrentPage(1); // Reset to first page on new search
    } catch (error) {
      console.error('Search error:', error);
      setSearchState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (query) performInitialSearch(query);
  }, [query, performInitialSearch]);

  useEffect(() => {
    let isMounted = true;

    async function loadPersonalization() {
      try {
        const res = await fetch('/api/search/personalization');
        if (!res.ok) return;

        const data = await res.json();
        if (!isMounted) return;

        const categoryChips: SuggestedPersonalizationChip[] = Array.isArray(data.suggestedCategories)
          ? data.suggestedCategories.map((category: string) => ({
              label: category,
              refinement: category,
              type: 'category' as const,
            }))
          : [];
        const cityChips: SuggestedPersonalizationChip[] = Array.isArray(data.suggestedCities)
          ? data.suggestedCities.map((city: string) => ({
              label: `In ${city}`,
              refinement: `in ${city}`,
              type: 'city' as const,
            }))
          : [];

        setSuggestedFilters([...categoryChips, ...cityChips]);
        if (data.source === 'user' || data.source === 'default') {
          setSuggestedSource(data.source);
        }
      } catch (error) {
        console.error('Failed to load personalization seeds', error);
      }
    }

    void loadPersonalization();

    return () => {
      isMounted = false;
    };
  }, []);

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
    setCurrentPage(1); // Reset to first page on filter change
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
      setCurrentPage(1); // Reset to first page on follow-up

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
    setCurrentPage(1); // Reset to first page when clearing filters
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
    <div className="w-full um-site-container py-10">
      <p className="text-xs tracking-widest text-neutral-400 mb-8">
        {new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}
      </p>

      {suggestedFilters.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[3px] text-amber-700 dark:text-amber-300">
              Suggested for you
            </span>
            {suggestedSource === 'default' && (
              <span className="text-[0.6rem] uppercase tracking-[2px] text-neutral-400">
                Popular starters
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedFilters.map((chip, index) => (
              <button
                key={`${chip.type}-${chip.refinement}-${index}`}
                onClick={() => handleRefinement(chip.refinement)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-300 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-100"
              >
                <span aria-hidden className="text-[0.75rem]">✨</span>
                {chip.label}
                <span className="hidden text-[0.6rem] uppercase tracking-[1.5px] text-amber-600 dark:text-amber-300 md:inline">
                  {chip.type === 'city' ? 'City' : 'Category'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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

          {(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedResults = searchState.filteredResults.slice(startIndex, endIndex);
            const totalPages = Math.ceil(searchState.filteredResults.length / itemsPerPage);

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                  {paginatedResults.map((d, idx) => (
                    <DestinationCard
            key={d.id}
            destination={d as any}
            onClick={() => router.push(`/destination/${(d as any).slug || d.id}`)}
                      index={startIndex + idx}
                      showBadges={true}
          />
        ))}
      </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 w-full flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 sm:px-5 py-2.5 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 sm:px-3.5 py-2.5 text-xs rounded-2xl transition-all duration-200 ease-out ${
                              currentPage === pageNum
                                ? 'bg-black dark:bg-white text-white dark:text-black font-medium shadow-sm'
                                : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm font-medium'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 sm:px-5 py-2.5 text-xs font-medium border border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm transition-all duration-200 ease-out disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>

                    <span className="hidden sm:inline-block ml-4 text-xs text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                )}

      {searchState.refinements.length > 0 && (
        <button onClick={clearFilters} className="mt-6 text-sm text-neutral-500 hover:text-neutral-900">
          Clear all filters
        </button>
                )}
              </>
            );
          })()}

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
    <Suspense fallback={
      <div className="um-site-container py-10">
        <div className="text-sm text-neutral-500 mb-4">with our in-house travel intelligence…</div>
        <Skeleton className="h-4 w-48 rounded mb-6" />
        <Skeleton className="h-5 w-80 rounded mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
      {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
      ))}
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}


