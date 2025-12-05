'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompactResponseSection, type Message, type ConciergeState } from '@/src/features/search/CompactResponseSection';
import { generateSuggestions } from '@/lib/search/generateSuggestions';
import { DestinationCard } from '@/components/DestinationCard';
import { EditModeToggle } from '@/components/EditModeToggle';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ContextualLoadingState } from '@/components/ContextualLoadingState';
import { type ExtractedIntent } from '@/app/api/intent/schema';
import { MultiplexAd } from '@/components/GoogleAd';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { useConciergeContext } from '@/hooks/useConciergeContext';
import type { Destination as DestinationType } from '@/types/destination';

import { useDrawerStore } from '@/lib/stores/drawer-store';

interface SearchDestination {
  id: number;
  name: string;
  city?: string;
  category?: string;
  description?: string;
  image?: string;
  michelin_stars?: number;
  is_open_now?: boolean;
  price_level?: number;
  slug?: string;
  image_thumbnail?: string;
  micro_description?: string;
}

interface SearchState {
  originalQuery: string;
  refinements: string[];
  allResults: SearchDestination[];
  filteredResults: SearchDestination[];
  conversationHistory: Message[];
  suggestions: Array<{ label: string; refinement: string }>;
  intent?: ExtractedIntent;
  isLoading?: boolean;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams?.get('q') || '';
  const { user } = useAuth();

  // Concierge context for trip awareness and personalization
  const conciergeContext = useConciergeContext();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = useItemsPerPage(4); // Always 4 full rows
  const [editingDestination, setEditingDestination] = useState<DestinationType | null>(null);
  const { openDrawer: openGlobalDrawer } = useDrawerStore();
  const isAdmin = (user?.app_metadata as Record<string, any> | undefined)?.role === 'admin';
  const {
    isEditMode: adminEditMode,
    toggleEditMode,
    disableEditMode,
    canUseEditMode,
  } = useAdminEditMode();
  const editModeActive = isAdmin && adminEditMode;
  const handleEditModeToggle = () => {
    if (!isAdmin || !canUseEditMode) return;
    toggleEditMode();
  };

  const [searchState, setSearchState] = useState<SearchState>({
    originalQuery: query,
    refinements: [],
    allResults: [],
    filteredResults: [],
    conversationHistory: [],
    suggestions: [],
  });

  // Generate concierge state based on results and context
  const conciergeState = useMemo((): ConciergeState => {
    const state: ConciergeState = {};

    // Trip context awareness - show if query matches trip destination
    if (conciergeContext.upcomingTrip && conciergeContext.upcomingTrip.daysUntil >= 0) {
      const queryLower = query.toLowerCase();
      const matchesTrip = conciergeContext.upcomingTrip.destinations.some(
        dest => queryLower.includes(dest.toLowerCase())
      );

      if (matchesTrip) {
        const { daysUntil, destinations } = conciergeContext.upcomingTrip;
        const timeText = daysUntil === 0
          ? 'today'
          : daysUntil === 1
            ? 'tomorrow'
            : `in ${daysUntil} days`;
        state.contextNote = `You're heading to ${destinations[0]} ${timeText}.`;
      }
    }

    // Check for ambiguous queries needing clarification
    const queryLower = query.toLowerCase();
    const resultCount = searchState.filteredResults.length;

    if (resultCount > 10) {
      // "Special" without context
      if (queryLower.includes('special') && !queryLower.includes('celebration') && !queryLower.includes('romantic')) {
        state.needsClarification = true;
        state.clarificationQuestion = 'Special how?';
        state.clarificationOptions = ['celebration', 'romantic', 'solo treat', 'business'];
      }
      // "Nice" without context
      else if (queryLower.includes('nice') && queryLower.split(' ').length <= 3) {
        state.needsClarification = true;
        state.clarificationQuestion = 'Nice meaning?';
        state.clarificationOptions = ['upscale', 'relaxed', 'views', 'quiet'];
      }
      // "Good" without specifics
      else if (queryLower.startsWith('good ') && !queryLower.includes('for')) {
        state.needsClarification = true;
        state.clarificationQuestion = 'Good for what?';
        state.clarificationOptions = ['groups', 'dates', 'solo', 'working'];
      }
    }

    // Generate soft suggestions based on results
    if (resultCount > 6 && searchState.suggestions.length === 0) {
      const softSuggestions: string[] = [];

      // Check result characteristics to generate relevant suggestions
      const hasOutdoor = searchState.filteredResults.some((r: any) =>
        r.vibe_tags?.some((t: string) => t?.toLowerCase().includes('outdoor') || t?.toLowerCase().includes('terrace'))
      );
      const hasQuiet = searchState.filteredResults.some((r: any) =>
        r.vibe_tags?.some((t: string) => t?.toLowerCase().includes('quiet') || t?.toLowerCase().includes('intimate'))
      );

      if (!queryLower.includes('quiet') && hasQuiet) softSuggestions.push('quiet');
      if (!queryLower.includes('outdoor') && hasOutdoor) softSuggestions.push('outdoor seating');
      if (!queryLower.includes('late')) softSuggestions.push('open late');
      if (!queryLower.includes('upscale') && !queryLower.includes('fine')) softSuggestions.push('upscale');

      if (softSuggestions.length > 0) {
        state.softSuggestions = softSuggestions.slice(0, 4);
      }
    }

    return state;
  }, [query, searchState.filteredResults, searchState.suggestions, conciergeContext.upcomingTrip]);

  // Generate evolved greeting
  const greetingContent = useMemo(() => {
    const baseGreeting = conciergeContext.greeting;
    const userName = conciergeContext.userName;

    // With user name
    if (userName) {
      // With upcoming trip context
      if (conciergeContext.upcomingTrip && conciergeContext.upcomingTrip.daysUntil >= 0) {
        const { destinations, daysUntil } = conciergeContext.upcomingTrip;
        const timeText = daysUntil === 0
          ? 'today'
          : daysUntil === 1
            ? 'tomorrow'
            : `in ${daysUntil} days`;
        return {
          greeting: `${baseGreeting}, ${userName}`,
          subtext: `${destinations[0]} ${timeText} — need recommendations?`
        };
      }
      return { greeting: `${baseGreeting}, ${userName}`, subtext: null };
    }

    // Without user name
    return { greeting: baseGreeting.toUpperCase(), subtext: null };
  }, [conciergeContext]);

  const performInitialSearch = useCallback(async (searchQuery: string) => {
    setSearchState(prev => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch(`/api/search/intelligent?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      const results: SearchDestination[] = data.results || [];

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

  const handleEditDestination = (destination: DestinationType) => {
    if (!isAdmin) return;
    setEditingDestination(destination);
    openGlobalDrawer('poi-editor', {
      destination: destination,
      onSave: async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        await performInitialSearch(searchState.originalQuery || query);
        setEditingDestination(null);
      }
    });
  };

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
      const results: SearchDestination[] = data.results || [];

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
    <>
      <div className="w-full px-6 md:px-10 py-20 min-h-screen">
      {/* Evolved Concierge Greeting */}
      <div className="mb-8">
        {conciergeContext.userName ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {greetingContent.greeting}
            </p>
            {greetingContent.subtext && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {greetingContent.subtext}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs tracking-widest text-gray-400">
            {greetingContent.greeting}
          </p>
        )}
      </div>

      <CompactResponseSection
        query={searchState.originalQuery}
        messages={searchState.conversationHistory}
        suggestions={searchState.suggestions}
        onChipClick={handleChipClick}
        onFollowUp={handleFollowUp}
        concierge={conciergeState}
        onClarificationSelect={handleRefinement}
        onSoftSuggestionSelect={handleRefinement}
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

        {isAdmin && (
          <div className="flex justify-end mb-4">
            <EditModeToggle active={editModeActive} onToggle={handleEditModeToggle} />
          </div>
        )}

        {editModeActive && (
          <div className="mb-6 rounded-2xl border border-gray-200/70 dark:border-gray-700/30 bg-gray-50/80 dark:bg-gray-800/10 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Edit mode is active in search
              </p>
              <p className="text-xs text-gray-700/80 dark:text-gray-300/80">
                Click any card's edit badge to adjust content without leaving this page.
              </p>
            </div>
            <button
              onClick={() => disableEditMode()}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-all dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Exit Edit Mode
            </button>
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
      <div className="mb-4 text-sm text-gray-500">
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
                      destination={d as DestinationType}
                      onClick={() => router.push(`/destination/${d.slug || d.id}`)}
                      index={startIndex + idx}
                      showBadges={true}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 w-full flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <div className="flex items-center gap-2">
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

                        const isActive = currentPage === pageNum;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ${
                              isActive
                                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                            }`}
                            aria-label={`Page ${pageNum}`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}

      {searchState.refinements.length > 0 && (
        <button onClick={clearFilters} className="mt-6 text-sm text-gray-500 hover:text-gray-900">
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
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="px-6 md:px-10 py-10">
        <div className="text-sm text-gray-500 mb-4">with our in-house travel intelligence…</div>
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


