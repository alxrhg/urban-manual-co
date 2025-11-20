'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';

export interface UnscheduledPlace {
  id: string;
  name: string;
  city?: string | null;
  category?: string | null;
  image?: string | null;
  slug?: string | null;
  description?: string | null;
}

interface UnscheduledContextValue {
  items: UnscheduledPlace[];
  isSearching: boolean;
  lastQuery: string;
  setItems: (items: UnscheduledPlace[]) => void;
  appendItems: (items: UnscheduledPlace[]) => void;
  setIsSearching: (value: boolean) => void;
  setLastQuery: (value: string) => void;
}

const UnscheduledContext = createContext<UnscheduledContextValue | undefined>(undefined);

function dedupePlaces(places: UnscheduledPlace[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = place.slug || place.id || place.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function UnscheduledProvider({ children }: { children: React.ReactNode }) {
  const [items, setItemsState] = useState<UnscheduledPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const setItems = (newItems: UnscheduledPlace[]) => {
    setItemsState(dedupePlaces(newItems));
  };

  const appendItems = (newItems: UnscheduledPlace[]) => {
    setItemsState((prev) => dedupePlaces([...prev, ...newItems]));
  };

  const value = useMemo(
    () => ({
      items,
      isSearching,
      lastQuery,
      setItems,
      appendItems,
      setIsSearching,
      setLastQuery,
    }),
    [items, isSearching, lastQuery]
  );

  return <UnscheduledContext.Provider value={value}>{children}</UnscheduledContext.Provider>;
}

export function useUnscheduledContext() {
  const context = useContext(UnscheduledContext);
  if (!context) {
    throw new Error('useUnscheduledContext must be used within an UnscheduledProvider');
  }
  return context;
}
