"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { ChevronDownIcon } from "@/components/icons/ChevronDown";
import { Button } from "@/components/ui/button";
import { cn, capitalizeCategory, capitalizeCity } from "@/lib/utils";

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
  const cityMenuId = useId();
  const categoryMenuId = useId();
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
      className={cn("flex flex-wrap items-center gap-3", className)}
      role="navigation"
      aria-label="Homepage navigation"
    >
      <div className="relative">
        <Button
          ref={cityButtonRef}
          type="button"
          onClick={() => {
            setIsCitiesOpen((prev) => !prev);
            setIsCategoriesOpen(false);
          }}
          aria-haspopup="true"
          aria-expanded={isCitiesOpen}
          aria-controls={cityMenuId}
          variant="pill"
          size="pill-md"
          data-state={isCitiesOpen ? "open" : "closed"}
        >
          Cities
          <ChevronDownIcon
            className={cn(
              "transition-transform duration-200",
              isCitiesOpen && "rotate-180"
            )}
          />
        </Button>
        {isCitiesOpen && (
          <div
            ref={cityMenuRef}
            id={cityMenuId}
            className="absolute right-0 mt-3 w-48 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-lg ring-1 ring-black/5 dark:bg-muted"
          >
            <div className="py-1.5">
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
                  className="block w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:bg-secondary"
                >
                  {capitalizeCity(city)}
                </button>
              ))}
            </div>
            <div className="border-t border-border/70 bg-secondary/40 px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              <Link
                href="/cities"
                onClick={() => setIsCitiesOpen(false)}
                className="transition-colors hover:text-foreground"
              >
                View all cities
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <Button
          ref={categoryButtonRef}
          type="button"
          onClick={() => {
            setIsCategoriesOpen((prev) => !prev);
            setIsCitiesOpen(false);
          }}
          aria-haspopup="true"
          aria-expanded={isCategoriesOpen}
          aria-controls={categoryMenuId}
          variant="pill"
          size="pill-md"
          data-state={isCategoriesOpen ? "open" : "closed"}
        >
          Categories
          <ChevronDownIcon
            className={cn(
              "transition-transform duration-200",
              isCategoriesOpen && "rotate-180"
            )}
          />
        </Button>
        {isCategoriesOpen && (
          <div
            ref={categoryMenuRef}
            id={categoryMenuId}
            className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-border/80 bg-popover shadow-lg ring-1 ring-black/5 dark:bg-muted"
          >
            <div className="py-1.5">
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
                  className="block w-full px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:bg-secondary"
                >
                  {capitalizeCategory(category)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={handleFiltersClick}
        variant="pill"
        size="pill-md"
      >
        Filters
      </Button>

      <Button
        type="button"
        onClick={handleStartTrip}
        variant="pill"
        size="pill-lg"
      >
        <Plus className="size-4" />
        Start a Trip
      </Button>
    </div>
  );
}

export default HomeNavigationBar;
