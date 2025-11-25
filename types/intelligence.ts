export interface TravelIntelligenceStat {
  label: string;
  value: string;
  helper?: string;
}

export interface TravelIntelligenceHighlight {
  title: string;
  detail: string;
  slug?: string;
}

export interface TravelIntelligenceSummary {
  city?: string;
  statement: string;
  totalResults: number;
  topCategories: Array<{ label: string; count: number }>;
  neighborhoods: Array<{ label: string; count: number }>;
  stats: TravelIntelligenceStat[];
  highlights: TravelIntelligenceHighlight[];
}
