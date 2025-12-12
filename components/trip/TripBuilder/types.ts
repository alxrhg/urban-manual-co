/**
 * TripBuilder Types
 *
 * Clean type definitions for the trip builder experience
 */

import { Destination } from '@/types/destination';

// ============================================
// CORE TYPES
// ============================================

export interface TripItem {
  id: string;
  destination: Destination;
  day: number;
  orderIndex: number;
  timeSlot?: string;
  duration: number;
  notes?: string;
  // Computed intelligence
  travelTimeFromPrev?: number;
  crowdLevel?: number;
  crowdLabel?: string;
  isOutdoor?: boolean;
}

export interface TripDay {
  dayNumber: number;
  date?: string;
  items: TripItem[];
  // Computed
  totalTime: number;
  totalTravel: number;
  isOverstuffed: boolean;
  weather?: {
    condition: string;
    temp: number;
    isRainy: boolean;
  };
}

export interface Trip {
  id?: string;
  title: string;
  city: string;
  startDate?: string;
  endDate?: string;
  days: TripDay[];
  travelers: number;
  isModified: boolean;
  lastSaved?: string;
}

export interface TripSummary {
  id: string;
  title: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  status: string;
  cover_image?: string;
  itemCount: number;
  updated_at: string;
}

// ============================================
// INTELLIGENCE TYPES
// ============================================

export type InsightType = 'warning' | 'tip' | 'success';
export type InsightIcon = 'clock' | 'route' | 'crowd' | 'weather' | 'food' | 'category';

export interface DayInsight {
  type: InsightType;
  icon: InsightIcon;
  message: string;
  action?: string;
}

export interface TripHealth {
  score: number;
  label: string;
  insights: DayInsight[];
  categoryBalance: Record<string, number>;
  totalWalkingTime: number;
  hasTimeConflicts: boolean;
  missingMeals: number[];
}

// ============================================
// ACTION TYPES
// ============================================

export type TripAction =
  | { type: 'ADD_ITEM'; destination: Destination; day?: number; timeSlot?: string }
  | { type: 'REMOVE_ITEM'; itemId: string }
  | { type: 'MOVE_ITEM'; itemId: string; toDay: number; toIndex: number }
  | { type: 'UPDATE_TIME'; itemId: string; timeSlot: string }
  | { type: 'UPDATE_NOTES'; itemId: string; notes: string }
  | { type: 'ADD_DAY' }
  | { type: 'REMOVE_DAY'; dayNumber: number }
  | { type: 'REORDER'; dayNumber: number; fromIndex: number; toIndex: number }
  | { type: 'OPTIMIZE_DAY'; dayNumber: number }
  | { type: 'AUTO_SCHEDULE'; dayNumber: number }
  | { type: 'CLEAR' };

// ============================================
// COMPONENT PROPS
// ============================================

export interface TripPanelProps {
  className?: string;
}

export interface TripHeaderProps {
  trip: Trip;
  health: TripHealth;
  totalItems: number;
  savedTrips: TripSummary[];
  onClose: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateDate: (date: string) => void;
  onSwitchTrip: (tripId: string) => void;
  onOpenStudio?: () => void;
}

export interface TripDayCardProps {
  day: TripDay;
  dayCount: number;
  isExpanded: boolean;
  insights: DayInsight[];
  isSuggesting: boolean;
  onToggle: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateTime: (itemId: string, time: string) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
  onMoveToDay: (itemId: string, toDay: number) => void;
  onOptimize: () => void;
  onAutoSchedule: () => void;
  onSuggestNext: () => void;
  onRemoveDay: () => void;
  onOpenDestination: (slug: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onInsightAction: (action: string) => void;
}

export interface TripItemRowProps {
  item: TripItem;
  index: number;
  currentDay: number;
  totalDays: number;
  showTravelTime: boolean;
  isDragging: boolean;
  onRemove: () => void;
  onTimeChange: (time: string) => void;
  onNotesChange: (notes: string) => void;
  onMoveToDay: (toDay: number) => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
}

export interface TripEmptyStateProps {
  city: string;
  isLoading: boolean;
  onSuggest: () => void;
  onBrowse: () => void;
}

export interface TripActionsProps {
  tripId?: string;
  isModified: boolean;
  isSaving: boolean;
  onSave: () => void;
  onShare: () => void;
  onClear: () => void;
}

export interface TripInsightsBarProps {
  insights: DayInsight[];
  onAction: (action: string) => void;
}
