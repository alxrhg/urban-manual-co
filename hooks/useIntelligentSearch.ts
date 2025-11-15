'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Destination } from '@/types/destination';
import type { ExtractedIntent } from '@/app/api/intent/schema';
import type { Message } from '@/src/features/search/CompactResponseSection';

interface SearchMeta {
  warnings?: string[];
  warning?: string;
  stale?: boolean;
  [key: string]: any;
}

interface SearchApiResponse {
  results?: Destination[];
  filteredResults?: Destination[];
  contextResponse?: string;
  suggestions?: Array<{ label: string; refinement: string }>;
  meta?: SearchMeta;
  intent?: ExtractedIntent;
  error?: string;
}

export interface SearchData {
  originalQuery: string;
  allResults: Destination[];
  filteredResults: Destination[];
  suggestions: Array<{ label: string; refinement: string }>;
  contextResponse?: string;
  intent?: ExtractedIntent;
  meta?: SearchMeta;
  receivedAt: number;
}

export interface UseIntelligentSearchResult {
  data: SearchData;
  refinements: string[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
  warningMessage?: string | null;
  hasCachedResults: boolean;
  applyRefinement: (refinement: string) => void;
  clearRefinements: () => void;
  followUp: (message: string, history?: Message[]) => Promise<string>;
}

const createEmptySearchData = (): SearchData => ({
  originalQuery: '',
  allResults: [],
  filteredResults: [],
  suggestions: [],
  contextResponse: '',
  receivedAt: 0,
});

type SearchQueryKey = readonly [
  'intelligentSearch',
  {
    query: string;
    refinements: string[];
  }
];

const createSearchKey = (query: string, refinements: string[]): SearchQueryKey => [
  'intelligentSearch',
  { query, refinements },
];

export function useIntelligentSearch(rawQuery: string): UseIntelligentSearchResult {
  const normalizedQuery = (rawQuery || '').trim();
  const queryClient = useQueryClient();
  const [refinements, setRefinements] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastSuccessfulDataRef = useRef<SearchData>(createEmptySearchData());

  useEffect(() => {
    if (!normalizedQuery) {
      lastSuccessfulDataRef.current = createEmptySearchData();
      setRefinements([]);
      abortRef.current?.abort();
      return;
    }

    const cachedBase = queryClient.getQueryData<SearchData>(createSearchKey(normalizedQuery, []));
    if (cachedBase) {
      lastSuccessfulDataRef.current = cachedBase;
    } else {
      lastSuccessfulDataRef.current = createEmptySearchData();
    }
    setRefinements([]);
    abortRef.current?.abort();
  }, [normalizedQuery, queryClient]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const searchQuery = useQuery<SearchData, Error>({
    queryKey: createSearchKey(normalizedQuery, refinements),
    enabled: Boolean(normalizedQuery),
    keepPreviousData: true,
    retry: false,
    queryFn: ({ signal }) =>
      fetchSearch({
        query: normalizedQuery,
        refinements,
        signal,
        queryClient,
        abortRef,
      }),
  });

  useEffect(() => {
    if (searchQuery.data) {
      lastSuccessfulDataRef.current = searchQuery.data;
    }
  }, [searchQuery.data]);

  const resolvedData = searchQuery.data
    ?? (normalizedQuery ? lastSuccessfulDataRef.current : createEmptySearchData());

  const warningMessage = useMemo(() => deriveWarningMessage(resolvedData.meta), [resolvedData.meta]);
  const hasCachedResults = Boolean(
    normalizedQuery && searchQuery.isError && lastSuccessfulDataRef.current.filteredResults.length
  );

  const applyRefinement = useCallback((refinement: string) => {
    setRefinements((previous) => {
      if (!normalizedQuery || previous.includes(refinement)) {
        return previous;
      }
      const next = [...previous, refinement];
      const snapshot =
        queryClient.getQueryData<SearchData>(createSearchKey(normalizedQuery, previous))
        ?? resolvedData;
      queryClient.setQueryData(createSearchKey(normalizedQuery, next), {
        ...snapshot,
        receivedAt: snapshot.receivedAt || Date.now(),
      });
      return next;
    });
  }, [normalizedQuery, queryClient, resolvedData]);

  const clearRefinements = useCallback(() => {
    setRefinements((prev) => (prev.length ? [] : prev));
  }, []);

  const followUp = useCallback(async (message: string, history: Message[] = []) => {
    if (!normalizedQuery) {
      return '';
    }

    const response = await fetchWithRetry('/api/search/follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalQuery: normalizedQuery,
        followUpMessage: message,
        conversationHistory: history,
        currentResults: resolvedData.filteredResults
          .map((result) => ({ id: result.id }))
          .filter((entry) => typeof entry.id === 'number'),
        refinements,
        intent: resolvedData.intent,
      }),
    });

    const payload: SearchApiResponse = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Follow-up search failed');
    }

    const results = payload.results ?? [];
    const nextData: SearchData = {
      originalQuery: normalizedQuery,
      allResults: results,
      filteredResults: results,
      suggestions: payload.suggestions ?? resolvedData.suggestions,
      contextResponse: payload.contextResponse ?? '',
      intent: payload.intent ?? resolvedData.intent,
      meta: payload.meta ?? resolvedData.meta,
      receivedAt: Date.now(),
    };

    queryClient.setQueryData(createSearchKey(normalizedQuery, refinements), nextData);
    queryClient.setQueryData(createSearchKey(normalizedQuery, []), nextData);
    lastSuccessfulDataRef.current = nextData;

    return nextData.contextResponse ?? '';
  }, [normalizedQuery, refinements, queryClient, resolvedData]);

  return {
    data: resolvedData,
    refinements,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    isError: searchQuery.isError,
    errorMessage: searchQuery.error?.message,
    warningMessage,
    hasCachedResults,
    applyRefinement,
    clearRefinements,
    followUp,
  };
}

async function fetchSearch({
  query,
  refinements,
  signal,
  queryClient,
  abortRef,
}: {
  query: string;
  refinements: string[];
  signal?: AbortSignal;
  queryClient: QueryClient;
  abortRef: MutableRefObject<AbortController | null>;
}): Promise<SearchData> {
  if (!query) {
    return createEmptySearchData();
  }

  abortRef.current?.abort();
  const controller = new AbortController();
  abortRef.current = controller;

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const isRefinement = refinements.length > 0;
  const requestInit: RequestInit = isRefinement
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: query,
          refinements,
          allResults: getAllResultIds(queryClient, query),
        }),
        signal: controller.signal,
      }
    : { signal: controller.signal };

  const endpoint = isRefinement
    ? '/api/search/refine'
    : `/api/search/intelligent?q=${encodeURIComponent(query)}`;

  const response = await fetchWithRetry(endpoint, requestInit);
  const payload: SearchApiResponse = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Search failed');
  }

  if (isRefinement) {
    const baseData = queryClient.getQueryData<SearchData>(createSearchKey(query, []));
    const allResults = baseData?.allResults?.length
      ? baseData.allResults
      : payload.filteredResults ?? [];
    return {
      originalQuery: query,
      allResults,
      filteredResults: payload.filteredResults ?? [],
      suggestions: payload.suggestions ?? baseData?.suggestions ?? [],
      contextResponse: payload.contextResponse ?? '',
      intent: baseData?.intent,
      meta: payload.meta ?? baseData?.meta,
      receivedAt: Date.now(),
    };
  }

  const results = payload.results ?? [];
  return {
    originalQuery: query,
    allResults: results,
    filteredResults: results,
    suggestions: payload.suggestions ?? [],
    contextResponse: payload.contextResponse ?? '',
    intent: payload.intent,
    meta: payload.meta,
    receivedAt: Date.now(),
  };
}

function getAllResultIds(queryClient: QueryClient, query: string): number[] {
  const baseData = queryClient.getQueryData<SearchData>(createSearchKey(query, []));
  if (!baseData) {
    return [];
  }
  return baseData.allResults
    .map((result) => result.id)
    .filter((id): id is number => typeof id === 'number');
}

export async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, attempt = 0): Promise<Response> {
  try {
    const response = await fetch(input, init);
    if (isTransientStatus(response.status) && attempt < 2) {
      await waitWithJitter(attempt);
      return fetchWithRetry(input, init, attempt + 1);
    }
    return response;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    if (attempt < 2) {
      await waitWithJitter(attempt);
      return fetchWithRetry(input, init, attempt + 1);
    }
    throw error;
  }
}

function isTransientStatus(status: number) {
  return status === 429 || (status >= 500 && status < 600);
}

async function waitWithJitter(attempt: number) {
  const base = 200 + Math.random() * 300;
  const delay = base * (attempt + 1);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function deriveWarningMessage(meta?: SearchMeta): string | null {
  if (!meta) {
    return null;
  }

  const warnings = meta.warnings?.length ? meta.warnings : meta.warning ? [meta.warning] : [];
  const staleWarning = warnings.find((message) => /stale/i.test(message));

  if (staleWarning) {
    return staleWarning;
  }

  if (warnings.length > 0) {
    return warnings[0];
  }

  if (meta.stale) {
    return 'Results may be stale — showing cached recommendations.';
  }

  return null;
}
