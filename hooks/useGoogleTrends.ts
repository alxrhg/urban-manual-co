import { useState, useEffect } from 'react';

export interface TrendingSearch {
  region: string;
  timestamp: string;
  trending_searches: string[];
}

export interface InterestOverTimeData {
  keywords: string[];
  timeframe: string;
  geo: string;
  category?: number;
  data: Array<{
    date: string;
    [keyword: string]: number | string;
  }>;
}

export interface InterestByRegionData {
  keywords: string[];
  timeframe: string;
  resolution: string;
  data: Array<{
    region: string;
    [keyword: string]: number | string;
  }>;
}

export interface RelatedQuery {
  query: string;
  value: number;
}

export interface RelatedQueriesData {
  keyword: string;
  timeframe: string;
  geo: string;
  top: RelatedQuery[];
  rising: RelatedQuery[];
}

export interface RealtimeTrend {
  title: string;
  entityNames?: string[];
  traffic?: string;
}

export interface RealtimeTrendsData {
  region: string;
  category: string;
  timestamp: string;
  trends: RealtimeTrend[];
}

type GoogleTrendsType =
  | 'trending-searches'
  | 'interest-over-time'
  | 'interest-by-region'
  | 'related-queries'
  | 'suggestions'
  | 'realtime-trends';

interface UseGoogleTrendsOptions {
  type: GoogleTrendsType;
  enabled?: boolean;
  keywords?: string;
  keyword?: string;
  region?: string;
  geo?: string;
  timeframe?: string;
  resolution?: string;
  category?: string | number;
  includeLowSearchVolume?: boolean;
}

interface UseGoogleTrendsResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGoogleTrends<T = any>(
  options: UseGoogleTrendsOptions
): UseGoogleTrendsResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldFetch, setShouldFetch] = useState<number>(0);

  const { enabled = true, type, ...params } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const fetchGoogleTrends = async () => {
      setLoading(true);
      setError(null);

      try {
        // Build query parameters
        const queryParams = new URLSearchParams({
          type,
        });

        // Add optional parameters
        if (params.keywords) queryParams.set('keywords', params.keywords);
        if (params.keyword) queryParams.set('keyword', params.keyword);
        if (params.region) queryParams.set('region', params.region);
        if (params.geo) queryParams.set('geo', params.geo);
        if (params.timeframe) queryParams.set('timeframe', params.timeframe);
        if (params.resolution) queryParams.set('resolution', params.resolution);
        if (params.category) queryParams.set('category', String(params.category));
        if (params.includeLowSearchVolume !== undefined) {
          queryParams.set('include_low_search_volume', String(params.includeLowSearchVolume));
        }

        const response = await fetch(`/api/trending/google?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch Google Trends data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching Google Trends:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGoogleTrends();
  }, [enabled, type, shouldFetch, JSON.stringify(params)]);

  const refetch = () => {
    setShouldFetch((prev) => prev + 1);
  };

  return { data, loading, error, refetch };
}

// Specific hooks for different trend types
export function useTrendingSearches(region = 'united_states', enabled = true) {
  return useGoogleTrends<TrendingSearch>({
    type: 'trending-searches',
    region,
    enabled,
  });
}

export function useInterestOverTime(
  keywords: string,
  options: {
    timeframe?: string;
    geo?: string;
    category?: number;
    enabled?: boolean;
  } = {}
) {
  return useGoogleTrends<InterestOverTimeData>({
    type: 'interest-over-time',
    keywords,
    timeframe: options.timeframe || 'today 3-m',
    geo: options.geo,
    category: options.category,
    enabled: options.enabled !== false,
  });
}

export function useInterestByRegion(
  keywords: string,
  options: {
    timeframe?: string;
    resolution?: string;
    includeLowSearchVolume?: boolean;
    enabled?: boolean;
  } = {}
) {
  return useGoogleTrends<InterestByRegionData>({
    type: 'interest-by-region',
    keywords,
    timeframe: options.timeframe || 'today 3-m',
    resolution: options.resolution || 'COUNTRY',
    includeLowSearchVolume: options.includeLowSearchVolume,
    enabled: options.enabled !== false,
  });
}

export function useRelatedQueries(
  keyword: string,
  options: {
    timeframe?: string;
    geo?: string;
    enabled?: boolean;
  } = {}
) {
  return useGoogleTrends<RelatedQueriesData>({
    type: 'related-queries',
    keyword,
    timeframe: options.timeframe || 'today 3-m',
    geo: options.geo,
    enabled: options.enabled !== false,
  });
}

export function useRealtimeTrends(region = 'US', category = 'all', enabled = true) {
  return useGoogleTrends<RealtimeTrendsData>({
    type: 'realtime-trends',
    region,
    category,
    enabled,
  });
}
