'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useTripBuilder } from '@/contexts/TripBuilderContext';
import { Destination } from '@/types/destination';
import {
  DrawerState,
  DrawerMode,
  DrawerSize,
  DrawerContext as DrawerCtx,
  DrawerHistoryItem,
  IntelligentDrawerContextType,
  TripFitAnalysis,
  TripContextInfo,
} from './types';

// ============================================
// INITIAL STATE
// ============================================

const initialState: DrawerState = {
  isOpen: false,
  mode: 'destination',
  size: 'medium',
  position: 'right',
  context: {},
  history: [],
};

// ============================================
// EXTENDED CONTEXT TYPE
// ============================================

interface ExtendedContextType extends IntelligentDrawerContextType {
  // Trip-aware helpers
  openDestinationWithTrip: (destination: Destination, related?: Destination[]) => void;
  openTrip: (tripId?: string) => void;
  openTripSelector: () => void;
  showAddToTrip: (destination: Destination) => void;
  // Trip integration
  analyzeTripFit: (destination: Destination) => TripFitAnalysis | null;
  activeTripInfo: TripContextInfo | null;
  addToTripAndClose: (destination: Destination, day?: number) => void;
  addToTripQuick: (destination: Destination, day?: number) => void;
}

const IntelligentDrawerContext = createContext<ExtendedContextType | null>(null);

// ============================================
// TRIP FIT ANALYSIS
// ============================================

function analyzeDestinationFit(
  destination: Destination,
  days: { dayNumber: number; items: any[]; date?: string }[]
): TripFitAnalysis | null {
  if (!days || days.length === 0) return null;

  const category = (destination.category || '').toLowerCase();
  let bestDay = 1;
  let bestScore = 0;
  let reason = '';
  let timeSlot = '';

  // Analyze each day
  days.forEach((day) => {
    let dayScore = 50; // Base score
    const itemCategories = day.items.map((i) => (i.destination?.category || '').toLowerCase());
    const itemCount = day.items.length;
    const times = day.items.map((i) => i.timeSlot).filter(Boolean);

    // Less items = higher score (room for more)
    if (itemCount < 3) dayScore += 20;
    else if (itemCount < 5) dayScore += 10;
    else if (itemCount >= 7) dayScore -= 20;

    // Check for meal gaps
    const hasMorning = itemCategories.some(
      (c) => c.includes('cafe') || c.includes('breakfast') || c.includes('coffee')
    );
    const hasLunch = itemCategories.some((c) => {
      const idx = itemCategories.indexOf(c);
      const time = times[idx];
      return c.includes('restaurant') && time && parseInt(time) >= 11 && parseInt(time) <= 14;
    });
    const hasDinner = itemCategories.some((c) => {
      const idx = itemCategories.indexOf(c);
      const time = times[idx];
      return c.includes('restaurant') && time && parseInt(time) >= 18;
    });

    // Destination fills a gap
    if (category.includes('cafe') || category.includes('breakfast') || category.includes('coffee')) {
      if (!hasMorning) {
        dayScore += 30;
        reason = 'Fills breakfast gap';
        timeSlot = '09:00';
      }
    } else if (category.includes('restaurant') || category.includes('dining')) {
      if (!hasLunch && !hasDinner) {
        dayScore += 25;
        reason = 'Fills meal gap';
        timeSlot = '19:00';
      } else if (!hasDinner) {
        dayScore += 25;
        reason = 'Perfect for dinner';
        timeSlot = '19:30';
      } else if (!hasLunch) {
        dayScore += 20;
        reason = 'Great for lunch';
        timeSlot = '12:30';
      }
    } else if (category.includes('bar') || category.includes('cocktail')) {
      if (hasDinner) {
        dayScore += 20;
        reason = 'Great after dinner';
        timeSlot = '21:30';
      }
    } else if (category.includes('museum') || category.includes('gallery')) {
      if (!hasMorning || itemCount < 3) {
        dayScore += 15;
        reason = 'Perfect for morning';
        timeSlot = '10:00';
      }
    } else if (category.includes('park') || category.includes('garden')) {
      dayScore += 10;
      reason = 'Nice afternoon activity';
      timeSlot = '15:00';
    }

    // Category diversity bonus
    if (!itemCategories.includes(category)) {
      dayScore += 10;
    }

    if (dayScore > bestScore) {
      bestScore = dayScore;
      bestDay = day.dayNumber;
      if (!reason) {
        reason = itemCount < 2 ? 'Open day' : 'Good fit';
      }
    }
  });

  // Determine category
  let fitCategory: TripFitAnalysis['category'] = 'possible';
  if (bestScore >= 80) fitCategory = 'perfect';
  else if (bestScore >= 65) fitCategory = 'good';
  else if (bestScore < 40) fitCategory = 'conflict';

  return {
    score: Math.min(100, bestScore),
    bestDay,
    reason,
    timeSlot: timeSlot || undefined,
    category: fitCategory,
  };
}

// ============================================
// PROVIDER
// ============================================

export function IntelligentDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>(initialState);
  const tripBuilder = useTripBuilder();

  // Build active trip info
  const activeTripInfo = useMemo<TripContextInfo | null>(() => {
    if (!tripBuilder.activeTrip) return null;
    return {
      tripId: tripBuilder.activeTrip.id || '',
      tripTitle: tripBuilder.activeTrip.title,
      dayCount: tripBuilder.activeTrip.days.length,
      itemCount: tripBuilder.totalItems,
      city: tripBuilder.activeTrip.city,
    };
  }, [tripBuilder.activeTrip, tripBuilder.totalItems]);

  // Analyze trip fit for a destination
  const analyzeTripFit = useCallback(
    (destination: Destination): TripFitAnalysis | null => {
      if (!tripBuilder.activeTrip) return null;
      return analyzeDestinationFit(destination, tripBuilder.activeTrip.days);
    },
    [tripBuilder.activeTrip]
  );

  // ==========================================
  // CORE DRAWER ACTIONS
  // ==========================================

  const open = useCallback(
    (mode: DrawerMode, context?: DrawerCtx, size?: DrawerSize) => {
      // Auto-add trip fit analysis for destinations
      let enrichedContext = context || {};
      if (mode === 'destination' && context?.destination && tripBuilder.activeTrip) {
        const fitAnalysis = analyzeDestinationFit(context.destination, tripBuilder.activeTrip.days);
        enrichedContext = {
          ...enrichedContext,
          tripFitAnalysis: fitAnalysis || undefined,
          activeTripInfo: activeTripInfo || undefined,
        };
      }

      setState((prev) => ({
        ...prev,
        isOpen: true,
        mode,
        context: enrichedContext,
        size: size || (mode === 'trip' ? 'large' : 'medium'),
        history: [],
      }));
    },
    [tripBuilder.activeTrip, activeTripInfo]
  );

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      history: [],
    }));

    setTimeout(() => {
      setState(initialState);
    }, 300);
  }, []);

  const navigate = useCallback(
    (mode: DrawerMode, context: DrawerCtx) => {
      setState((prev) => {
        const historyItem: DrawerHistoryItem = {
          mode: prev.mode,
          context: prev.context,
          scrollPosition: 0,
        };

        // Enrich context if destination mode
        let enrichedContext = context;
        if (mode === 'destination' && context.destination && tripBuilder.activeTrip) {
          const fitAnalysis = analyzeDestinationFit(context.destination, tripBuilder.activeTrip.days);
          enrichedContext = {
            ...enrichedContext,
            tripFitAnalysis: fitAnalysis || undefined,
            activeTripInfo: activeTripInfo || undefined,
          };
        }

        return {
          ...prev,
          mode,
          context: enrichedContext,
          size: mode === 'trip' ? 'large' : prev.size,
          history: [...prev.history, historyItem],
        };
      });
    },
    [tripBuilder.activeTrip, activeTripInfo]
  );

  const back = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) {
        return { ...prev, isOpen: false };
      }

      const history = [...prev.history];
      const lastItem = history.pop()!;

      return {
        ...prev,
        mode: lastItem.mode,
        context: lastItem.context,
        history,
      };
    });
  }, []);

  const updateContext = useCallback((context: Partial<DrawerCtx>) => {
    setState((prev) => ({
      ...prev,
      context: { ...prev.context, ...context },
    }));
  }, []);

  // ==========================================
  // TRIP-AWARE HELPERS
  // ==========================================

  const openDestinationWithTrip = useCallback(
    async (destination: Destination, related?: Destination[]) => {
      const fitAnalysis = tripBuilder.activeTrip
        ? analyzeDestinationFit(destination, tripBuilder.activeTrip.days)
        : null;

      // Open immediately with what we have
      open('destination', {
        destination,
        related,
        tripFitAnalysis: fitAnalysis || undefined,
        activeTripInfo: activeTripInfo || undefined,
      });

      // If no related provided, fetch them in background
      if (!related && destination.slug) {
        try {
          const response = await fetch(
            `/api/intelligence/similar?slug=${destination.slug}&limit=4&filter=nearby`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.similar && data.similar.length > 0) {
              updateContext({ related: data.similar });
            }
          }
        } catch (error) {
          console.error('Failed to fetch related:', error);
        }
      }
    },
    [open, updateContext, tripBuilder.activeTrip, activeTripInfo]
  );

  const openTrip = useCallback(
    async (tripId?: string) => {
      if (tripId && tripId !== tripBuilder.activeTrip?.id) {
        await tripBuilder.switchToTrip(tripId);
      }
      open('trip', { tripId: tripId || tripBuilder.activeTrip?.id }, 'large');
    },
    [open, tripBuilder]
  );

  const openTripSelector = useCallback(() => {
    open('trip-select', {}, 'medium');
  }, [open]);

  const showAddToTrip = useCallback(
    (destination: Destination) => {
      const fitAnalysis = tripBuilder.activeTrip
        ? analyzeDestinationFit(destination, tripBuilder.activeTrip.days)
        : null;

      navigate('add-to-trip', {
        destination,
        tripFitAnalysis: fitAnalysis || undefined,
        activeTripInfo: activeTripInfo || undefined,
      });
    },
    [navigate, tripBuilder.activeTrip, activeTripInfo]
  );

  const addToTripAndClose = useCallback(
    (destination: Destination, day?: number) => {
      tripBuilder.addToTrip(destination, day);
      back();
    },
    [tripBuilder, back]
  );

  const addToTripQuick = useCallback(
    (destination: Destination, day?: number) => {
      tripBuilder.addToTrip(destination, day);
      // Don't close - stay on current view
    },
    [tripBuilder]
  );

  // Can go back
  const canGoBack = state.history.length > 0;

  // ==========================================
  // VALUE
  // ==========================================

  const value = useMemo<ExtendedContextType>(
    () => ({
      state,
      open,
      close,
      back,
      navigate,
      updateContext,
      canGoBack,
      openDestinationWithTrip,
      openTrip,
      openTripSelector,
      showAddToTrip,
      analyzeTripFit,
      activeTripInfo,
      addToTripAndClose,
      addToTripQuick,
    }),
    [
      state,
      open,
      close,
      back,
      navigate,
      updateContext,
      canGoBack,
      openDestinationWithTrip,
      openTrip,
      openTripSelector,
      showAddToTrip,
      analyzeTripFit,
      activeTripInfo,
      addToTripAndClose,
      addToTripQuick,
    ]
  );

  return (
    <IntelligentDrawerContext.Provider value={value}>
      {children}
    </IntelligentDrawerContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Main hook for intelligent drawer
 */
export function useIntelligentDrawer() {
  const context = useContext(IntelligentDrawerContext);
  if (!context) {
    throw new Error('useIntelligentDrawer must be used within IntelligentDrawerProvider');
  }
  return context;
}

/**
 * Hook for opening destinations with automatic trip awareness
 */
export function useDestinationDrawer() {
  const { openDestinationWithTrip, showAddToTrip, state, navigate, addToTripQuick, activeTripInfo } =
    useIntelligentDrawer();

  const showSimilar = useCallback(() => {
    if (state.context.destination) {
      navigate('similar', { destination: state.context.destination });
    }
  }, [navigate, state.context.destination]);

  const showWhyThis = useCallback(() => {
    if (state.context.destination) {
      navigate('why-this', {
        destination: state.context.destination,
        whyThis: state.context.whyThis,
      });
    }
  }, [navigate, state.context.destination, state.context.whyThis]);

  return {
    openDestination: openDestinationWithTrip,
    showSimilar,
    showWhyThis,
    showAddToTrip,
    addToTripQuick,
    activeTripInfo,
    tripFitAnalysis: state.context.tripFitAnalysis,
  };
}

/**
 * Hook for trip drawer operations
 */
export function useTripDrawer() {
  const { openTrip, openTripSelector, activeTripInfo, state, close, navigate } =
    useIntelligentDrawer();

  const isOpen = state.isOpen && (state.mode === 'trip' || state.mode === 'trip-select');

  const switchToDestination = useCallback(
    (destination: Destination) => {
      navigate('destination', { destination });
    },
    [navigate]
  );

  return {
    openTrip,
    openTripSelector,
    activeTripInfo,
    isOpen,
    close,
    switchToDestination,
  };
}

export default IntelligentDrawerContext;
