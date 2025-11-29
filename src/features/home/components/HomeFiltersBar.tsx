"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { getCategoryIconComponent } from "@/lib/icons/category-icons";
import { capitalizeCity } from "@/lib/utils";

function capitalizeCategory(category: string): string {
  return category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface HomeFiltersBarProps {
  cities: string[];
  categories: string[];
  selectedCity: string;
  selectedCategory: string;
  showAllCities: boolean;
  michelinFilter: boolean;
  onCityChange: (city: string) => void;
  onCategoryChange: (category: string) => void;
  onMichelinChange: (value: boolean) => void;
  onShowAllCitiesChange: (show: boolean) => void;
}

const FEATURED_CITIES = ["taipei", "tokyo", "new-york", "london"];

export function HomeFiltersBar({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  showAllCities,
  michelinFilter,
  onCityChange,
  onCategoryChange,
  onMichelinChange,
  onShowAllCitiesChange,
}: HomeFiltersBarProps) {
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

  return (
    <div className="flex-1 flex items-end">
      <div className="w-full pt-6">
        {/* City List */}
        <div className="mb-[50px]">
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
            <button
              onClick={() => onCityChange("")}
              className={`transition-all duration-200 ease-out ${
                !selectedCity
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
              }`}
            >
              All Cities
            </button>
            {displayedCities.map((city) => (
              <button
                key={city}
                onClick={() => onCityChange(city === selectedCity ? "" : city)}
                className={`transition-all duration-200 ease-out ${
                  selectedCity === city
                    ? "font-medium text-black dark:text-white"
                    : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                }`}
              >
                {capitalizeCity(city)}
              </button>
            ))}
          </div>

          {/* More Cities / Show Less */}
          {cities.length > displayedCities.length && !showAllCities && (
            <button
              onClick={() => onShowAllCitiesChange(true)}
              className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-colors duration-200 ease-out"
            >
              + More cities ({cities.length - displayedCities.length})
            </button>
          )}
          {showAllCities && (
            <button
              onClick={() => onShowAllCitiesChange(false)}
              className="mt-3 text-xs font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300 transition-colors duration-200 ease-out"
            >
              Show less
            </button>
          )}
        </div>

        {/* Category List */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs">
            <button
              onClick={() => {
                onCategoryChange("");
                onMichelinChange(false);
              }}
              className={`transition-all duration-200 ease-out ${
                !selectedCategory && !michelinFilter
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
              }`}
            >
              All Categories
            </button>

            {/* Michelin */}
            <button
              onClick={() => {
                onCategoryChange("");
                onMichelinChange(!michelinFilter);
              }}
              className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                michelinFilter
                  ? "font-medium text-black dark:text-white"
                  : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
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

            {/* Categories */}
            {categories
              .slice()
              .sort((a, b) => {
                if (a.toLowerCase() === "others") return 1;
                if (b.toLowerCase() === "others") return -1;
                return 0;
              })
              .map((category) => {
                const IconComponent = getCategoryIconComponent(category);
                return (
                  <button
                    key={category}
                    onClick={() => {
                      onCategoryChange(category === selectedCategory ? "" : category);
                      onMichelinChange(false);
                    }}
                    className={`flex items-center gap-1.5 transition-all duration-200 ease-out ${
                      selectedCategory === category && !michelinFilter
                        ? "font-medium text-black dark:text-white"
                        : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
                    }`}
                  >
                    {IconComponent && <IconComponent className="h-3 w-3" size={12} />}
                    {capitalizeCategory(category)}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomeFiltersBar;
