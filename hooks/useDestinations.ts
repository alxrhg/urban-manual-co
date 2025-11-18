'use client';

import { useState, useEffect, useCallback } from 'react';
import { Destination } from '@/types/destination';
import { slugify } from '@/lib/utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTrimmedString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function pickString(...sources: Array<unknown | (() => unknown)>): string {
  for (const source of sources) {
    const candidate =
      typeof source === "function" ? (source as () => unknown)() : source;
    const text = toTrimmedString(candidate);
    if (text) {
      return text;
    }
  }
  return "";
}

function normalizeDiscoveryEngineRecord(
  recordInput: unknown
): Destination | null {
  if (!isRecord(recordInput)) {
    return null;
  }

  const record = recordInput as Record<string, unknown>;

  const name = pickString(record.name, record.title);
  const city = pickString(
    record.city,
    () => (isRecord(record.location) ? record.location.city : undefined),
    () => (isRecord(record.metadata) ? record.metadata.city : undefined),
    () => (isRecord(record.structData) ? record.structData.city : undefined),
    () => {
      const firstLocation = getFirstArrayItem(record.locations);
      return isRecord(firstLocation) ? firstLocation.city : firstLocation;
    }
  );
  const category = pickString(
    record.category,
    record.category_name,
    () => (isRecord(record.metadata) ? record.metadata.category : undefined),
    () =>
      isRecord(record.structData) ? record.structData.category : undefined,
    () => {
      const firstCategory = getFirstArrayItem(record.categories);
      return isRecord(firstCategory) ? firstCategory.category : firstCategory;
    }
  );

  const slugSource = pickString(record.slug, record.id, name);
  const slug = slugify(slugSource || name);

  if (!slug || !name || !city || !category) {
    return null;
  }

  const description =
    pickString(record.description, record.summary, record.snippet) || undefined;
  const content =
    pickString(record.content, record.longDescription, record.body) ||
    undefined;

  const imageCandidate = pickString(
    record.image,
    record.imageUrl,
    record.image_url,
    record.primaryImage,
    record.primary_image,
    record.mainImage,
    record.main_image,
    () => {
      const firstImage = getFirstArrayItem(record.images);
      if (isRecord(firstImage)) {
        return firstImage.url;
      }
      return firstImage;
    },
    () => {
      const media = record.media;
      if (isRecord(media)) {
        const firstMediaImage = getFirstArrayItem(media.images);
        if (isRecord(firstMediaImage)) {
          return firstMediaImage.url;
        }
        return firstMediaImage;
      }
      return undefined;
    }
  );

  let tags: string[] | undefined;
  const rawTags = record.tags;
  if (Array.isArray(rawTags)) {
    tags = rawTags
      .map(tag => toTrimmedString(tag))
      .filter((tag): tag is string => Boolean(tag));
  } else {
    const tagText = toTrimmedString(rawTags);
    if (tagText) {
      tags = tagText
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);
    }
  }

  const ratingValue =
    toNumberOrNull(record.rating) ??
    toNumberOrNull(record.ratingValue) ??
    toNumberOrNull(record.averageRating) ??
    toNumberOrNull(record.average_rating) ??
    toNumberOrNull(record.rating_score);

  const priceLevel =
    toNumberOrNull(record.priceLevel) ??
    toNumberOrNull(record.price_level) ??
    toNumberOrNull(record.priceLevelValue);

  const michelin =
    toNumberOrNull(record.michelin_stars) ??
    toNumberOrNull(record.michelinStars) ??
    toNumberOrNull(record.michelin) ??
    undefined;

  const badges = record.badges;
  let crown: boolean | undefined;
  if (typeof record.crown === "boolean") {
    crown = record.crown;
  } else if (Array.isArray(badges)) {
    crown = badges.some(
      badge => toTrimmedString(badge).toLowerCase() === "crown"
    );
  }

  return {
    slug,
    name,
    city,
    category,
    description,
    content,
    image: imageCandidate || undefined,
    michelin_stars: michelin ?? undefined,
    crown,
    tags,
    rating: ratingValue,
    price_level: priceLevel,
  };
}

function getFirstArrayItem(value: unknown): unknown {
  return Array.isArray(value) && value.length > 0 ? value[0] : undefined;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function useDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const extendFilterOptions = useCallback((data: Destination[]) => {
    const { cities: uniqueCities, categories: uniqueCategories } =
      extractFilterOptions(data);
    if (uniqueCities.length) {
      setCities(prev =>
        uniqueCities.length > prev.length ? uniqueCities : prev
      );
    }
    if (uniqueCategories.length) {
      setCategories(prev =>
        uniqueCategories.length > prev.length ? uniqueCategories : prev
      );
    }
  }, []);

  const applyDestinationData = useCallback((data: Destination[]) => {
    setDestinations(data);
    extendFilterOptions(data);
  }, [extendFilterOptions]);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      let destinationsData: Destination[] | null = null;
      let fetchError: any = null;
      const controller =
        typeof window !== "undefined" ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), 30000)
        : null;
      try {
        // Add cache-busting query parameter to ensure fresh data after POI creation
        const response = await fetch(
          `/api/homepage/destinations?t=${Date.now()}`,
          {
            signal: controller?.signal,
            cache: "no-store",
          }
        );
        if (!response.ok) {
          fetchError = new Error(await response.text());
        } else {
          const payload = await response.json();
          destinationsData = payload.destinations || [];
        }
      } catch (networkError: any) {
        console.warn(
          "[Destinations] Network error:",
          networkError?.message || networkError
        );
        fetchError = networkError;
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      if (
        fetchError ||
        !destinationsData ||
        !Array.isArray(destinationsData) ||
        destinationsData.length === 0
      ) {
        if (fetchError) {
          console.warn(
            "Error fetching destinations:",
            fetchError.message || fetchError
          );
        }
      }

      if (destinationsData) {
        applyDestinationData(destinationsData as Destination[]);
      }
    } catch (error: any) {
      console.warn("Error fetching destinations:", error?.message || error);
    } finally {
      setLoading(false);
    }
  }, [applyDestinationData]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  return {
    destinations,
    cities,
    categories,
    loading,
    refetch: fetchDestinations,
    applyDestinationData,
    extendFilterOptions,
    setCityOptions: setCities,
    setCategoryOptions: setCategories,
  };
}

const extractFilterOptions = (
  rows: Array<{ city?: string | null; category?: string | null }>
) => {
  const citySet = new Set<string>();
  const categorySet = new Set<string>();

  rows.forEach(row => {
    const city = (row.city ?? "").toString().trim();
    const category = (row.category ?? "").toString().trim();

    if (city) {
      citySet.add(city);
    }
    if (category) {
      categorySet.add(category);
    }
  });

  return {
    cities: Array.from(citySet).sort(),
    categories: Array.from(categorySet).sort(),
  };
};
