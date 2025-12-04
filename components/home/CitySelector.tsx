"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { getCategoryIconComponent } from "@/lib/icons/category-icons";
import { capitalizeCity } from "@/lib/utils";
import { trackFilterChange } from "@/lib/tracking";

// Featured cities to show first
const FEATURED_CITIES = ["Taipei", "Tokyo", "New York", "London"];

function getCategoryIcon(
  category: string
): React.ComponentType<{ className?: string; size?: number | string }> | null {
  return getCategoryIconComponent(category);
}

function capitalizeCategory(category: string): string {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export interface CitySelectorProps {
  cities: string[];
  categories: string[];
  selectedCity: string;
  selectedCategory: string;
  michelinFilter: boolean;
  onCityChange: (city: string) => void;
  onCategoryChange: (category: string, michelin?: boolean) => void;
  onMichelinToggle: () => void;
}

export function CitySelector({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  michelinFilter,
  onCityChange,
  onCategoryChange,
  onMichelinToggle,
}: CitySelectorProps) {
  const [showAllCities, setShowAllCities] = useState(false);

  // Computed values
  const featuredCities = useMemo(
    () => FEATURED_CITIES.filter((city) => cities.includes(city)),
    [cities]
  );
  const remainingCities = useMemo(
    () => cities.filter((city) => !FEATURED_CITIES.includes(city)),
    [cities]
  );
  const displayedCities = showAllCities
    ? [...featuredCities, ...remainingCities]
    : featuredCities;

  const handleCityClick = useCallback(
    (city: string) => {
      const newCity = city === selectedCity ? "" : city;
      onCityChange(newCity);
      trackFilterChange({ filterType: "city", value: newCity || "all" });
    },
    [selectedCity, onCityChange]
  );

  const handleCategoryClick = useCallback(
    (category: string) => {
      const newCategory = category === selectedCategory ? "" : category;
      onCategoryChange(newCategory);
    },
    [selectedCategory, onCategoryChange]
  );

  const handleAllCitiesClick = useCallback(() => {
    onCityChange("");
    trackFilterChange({ filterType: "city", value: "all" });
  }, [onCityChange]);

  const handleAllCategoriesClick = useCallback(() => {
    onCategoryChange("", false);
  }, [onCategoryChange]);

  return (
    <div className="w-full pt-6">
      {/* City Filters */}
      <div className="mb-[50px]">
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
          <button
            onClick={handleAllCitiesClick}
            className={`transition-all duration-200 ease-out ${
              !selectedCity
                ? "font-medium text-black dark:text-white"
                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
            }`}
          >
            All Cities
          </button>
          {displayedCities.map((city) => (
            <button
              key={city}
              onClick={() => handleCityClick(city)}
              className={`transition-all duration-200 ease-out ${
                selectedCity === city
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
              }`}
            >
              {capitalizeCity(city)}
            </button>
          ))}
        </div>

        {cities.length > displayedCities.length && !showAllCities && (
          <button
            onClick={() => setShowAllCities(true)}
            className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
          >
            + More cities ({cities.length - displayedCities.length})
          </button>
        )}
        {showAllCities && (
          <button
            onClick={() => setShowAllCities(false)}
            className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
          >
            Show less
          </button>
        )}
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
          <button
            onClick={handleAllCategoriesClick}
            className={`transition-all duration-200 ease-out ${
              !selectedCategory && !michelinFilter
                ? "font-medium text-black dark:text-white"
                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
            }`}
          >
            All Categories
          </button>
          <button
            onClick={onMichelinToggle}
            className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
              michelinFilter
                ? "font-medium text-black dark:text-white"
                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
            }`}
          >
            <Image
              src="/michelin-star.svg"
              alt="Michelin star"
              width={12}
              height={12}
              className="h-3 w-3"
            />
            Michelin
          </button>
          {categories
            .slice()
            .sort((a, b) => {
              if (a.toLowerCase() === "others") return 1;
              if (b.toLowerCase() === "others") return -1;
              return 0;
            })
            .map((category) => {
              const IconComponent = getCategoryIcon(category);
              return (
                <button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                    selectedCategory === category && !michelinFilter
                      ? "font-medium text-black dark:text-white"
                      : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60"
                  }`}
                >
                  {IconComponent && (
                    <IconComponent className="h-3 w-3" size={12} />
                  )}
                  {capitalizeCategory(category)}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
