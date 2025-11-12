import type { ReactNode } from 'react';
import { AdvancedFilters } from '@/types/filters';

export type CuratedJourneyLayout = 'carousel' | 'grid';

export interface CuratedJourneyItem {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  meta?: string;
  href?: string;
  filters?: Partial<AdvancedFilters>;
  analyticsId?: string;
  actionId?: string;
}

export interface CuratedJourneyModuleConfig {
  id: string;
  title: string;
  description?: string;
  layout?: CuratedJourneyLayout;
  items: CuratedJourneyItem[];
}

export type EntryPointType = 'explore' | 'plan';

export interface EntryPoint {
  id: string;
  label: string;
  description: string;
  type: EntryPointType;
  href?: string;
  analyticsId?: string;
  filters?: Partial<AdvancedFilters>;
  actionId?: string;
}

export type EntryPointContext = 'homepage' | 'categories';
