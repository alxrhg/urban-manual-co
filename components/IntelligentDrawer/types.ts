/**
 * IntelligentDrawer Types
 *
 * A unified drawer system that integrates with the homepage
 * travel intelligence experience.
 */

import { Destination } from '@/types/destination';
import { ReactNode } from 'react';

// ============================================
// DRAWER MODES
// ============================================

export type DrawerMode =
  | 'destination'    // Viewing a destination
  | 'trip'           // Trip planner
  | 'chat'           // AI conversation
  | 'similar'        // Similar places
  | 'why-this'       // Why this recommendation
  | 'account'        // User account
  | 'settings'       // Settings
  | 'custom';        // Custom content

export type DrawerSize = 'small' | 'medium' | 'large' | 'full';
export type DrawerPosition = 'right' | 'bottom' | 'center';

// ============================================
// INTELLIGENCE TYPES
// ============================================

export interface DrawerSuggestion {
  type: 'similar' | 'nearby' | 'trip' | 'action';
  title: string;
  subtitle?: string;
  icon?: string;
  destination?: Destination;
  action?: () => void;
}

export interface DrawerContext {
  /** Current destination being viewed */
  destination?: Destination;
  /** Related destinations */
  related?: Destination[];
  /** AI-generated insights */
  insights?: string[];
  /** Why this was recommended */
  whyThis?: string;
  /** Trip context if applicable */
  tripDay?: number;
  tripFit?: string;
}

// ============================================
// DRAWER STATE
// ============================================

export interface DrawerState {
  isOpen: boolean;
  mode: DrawerMode;
  size: DrawerSize;
  position: DrawerPosition;
  context: DrawerContext;
  history: DrawerHistoryItem[];
}

export interface DrawerHistoryItem {
  mode: DrawerMode;
  context: DrawerContext;
  scrollPosition: number;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface IntelligentDrawerProps {
  className?: string;
}

export interface DrawerShellProps {
  isOpen: boolean;
  size: DrawerSize;
  position: DrawerPosition;
  onClose: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export interface DrawerHeaderProps {
  title?: string;
  subtitle?: string;
  showClose?: boolean;
  showBack?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

export interface DrawerContentProps {
  mode: DrawerMode;
  context: DrawerContext;
  onNavigate: (mode: DrawerMode, context: DrawerContext) => void;
  onClose: () => void;
}

export interface DestinationContentProps {
  destination: Destination;
  related?: Destination[];
  whyThis?: string;
  tripContext?: {
    day?: number;
    fit?: string;
  };
  onOpenRelated: (destination: Destination) => void;
  onAddToTrip: (destination: Destination, day?: number) => void;
  onShowSimilar: () => void;
  onShowWhyThis: () => void;
}

export interface SuggestionsBarProps {
  suggestions: DrawerSuggestion[];
  onSelect: (suggestion: DrawerSuggestion) => void;
}

export interface QuickActionsProps {
  destination: Destination;
  isSaved: boolean;
  isInTrip: boolean;
  onSave: () => void;
  onShare: () => void;
  onDirections: () => void;
  onAddToTrip: () => void;
}

// ============================================
// CONTEXT PROVIDER TYPES
// ============================================

export interface IntelligentDrawerContextType {
  state: DrawerState;
  open: (mode: DrawerMode, context?: DrawerContext, size?: DrawerSize) => void;
  close: () => void;
  back: () => void;
  navigate: (mode: DrawerMode, context: DrawerContext) => void;
  updateContext: (context: Partial<DrawerContext>) => void;
  canGoBack: boolean;
}
