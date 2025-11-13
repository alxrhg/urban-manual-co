export interface AnalyticsDateRange {
  start: string | null;
  end: string | null;
}

export interface AnalyticsSummary {
  totalSearches: number;
  totalViews: number;
  discoveryEngineEnabled: boolean;
  dateRange: AnalyticsDateRange;
}

export interface PopularQueryStat {
  query: string;
  count: number;
}

export interface PopularDestinationStat {
  slug: string;
  count: number;
}

export interface SearchTrendPoint {
  date: string;
  count: number;
}

export interface AnalyticsMetrics {
  averageResultsPerQuery: number;
  clickThroughRate: number;
  searchToSaveRate: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  popularQueries: PopularQueryStat[];
  popularDestinations: PopularDestinationStat[];
  searchTrends: SearchTrendPoint[];
  metrics: AnalyticsMetrics;
}

export interface UserInteractionIntent {
  city?: string;
  category?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface UserInteractionMetadata {
  query?: string;
  intent?: UserInteractionIntent;
  filters?: Record<string, string | number | boolean | null | undefined>;
  count?: number;
  source?: string;
}

export interface AdminAnalyticsStats {
  totalViews: number;
  totalSearches: number;
  totalSaves: number;
  totalUsers: number;
  topSearches: PopularQueryStat[];
}
