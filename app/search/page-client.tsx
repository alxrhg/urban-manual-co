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
      }));

      return data.contextResponse || '';
    } catch (error) {
      console.error('Follow-up error:', error);
      return '';
    }
  }

  function handlePagination(pageNumber: number) {
    setCurrentPage(pageNumber);
  }

  // Compute displayed results based on pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedResults = searchState.filteredResults.slice(startIndex, endIndex);

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Search Results{searchState.originalQuery ? ` for "${searchState.originalQuery}"` : ''}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Discover curated recommendations from The Urban Manual. Refine your search or explore personalized suggestions.
          </p>
        </div>
        {searchState.intent && (
          <IntentConfirmationChips
            intent={searchState.intent}
            onConfirm={(refinement) => handleRefinement(refinement)}
          />
        )}
      </div>

      {searchState.isLoading ? (
        <ContextualLoadingState heading="Loading curated recommendations" />
      ) : (
        <div className="grid gap-6 md:grid-cols-[300px,1fr]">
          <div className="space-y-6">
            <CompactResponseSection
              isLoading={searchState.isLoading}
              messages={searchState.conversationHistory}
              onFollowUp={handleFollowUp}
            />

            {searchState.suggestions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-white">Suggested refinements</h2>
                <div className="flex flex-wrap gap-2">
                  {searchState.suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.refinement}-${index}`}
                      onClick={() => handleRefinement(suggestion.refinement)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white transition hover:bg-white/10"
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <MultiplexAd className="hidden w-full overflow-hidden rounded-3xl border border-white/10 md:block" />
          </div>

          <div className="space-y-6">
            {searchState.filteredResults.length === 0 ? (
              <SmartEmptyState
                title="No curated matches yet"
                description="Try adjusting your refinements or explore personalized suggestions to discover more urban gems."
                onAction={() => router.push('/destinations')}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {displayedResults.length > 0 ? (
                    displayedResults.map((destination) => (
                      <DestinationCard key={destination.id} destination={destination} />
                    ))
                  ) : (
                    Array.from({ length: itemsPerPage }).map((_, index) => (
                      <Skeleton key={index} className="h-64 rounded-3xl border border-white/10 bg-white/5" />
                    ))
                  )}
                </div>

                {searchState.filteredResults.length > itemsPerPage && (
                  <div className="flex items-center justify-center gap-2">
                    {Array.from({
                      length: Math.ceil(searchState.filteredResults.length / itemsPerPage),
                    }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handlePagination(index + 1)}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          currentPage === index + 1
                            ? 'bg-white text-black'
                            : 'border border-white/10 bg-transparent text-white hover:border-white/30'
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                )}

                <div className="md:hidden">
                  <MultiplexAd className="w-full overflow-hidden rounded-3xl border border-white/10" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPageClient() {
  return (
    <Suspense fallback={<ContextualLoadingState heading="Preparing search experience" />}>
      <SearchPageContent />
    </Suspense>
  );
}

