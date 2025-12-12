'use client';

import { useState, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import type { Destination } from '@/types/destination';
import type { TripItem } from '@/contexts/TripBuilderContext';

// ============================================
// TYPES
// ============================================

export type SidebarMode = 'palette' | 'inspector';

export interface DragState {
  isDragging: boolean;
  activeDestination: Destination | null;
  overDayNumber: number | null;
}

export interface UrbanStudioState {
  // Sidebar
  sidebarMode: SidebarMode;
  selectedItem: TripItem | null;
  selectedDestination: Destination | null;

  // Drag & Drop
  dragState: DragState;

  // View settings
  isCompactView: boolean;
  showTravelTimes: boolean;
}

export interface UrbanStudioContextType extends UrbanStudioState {
  // Sidebar actions
  setSidebarMode: (mode: SidebarMode) => void;
  selectItem: (item: TripItem | null) => void;
  selectDestination: (destination: Destination | null) => void;
  openInspector: (item: TripItem) => void;
  openPalette: () => void;

  // Drag actions
  setDragState: (state: Partial<DragState>) => void;
  startDrag: (destination: Destination) => void;
  updateDragOver: (dayNumber: number | null) => void;
  endDrag: () => void;

  // View actions
  toggleCompactView: () => void;
  toggleTravelTimes: () => void;
}

// ============================================
// CONTEXT
// ============================================

const UrbanStudioContext = createContext<UrbanStudioContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function UrbanStudioProvider({ children }: { children: ReactNode }) {
  // Sidebar state
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('palette');
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  // Drag state
  const [dragState, setDragStateInternal] = useState<DragState>({
    isDragging: false,
    activeDestination: null,
    overDayNumber: null,
  });

  // View state
  const [isCompactView, setIsCompactView] = useState(false);
  const [showTravelTimes, setShowTravelTimes] = useState(true);

  // Sidebar actions
  const selectItem = useCallback((item: TripItem | null) => {
    setSelectedItem(item);
    if (item) {
      setSelectedDestination(item.destination);
      setSidebarMode('inspector');
    }
  }, []);

  const selectDestination = useCallback((destination: Destination | null) => {
    setSelectedDestination(destination);
    if (destination && !selectedItem) {
      setSidebarMode('inspector');
    }
  }, [selectedItem]);

  const openInspector = useCallback((item: TripItem) => {
    setSelectedItem(item);
    setSelectedDestination(item.destination);
    setSidebarMode('inspector');
  }, []);

  const openPalette = useCallback(() => {
    setSelectedItem(null);
    setSidebarMode('palette');
  }, []);

  // Drag actions
  const setDragState = useCallback((state: Partial<DragState>) => {
    setDragStateInternal(prev => ({ ...prev, ...state }));
  }, []);

  const startDrag = useCallback((destination: Destination) => {
    setDragStateInternal({
      isDragging: true,
      activeDestination: destination,
      overDayNumber: null,
    });
  }, []);

  const updateDragOver = useCallback((dayNumber: number | null) => {
    setDragStateInternal(prev => ({ ...prev, overDayNumber: dayNumber }));
  }, []);

  const endDrag = useCallback(() => {
    setDragStateInternal({
      isDragging: false,
      activeDestination: null,
      overDayNumber: null,
    });
  }, []);

  // View actions
  const toggleCompactView = useCallback(() => {
    setIsCompactView(prev => !prev);
  }, []);

  const toggleTravelTimes = useCallback(() => {
    setShowTravelTimes(prev => !prev);
  }, []);

  const value = useMemo<UrbanStudioContextType>(() => ({
    // State
    sidebarMode,
    selectedItem,
    selectedDestination,
    dragState,
    isCompactView,
    showTravelTimes,

    // Sidebar actions
    setSidebarMode,
    selectItem,
    selectDestination,
    openInspector,
    openPalette,

    // Drag actions
    setDragState,
    startDrag,
    updateDragOver,
    endDrag,

    // View actions
    toggleCompactView,
    toggleTravelTimes,
  }), [
    sidebarMode,
    selectedItem,
    selectedDestination,
    dragState,
    isCompactView,
    showTravelTimes,
    selectItem,
    selectDestination,
    openInspector,
    openPalette,
    setDragState,
    startDrag,
    updateDragOver,
    endDrag,
    toggleCompactView,
    toggleTravelTimes,
  ]);

  return (
    <UrbanStudioContext.Provider value={value}>
      {children}
    </UrbanStudioContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useUrbanStudio() {
  const context = useContext(UrbanStudioContext);
  if (!context) {
    throw new Error('useUrbanStudio must be used within an UrbanStudioProvider');
  }
  return context;
}
