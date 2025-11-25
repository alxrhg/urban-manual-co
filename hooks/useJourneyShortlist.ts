"use client";

import { useCallback, useEffect, useState } from "react";
import type { Destination } from "@/types/destination";

const STORAGE_KEY = "um-shortlist";

export interface ShortlistItem {
  slug: string;
  name: string;
  city?: string;
  category?: string;
  image?: string | null;
  micro_description?: string | null;
}

function normalizeDestination(destination: Destination): ShortlistItem {
  return {
    slug: destination.slug,
    name: destination.name,
    city: destination.city,
    category: destination.category,
    image: destination.image,
    micro_description: destination.micro_description,
  };
}

/**
 * Provides a lightweight shortlist state that syncs with localStorage.
 * Enables adding/removing destinations quickly from the new action rail.
 */
export function useJourneyShortlist() {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ShortlistItem[];
        if (Array.isArray(parsed)) {
          setShortlist(parsed);
        }
      }
    } catch (error) {
      console.warn("[JourneyShortlist] Failed to parse shortlist:", error);
    }
  }, []);

  const updateShortlist = useCallback(
    (updater: (prev: ShortlistItem[]) => ShortlistItem[]) => {
      setShortlist(prev => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch (error) {
            console.warn("[JourneyShortlist] Failed to persist shortlist:", error);
          }
        }
        return next;
      });
    },
    []
  );

  const toggleShortlist = useCallback(
    (destination: Destination) => {
      updateShortlist(prev => {
        const exists = prev.some(item => item.slug === destination.slug);
        if (exists) {
          return prev.filter(item => item.slug !== destination.slug);
        }
        return [normalizeDestination(destination), ...prev].slice(0, 20);
      });
    },
    [updateShortlist]
  );

  const removeFromShortlist = useCallback(
    (slug: string) => {
      updateShortlist(prev => prev.filter(item => item.slug !== slug));
    },
    [updateShortlist]
  );

  const clearShortlist = useCallback(() => {
    updateShortlist(() => []);
  }, [updateShortlist]);

  const isShortlisted = useCallback(
    (slug: string | null | undefined) => {
      if (!slug) return false;
      return shortlist.some(item => item.slug === slug);
    },
    [shortlist]
  );

  return {
    shortlist,
    toggleShortlist,
    removeFromShortlist,
    clearShortlist,
    isShortlisted,
  };
}

