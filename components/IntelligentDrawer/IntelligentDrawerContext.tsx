'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  DrawerState,
  DrawerMode,
  DrawerSize,
  DrawerContext as DrawerCtx,
  DrawerHistoryItem,
  IntelligentDrawerContextType,
} from './types';

const initialState: DrawerState = {
  isOpen: false,
  mode: 'destination',
  size: 'medium',
  position: 'right',
  context: {},
  history: [],
};

const IntelligentDrawerContext = createContext<IntelligentDrawerContextType | null>(null);

/**
 * IntelligentDrawerProvider
 *
 * Manages the unified drawer state with:
 * - Mode switching (destination, trip, chat, similar, why-this)
 * - History navigation (back button support)
 * - Context preservation across navigations
 * - Intelligent suggestions based on context
 */
export function IntelligentDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DrawerState>(initialState);

  // Open drawer with specific mode and context
  const open = useCallback(
    (mode: DrawerMode, context?: DrawerCtx, size?: DrawerSize) => {
      setState((prev) => ({
        ...prev,
        isOpen: true,
        mode,
        context: context || {},
        size: size || 'medium',
        history: [], // Reset history on new open
      }));
    },
    []
  );

  // Close drawer
  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      history: [],
    }));

    // Reset after animation
    setTimeout(() => {
      setState(initialState);
    }, 300);
  }, []);

  // Navigate to new mode within drawer (preserves history)
  const navigate = useCallback((mode: DrawerMode, context: DrawerCtx) => {
    setState((prev) => {
      // Save current state to history
      const historyItem: DrawerHistoryItem = {
        mode: prev.mode,
        context: prev.context,
        scrollPosition: 0, // Could track scroll position for better UX
      };

      return {
        ...prev,
        mode,
        context,
        history: [...prev.history, historyItem],
      };
    });
  }, []);

  // Go back in history
  const back = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) {
        // No history, close drawer
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

  // Update context without changing mode
  const updateContext = useCallback((context: Partial<DrawerCtx>) => {
    setState((prev) => ({
      ...prev,
      context: { ...prev.context, ...context },
    }));
  }, []);

  // Can go back
  const canGoBack = state.history.length > 0;

  const value = useMemo<IntelligentDrawerContextType>(
    () => ({
      state,
      open,
      close,
      back,
      navigate,
      updateContext,
      canGoBack,
    }),
    [state, open, close, back, navigate, updateContext, canGoBack]
  );

  return (
    <IntelligentDrawerContext.Provider value={value}>
      {children}
    </IntelligentDrawerContext.Provider>
  );
}

/**
 * Hook to access intelligent drawer context
 */
export function useIntelligentDrawer() {
  const context = useContext(IntelligentDrawerContext);
  if (!context) {
    throw new Error(
      'useIntelligentDrawer must be used within IntelligentDrawerProvider'
    );
  }
  return context;
}

/**
 * Hook for opening destination drawer specifically
 */
export function useDestinationDrawer() {
  const { open, navigate, state } = useIntelligentDrawer();

  const openDestination = useCallback(
    (destination: any, related?: any[], whyThis?: string) => {
      open('destination', { destination, related, whyThis }, 'medium');
    },
    [open]
  );

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

  return { openDestination, showSimilar, showWhyThis };
}

export default IntelligentDrawerContext;
