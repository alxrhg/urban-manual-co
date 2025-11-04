'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompactResponseSection, type Message } from '@/components/search/CompactResponseSection';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { LovablyDestinationCard, LOVABLY_BORDER_COLORS } from '@/components/LovablyDestinationCard';

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
    setSearchState((prev) => ({
      ...prev,
      suggestions: generateSuggestions({
        query: prev.originalQuery,
        results: prev.filteredResults,
        filters: { /* could pass openNow/price if present */ },
      }),
    }));
  }, [searchState.filteredResults, searchState.refinements]);

  async function performInitialSearch(searchQuery: string) {
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
    });
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
    await handleRefinement(message);
    return '';
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

      <div className="mb-4 text-sm text-neutral-500">
        Showing {searchState.filteredResults.length}
        {searchState.refinements.length > 0 && (
          <span> (filtered by: {searchState.refinements.join(', ')})</span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {searchState.filteredResults.map((d, idx) => (
          <LovablyDestinationCard
            key={d.id}
            destination={d as any}
            borderColor={LOVABLY_BORDER_COLORS[idx % LOVABLY_BORDER_COLORS.length]}
            onClick={() => router.push(`/destination/${(d as any).slug || d.id}`)}
          />
        ))}
      </div>

      {searchState.refinements.length > 0 && (
        <button onClick={clearFilters} className="mt-6 text-sm text-neutral-500 hover:text-neutral-900">
          Clear all filters
        </button>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="px-6 md:px-10 py-10"><div className="h-4 w-48 bg-gray-200 rounded mb-6" /><div className="h-5 w-80 bg-gray-200 rounded mb-8" /><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-2xl bg-gray-200" />
      ))}
    </div></div>}>
      <SearchPageContent />
    </Suspense>
  );
}


