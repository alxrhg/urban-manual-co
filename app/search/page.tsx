'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CompactResponseSection, type Message } from '@/src/features/search/CompactResponseSection';
import { DestinationCard } from '@/components/DestinationCard';
import { IntentConfirmationChips } from '@/components/IntentConfirmationChips';
import { SmartEmptyState } from '@/components/SmartEmptyState';
import { ContextualLoadingState } from '@/components/ContextualLoadingState';
import { MultiplexAd } from '@/components/GoogleAd';
import { Skeleton } from '@/components/ui/skeleton';
import { useItemsPerPage } from '@/hooks/useGridColumns';
import { useIntelligentSearch } from '@/hooks/useIntelligentSearch';
import { useToast } from '@/hooks/useToast';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const itemsPerPage = useItemsPerPage(4);
  const [currentPage, setCurrentPage] = useState(1);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const lastContextRef = useRef<string | null>(null);
  const lastQueryRef = useRef<string>('');
  const lastErrorRef = useRef<string | null>(null);
  const lastWarningRef = useRef<string | null>(null);

  const {
    data: searchData,
    refinements,
    isLoading,
    isFetching,
    isError,
    errorMessage,
    warningMessage,
    hasCachedResults,
    applyRefinement,
    clearRefinements,
    followUp,
  } = useIntelligentSearch(query);

  const { error: showErrorToast, warning: showWarningToast } = useToast();
  const currentQuery = searchData.originalQuery || query;
  const shouldShowLoading = Boolean(currentQuery) && (isLoading || (isFetching && !searchData.filteredResults.length));
  const fallbackBannerMessage = warningMessage || (isError && hasCachedResults
    ? 'Showing last known results while we reconnect.'
    : null);
  const lastUpdatedText = searchData.receivedAt
    ? new Date(searchData.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, refinements]);

  useEffect(() => {
    if (!currentQuery) {
      setConversationHistory([]);
      lastContextRef.current = null;
      lastQueryRef.current = '';
      return;
    }

    if (lastQueryRef.current !== currentQuery) {
      const baseHistory = searchData.contextResponse
        ? [{ role: 'assistant' as const, content: searchData.contextResponse }]
        : [];
      setConversationHistory(baseHistory);
      lastContextRef.current = searchData.contextResponse || null;
      lastQueryRef.current = currentQuery;
      return;
    }

    if (searchData.contextResponse && searchData.contextResponse !== lastContextRef.current) {
      setConversationHistory((prev) => [
        ...prev,
        { role: 'assistant' as const, content: searchData.contextResponse! },
      ]);
      lastContextRef.current = searchData.contextResponse;
    }
  }, [currentQuery, searchData.contextResponse]);

  useEffect(() => {
    if (isError && errorMessage && lastErrorRef.current !== errorMessage) {
      showErrorToast(errorMessage);
      lastErrorRef.current = errorMessage;
    }
    if (!isError) {
      lastErrorRef.current = null;
    }
  }, [isError, errorMessage, showErrorToast]);

  useEffect(() => {
    if (warningMessage && lastWarningRef.current !== warningMessage) {
      showWarningToast(warningMessage, 4000);
      lastWarningRef.current = warningMessage;
    }
    if (!warningMessage) {
      lastWarningRef.current = null;
    }
  }, [warningMessage, showWarningToast]);

  const updateSearchQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQuery) {
      params.set('q', nextQuery);
    } else {
      params.delete('q');
    }
    const serialized = params.toString();
    const nextUrl = serialized ? `/search?${serialized}` : '/search';
    router.push(nextUrl);
  };

  const handleRefinement = (refinement: string) => {
    setConversationHistory((prev) => [...prev, { role: 'user', content: refinement }]);
    applyRefinement(refinement);
    setCurrentPage(1);
  };

  const handleFollowUp = async (message: string): Promise<string> => {
    const nextHistory = [...conversationHistory, { role: 'user' as const, content: message }];
    setConversationHistory(nextHistory);
    try {
      const response = await followUp(message, nextHistory);
      setCurrentPage(1);
      return response;
    } catch {
      const fallback = 'Sorry, I encountered an error processing your request. Please try again.';
      showErrorToast('We hit a snag while refining your search. Please try again.');
      setConversationHistory((prev) => ([
        ...prev,
        { role: 'assistant', content: fallback },
      ]));
      return fallback;
    }
  };

  const handleIntentChipRemove = (chipType: string, value: string) => {
    let nextQuery = currentQuery;

    if (chipType === 'city') {
      nextQuery = nextQuery.replace(new RegExp(value, 'gi'), '').trim();
    } else if (chipType === 'category') {
      nextQuery = nextQuery.replace(new RegExp(value, 'gi'), '').trim();
    }

    if (nextQuery !== currentQuery) {
      updateSearchQuery(nextQuery);
    }
  };

  const handleAlternativeClick = (alternative: string) => {
    updateSearchQuery(alternative);
  };

  const clearFilters = () => {
    clearRefinements();
    setConversationHistory((prev) => ([
      ...prev,
      { role: 'assistant', content: `Filters cleared. Showing all ${searchData.allResults.length} results.` },
    ]));
    setCurrentPage(1);
  };

  const visibleResults = searchData.filteredResults;
  const totalResults = searchData.allResults.length;

  return (
    <div className="w-full px-6 md:px-10 lg:px-12 py-10">
      <p className="text-xs tracking-widest text-neutral-400 mb-8">
        {new Date().getHours() < 12 ? 'GOOD MORNING' : new Date().getHours() < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'}
      </p>

      {fallbackBannerMessage && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>{fallbackBannerMessage}</p>
          {lastUpdatedText && (
            <p className="mt-1 text-xs text-amber-800">Last updated {lastUpdatedText}</p>
          )}
        </div>
      )}

      <CompactResponseSection
        query={currentQuery}
        messages={conversationHistory}
        suggestions={searchData.suggestions}
        onChipClick={handleRefinement}
        onFollowUp={handleFollowUp}
      />

      {searchData.intent && !shouldShowLoading && (
        <div className="mb-6">
          <IntentConfirmationChips
            intent={searchData.intent}
            onChipRemove={handleIntentChipRemove}
            editable={true}
          />
        </div>
      )}

      {shouldShowLoading && (
        <ContextualLoadingState intent={searchData.intent} query={currentQuery} />
      )}

      {!shouldShowLoading && !isError && visibleResults.length === 0 && currentQuery && (
        <SmartEmptyState
          query={currentQuery}
          intent={searchData.intent}
          onAlternativeClick={handleAlternativeClick}
        />
      )}

      {!shouldShowLoading && visibleResults.length > 0 && (
        <>
          <div className="mb-4 text-sm text-neutral-500">
            Showing {visibleResults.length}
            {totalResults > 0 && visibleResults.length !== totalResults && (
              <span> of {totalResults}</span>
            )}
            {refinements.length > 0 && (
              <span> (filtered by: {refinements.join(', ')})</span>
            )}
          </div>

          {(() => {
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedResults = visibleResults.slice(startIndex, endIndex);
            const totalPages = Math.ceil(visibleResults.length / itemsPerPage);

            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6 items-start">
                  {paginatedResults.map((d, idx) => (
                    <DestinationCard
                      key={d.id ?? `${d.slug}-${idx}`}
                      destination={d as any}
                      onClick={() => router.push(`/destination/${(d as any).slug || d.id}`)}
                      index={startIndex + idx}
                      showBadges={true}
                    />
                  ))}
                </div>

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

                {refinements.length > 0 && (
                  <button onClick={clearFilters} className="mt-6 text-sm text-neutral-500 hover:text-neutral-900">
                    Clear all filters
                  </button>
                )}
              </>
            );
          })()}

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
      <div className="px-6 md:px-10 py-10">
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
