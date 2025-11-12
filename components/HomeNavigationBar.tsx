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

const baseButtonClasses =
  "flex w-full items-center gap-2 rounded-full border border-gray-200 bg-white/85 px-4 py-3 text-base font-medium text-gray-800 shadow-sm transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 hover:border-gray-300 hover:bg-white min-h-[44px] touch-manipulation dark:border-gray-800 dark:bg-gray-900/85 dark:text-gray-100 dark:hover:border-gray-700 dark:hover:bg-gray-900/60 dark:focus-visible:ring-white";
const menuTriggerClasses =
  `${baseButtonClasses} justify-between md:w-auto md:justify-center`;
const actionButtonClasses = `${baseButtonClasses} justify-center md:w-auto`;

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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;

      if (isCitiesOpen) {
        const withinButton = cityButtonRef.current?.contains(target);
        const withinMenu = cityMenuRef.current?.contains(target);
        if (!withinButton && !withinMenu) {
          setIsCitiesOpen(false);
        }
      }

      if (isCategoriesOpen) {
        const withinButton = categoryButtonRef.current?.contains(target);
        const withinMenu = categoryMenuRef.current?.contains(target);
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
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
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
      className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className ?? ""}`}
      role="navigation"
      aria-label="Homepage navigation"
    >
      <div className="relative w-full sm:w-auto">
        <button
          ref={cityButtonRef}
          type="button"
          onClick={() => {
            setIsCitiesOpen((prev) => !prev);
            setIsCategoriesOpen(false);
          }}
          className={menuTriggerClasses}
          aria-haspopup="true"
          aria-expanded={isCitiesOpen}
        >
          Cities
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${
              isCitiesOpen ? "rotate-180" : ""
            }`}
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
            className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90"
          >
            <div className="py-1">
              {VISIBLE_CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    const slug = slugifyCity(city);
                    if (!slug) return;
                    setIsCitiesOpen(false);
                    router.push(`/city/${slug}`);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-base text-gray-700 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80 dark:focus-visible:bg-gray-800/80"
                >
                  {capitalizeCity(city)}
                  <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Explore</span>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 bg-gray-50/80 px-4 py-3 text-right text-sm font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-400">
              <Link
                href="/cities"
                onClick={() => setIsCitiesOpen(false)}
                className="inline-flex items-center justify-end gap-2 text-gray-600 transition-colors duration-200 hover:text-gray-900 focus:outline-none focus-visible:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                View all cities
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="relative w-full sm:w-auto">
        <button
          ref={categoryButtonRef}
          type="button"
          onClick={() => {
            setIsCategoriesOpen((prev) => !prev);
            setIsCitiesOpen(false);
          }}
          className={menuTriggerClasses}
          aria-haspopup="true"
          aria-expanded={isCategoriesOpen}
        >
          Categories
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${
              isCategoriesOpen ? "rotate-180" : ""
            }`}
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
            className="absolute left-0 right-0 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90 md:left-auto md:w-56"
          >
            <div className="py-1">
              {CATEGORY_ITEMS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    const query = category.trim();
                    if (!query) return;
                    setIsCategoriesOpen(false);
                    router.push(`/search?q=${encodeURIComponent(query)}`);
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-base text-gray-700 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus-visible:bg-gray-100 focus-visible:ring-1 focus-visible:ring-gray-300 dark:text-gray-100 dark:hover:bg-gray-800/80 dark:focus-visible:bg-gray-800/80"
                >
                  {capitalizeCategory(category)}
                  <span className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Search</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleFiltersClick}
        className={actionButtonClasses}
      >
        Filters
      </button>

      <button
        type="button"
        onClick={handleStartTrip}
        className={actionButtonClasses}
      >
        <Plus className="h-5 w-5" />
        Start a Trip
      </button>
    </div>
  );
}

export default HomeNavigationBar;
