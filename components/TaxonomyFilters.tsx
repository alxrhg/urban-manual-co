'use client';

import { useState, useEffect, useRef } from 'react';

interface TaxonomyFiltersProps {
  cities: string[];
  categories: string[];
  selectedCity?: string;
  selectedCategory?: string;
  onCityChange: (city: string) => void;
  onCategoryChange: (category: string) => void;
  capitalizeCity?: (city: string) => string;
  capitalizeCategory?: (category: string) => string;
}

export function TaxonomyFilters({
  cities,
  categories,
  selectedCity,
  selectedCategory,
  onCityChange,
  onCategoryChange,
  capitalizeCity = (c: string) => c,
  capitalizeCategory = (c: string) => c,
}: TaxonomyFiltersProps) {
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cities to display (first 8, then all if expanded)
  const displayedCities = showAllCities ? cities : cities.slice(0, 8);
  const hasMoreCities = cities.length > 8;

  // Categories to display (first 8, then all if expanded)
  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);
  const hasMoreCategories = categories.length > 8;

  // Mobile Sheet Component
  const MobileSheet = () => {
    if (!isMobileSheetOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsMobileSheetOpen(false)}
        />
        <div className="fixed bottom-0 left-0 right-0 bg-white z-50 rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-4 border-b border-[#E6E6E6]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a]">
                Filters
              </div>
              <button
                onClick={() => setIsMobileSheetOpen(false)}
                className="text-[13px] text-[#888] hover:opacity-60 transition-opacity"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-12">
            {/* Cities Section */}
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-2">
                Cities
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    onCityChange('');
                    setIsMobileSheetOpen(false);
                  }}
                  className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                    !selectedCity
                      ? 'font-medium text-[#111111] opacity-100'
                      : 'text-[#111111] opacity-100 hover:opacity-55'
                  }`}
                >
                  All Cities
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      onCityChange(city === selectedCity ? '' : city);
                      setIsMobileSheetOpen(false);
                    }}
                    className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                      selectedCity === city
                        ? 'font-medium text-[#111111] opacity-100'
                        : 'text-[#111111] opacity-100 hover:opacity-55'
                    }`}
                  >
                    {capitalizeCity(city)}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Section */}
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-2">
                Categories
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    onCategoryChange('');
                    setIsMobileSheetOpen(false);
                  }}
                  className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                    !selectedCategory
                      ? 'font-medium text-[#111111] opacity-100'
                      : 'text-[#111111] opacity-100 hover:opacity-55'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      onCategoryChange(category === selectedCategory ? '' : category);
                      setIsMobileSheetOpen(false);
                    }}
                    className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                      selectedCategory === category
                        ? 'font-medium text-[#111111] opacity-100'
                        : 'text-[#111111] opacity-100 hover:opacity-55'
                    }`}
                  >
                    {capitalizeCategory(category)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 border-t border-[#E6E6E6]">
            <button
              onClick={() => setIsMobileSheetOpen(false)}
              className="w-full py-3 px-6 border border-[#E6E6E6] text-[16px] font-normal text-[#111111] hover:bg-[rgba(0,0,0,0.04)] transition-colors duration-200"
            >
              Apply
            </button>
          </div>
        </div>
      </>
    );
  };

  // Desktop: Stacked Ribbons
  if (!isMobile) {
    return (
      <div className="mt-12 mb-12 space-y-6">
        {/* Cities Ribbon */}
        {cities.length > 0 && (
          <div>
            <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-2">
              Cities
            </div>
            <div className="flex flex-wrap items-center">
              {displayedCities.map((city, index) => (
                <button
                  key={city}
                  onClick={() => onCityChange(city === selectedCity ? '' : city)}
                  className="inline-block text-[16px] font-normal tracking-[-0.1px] text-[#111111] mr-6 py-1 transition-opacity duration-200 hover:opacity-55"
                  style={{
                    fontWeight: selectedCity === city ? 400 : 300,
                    opacity: selectedCity === city ? 1 : 1,
                  }}
                >
                  {capitalizeCity(city)}
                </button>
              ))}
              {hasMoreCities && !showAllCities && (
                <button
                  onClick={() => setShowAllCities(true)}
                  className="inline-block text-[13px] text-[#666] mr-6 py-1 transition-opacity duration-200 hover:opacity-60"
                >
                  + More
                </button>
              )}
              {showAllCities && hasMoreCities && (
                <button
                  onClick={() => setShowAllCities(false)}
                  className="inline-block text-[13px] text-[#666] mr-6 py-1 transition-opacity duration-200 hover:opacity-60"
                >
                  - Less
                </button>
              )}
            </div>
          </div>
        )}

        {/* Categories Ribbon */}
        {categories.length > 0 && (
          <div>
            <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-2">
              Categories
            </div>
            <div className="flex flex-wrap items-center">
              {displayedCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => onCategoryChange(category === selectedCategory ? '' : category)}
                  className="inline-block text-[16px] font-normal tracking-[-0.1px] text-[#111111] mr-6 py-1 transition-opacity duration-200 hover:opacity-55"
                  style={{
                    fontWeight: selectedCategory === category ? 400 : 300,
                    opacity: selectedCategory === category ? 1 : 1,
                  }}
                >
                  {capitalizeCategory(category)}
                </button>
              ))}
              {hasMoreCategories && !showAllCategories && (
                <button
                  onClick={() => setShowAllCategories(true)}
                  className="inline-block text-[13px] text-[#666] mr-6 py-1 transition-opacity duration-200 hover:opacity-60"
                >
                  + More
                </button>
              )}
              {showAllCategories && hasMoreCategories && (
                <button
                  onClick={() => setShowAllCategories(false)}
                  className="inline-block text-[13px] text-[#666] mr-6 py-1 transition-opacity duration-200 hover:opacity-60"
                >
                  - Less
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expand Sheet for Overflow (when + More is clicked) */}
        {(showAllCities || showAllCategories) && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => {
            setShowAllCities(false);
            setShowAllCategories(false);
          }} />
        )}
        {(showAllCities || showAllCategories) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div
              className="bg-white max-w-4xl w-full max-h-[80vh] overflow-y-auto p-12"
              onClick={(e) => e.stopPropagation()}
            >
              {showAllCities && (
                <div className="mb-12">
                  <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-4">
                    All Cities
                  </div>
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    style={{ rowGap: '16px' }}
                  >
                    {cities.map((city) => (
                      <button
                        key={city}
                        onClick={() => {
                          onCityChange(city === selectedCity ? '' : city);
                          setShowAllCities(false);
                        }}
                        className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                          selectedCity === city
                            ? 'font-medium text-[#111111] opacity-100'
                            : 'text-[#111111] opacity-100 hover:opacity-55'
                        }`}
                      >
                        {capitalizeCity(city)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showAllCategories && (
                <div>
                  <div className="text-[13px] font-medium uppercase tracking-[0.5px] text-[#8a8a8a] mb-4">
                    All Categories
                  </div>
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    style={{ rowGap: '16px' }}
                  >
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          onCategoryChange(category === selectedCategory ? '' : category);
                          setShowAllCategories(false);
                        }}
                        className={`text-left text-[16px] font-normal tracking-[-0.1px] py-1 transition-opacity duration-200 ${
                          selectedCategory === category
                            ? 'font-medium text-[#111111] opacity-100'
                            : 'text-[#111111] opacity-100 hover:opacity-55'
                        }`}
                      >
                        {capitalizeCategory(category)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 pt-6 border-t border-[#E6E6E6]">
                <button
                  onClick={() => {
                    setShowAllCities(false);
                    setShowAllCategories(false);
                  }}
                  className="text-[13px] text-[#666] hover:opacity-60 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile: Bottom Sheet
  return (
    <>
      <div className="mt-12 mb-12">
        <button
          onClick={() => setIsMobileSheetOpen(true)}
          className="text-[16px] font-normal text-[#111111] hover:opacity-60 transition-opacity"
        >
          Filter ▾
        </button>
      </div>
      <MobileSheet />
    </>
  );
}

