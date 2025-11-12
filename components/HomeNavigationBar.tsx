"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { capitalizeCategory, capitalizeCity } from "@/lib/utils";

const VISIBLE_CITIES = ["Taipei", "Tokyo", "New York", "London"] as const;
const CATEGORY_ITEMS = [
  "Michelin",
  "Dining",
  "Hotel",
  "Bar",
  "Cafe",
  "Culture",
  "Shopping",
] as const;

type HomeNavigationBarProps = {
  className?: string;
  onFiltersClick?: () => void;
  onStartTrip?: () => void;
};

function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function HomeNavigationBar({
  className,
  onFiltersClick,
  onStartTrip,
}: HomeNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCitiesOpen, setIsCitiesOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const cityButtonRef = useRef<HTMLButtonElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const cityMenuRef = useRef<HTMLDivElement>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const isHome = pathname === "/";
  const isMap = pathname === "/map";

  // Rebuild dropdown close logic - allow navigation to complete
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;

      if (isCitiesOpen) {
        const withinButton = cityButtonRef.current?.contains(target);
        const withinMenu = cityMenuRef.current?.contains(target);
        // Only close if clicking outside both button and menu
        if (!withinButton && !withinMenu) {
          setIsCitiesOpen(false);
        }
      }

      if (isCategoriesOpen) {
        const withinButton = categoryButtonRef.current?.contains(target);
        const withinMenu = categoryMenuRef.current?.contains(target);
        // Only close if clicking outside both button and menu
        if (!withinButton && !withinMenu) {
          setIsCategoriesOpen(false);
        }
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCitiesOpen(false);
        setIsCategoriesOpen(false);
      }
    }

    if (isCitiesOpen || isCategoriesOpen) {
      // Use a slight delay to allow click handlers to execute first
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClick);
      }, 0);
      document.addEventListener("keydown", handleKey);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKey);
      };
    }
  }, [isCitiesOpen, isCategoriesOpen]);

  const handleFiltersClick = () => {
    if (onFiltersClick) {
      onFiltersClick();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-search-filters"));
    }

    if (!isHome && !isMap) {
      router.push("/#filters");
    }
  };

  const handleStartTrip = () => {
    if (onStartTrip) {
      onStartTrip();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-trip-planner"));
    }

    if (!isHome) {
      router.push("/trips?new=1");
    }
  };

  return (
    <div
      className={`flex items-center gap-3 flex-wrap ${className ?? ""}`}
      role="navigation"
      aria-label="Homepage navigation"
    >
      <div className="relative">
        <button
          ref={cityButtonRef}
          type="button"
          onClick={() => {
            setIsCitiesOpen((prev) => !prev);
            setIsCategoriesOpen(false);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
          aria-haspopup="true"
          aria-expanded={isCitiesOpen}
        >
          Cities
          <svg
            className={`h-4 w-4 transition-transform ${isCitiesOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isCitiesOpen && (
          <div
            ref={cityMenuRef}
            className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="py-1">
              {VISIBLE_CITIES.map((city) => {
                const slug = slugifyCity(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!slug) return;
                      // Close dropdown first
                      setIsCitiesOpen(false);
                      // Then navigate after a brief delay to ensure dropdown closes
                      setTimeout(() => {
                        router.push(`/city/${slug}`);
                      }, 100);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    {capitalizeCity(city)}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-right text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
              <Link
                href="/cities"
                onClick={(e) => {
                  e.stopPropagation();
                  // Close dropdown and navigate
                  setIsCitiesOpen(false);
                  // Let Link handle navigation naturally
                }}
                className="transition hover:text-gray-900 dark:hover:text-gray-200"
              >
                View all cities
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          ref={categoryButtonRef}
          type="button"
          onClick={() => {
            setIsCategoriesOpen((prev) => !prev);
            setIsCitiesOpen(false);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
          aria-haspopup="true"
          aria-expanded={isCategoriesOpen}
        >
          Categories
          <svg
            className={`h-4 w-4 transition-transform ${isCategoriesOpen ? "rotate-180" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isCategoriesOpen && (
          <div
            ref={categoryMenuRef}
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="py-1">
              {CATEGORY_ITEMS.map((category) => {
                const query = category.trim();
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!query) return;
                      // Close dropdown first
                      setIsCategoriesOpen(false);
                      // Then navigate after a brief delay to ensure dropdown closes
                      setTimeout(() => {
                        router.push(`/search?q=${encodeURIComponent(query)}`);
                      }, 100);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    {capitalizeCategory(category)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleFiltersClick}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
      >
        Filters
      </button>

      <button
        type="button"
        onClick={handleStartTrip}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:text-gray-200 dark:hover:border-gray-700 dark:hover:bg-gray-900/60"
      >
        <Plus className="h-4 w-4" />
        Start a Trip
      </button>
    </div>
  );
}

export default HomeNavigationBar;
