'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface PlanningModeState {
  isActive: boolean;
  targetCity: string | null;
  defaultDay: number;
  quickAddEnabled: boolean;
  showConfirmation: boolean;
}

export interface PlanningModeContextType {
  // State
  planningMode: PlanningModeState;

  // Actions
  enterPlanningMode: (city?: string, defaultDay?: number) => void;
  exitPlanningMode: () => void;
  setTargetCity: (city: string | null) => void;
  setDefaultDay: (day: number) => void;
  toggleQuickAdd: (enabled?: boolean) => void;
  toggleConfirmation: (show?: boolean) => void;

  // Computed helpers
  isInPlanningMode: boolean;
  getAddLabel: (day?: number) => string;
  shouldScopeToCity: (destinationCity?: string) => boolean;
}

const defaultPlanningMode: PlanningModeState = {
  isActive: false,
  targetCity: null,
  defaultDay: 1,
  quickAddEnabled: true,
  showConfirmation: true,
};

const STORAGE_KEY = 'urban-manual-planning-mode';

const PlanningModeContext = createContext<PlanningModeContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function PlanningModeProvider({ children }: { children: React.ReactNode }) {
  const [planningMode, setPlanningMode] = useState<PlanningModeState>(defaultPlanningMode);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlanningMode(prev => ({
          ...prev,
          ...parsed,
          // Always reset isActive on page load to prevent stale state
          isActive: parsed.isActive || false,
        }));
      } catch (e) {
        console.error('Failed to load planning mode:', e);
      }
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planningMode));
  }, [planningMode]);

  // Enter planning mode
  const enterPlanningMode = useCallback((city?: string, defaultDay?: number) => {
    setPlanningMode(prev => ({
      ...prev,
      isActive: true,
      targetCity: city || prev.targetCity,
      defaultDay: defaultDay || prev.defaultDay,
    }));
  }, []);

  // Exit planning mode
  const exitPlanningMode = useCallback(() => {
    setPlanningMode(prev => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  // Set target city for scoped search
  const setTargetCity = useCallback((city: string | null) => {
    setPlanningMode(prev => ({
      ...prev,
      targetCity: city,
    }));
  }, []);

  // Set default day for quick add
  const setDefaultDay = useCallback((day: number) => {
    setPlanningMode(prev => ({
      ...prev,
      defaultDay: Math.max(1, day),
    }));
  }, []);

  // Toggle quick add (no confirmation)
  const toggleQuickAdd = useCallback((enabled?: boolean) => {
    setPlanningMode(prev => ({
      ...prev,
      quickAddEnabled: enabled ?? !prev.quickAddEnabled,
    }));
  }, []);

  // Toggle confirmation toast
  const toggleConfirmation = useCallback((show?: boolean) => {
    setPlanningMode(prev => ({
      ...prev,
      showConfirmation: show ?? !prev.showConfirmation,
    }));
  }, []);

  // Check if in planning mode
  const isInPlanningMode = useMemo(() => planningMode.isActive, [planningMode.isActive]);

  // Get contextual add label
  const getAddLabel = useCallback((day?: number) => {
    const targetDay = day || planningMode.defaultDay;
    if (planningMode.isActive) {
      return `Add to Day ${targetDay}`;
    }
    return 'Add to Trip';
  }, [planningMode.isActive, planningMode.defaultDay]);

  // Check if destination should be scoped to trip city
  const shouldScopeToCity = useCallback((destinationCity?: string) => {
    if (!planningMode.isActive || !planningMode.targetCity) return false;
    if (!destinationCity) return false;
    return destinationCity.toLowerCase() !== planningMode.targetCity.toLowerCase();
  }, [planningMode.isActive, planningMode.targetCity]);

  const value: PlanningModeContextType = {
    planningMode,
    enterPlanningMode,
    exitPlanningMode,
    setTargetCity,
    setDefaultDay,
    toggleQuickAdd,
    toggleConfirmation,
    isInPlanningMode,
    getAddLabel,
    shouldScopeToCity,
  };

  return (
    <PlanningModeContext.Provider value={value}>
      {children}
    </PlanningModeContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function usePlanningMode() {
  const context = useContext(PlanningModeContext);
  if (!context) {
    throw new Error('usePlanningMode must be used within a PlanningModeProvider');
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function usePlanningModeOptional() {
  return useContext(PlanningModeContext);
}
