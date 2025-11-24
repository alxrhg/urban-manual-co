"use client";

import { useState } from "react";
import UMCard from "@/components/ui/UMCard";
import UMTagPill from "@/components/ui/UMTagPill";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";

/**
 * PlaceSelectorDrawer
 * - Add Meal
 * - Add Activity
 * - Replace Stop
 * - Uses Homepage Card UI
 * - Drawer Shell handled by DrawerMount
 */
export default function PlaceSelectorDrawer({
  day,
  trip,
  index,
  mealType = null,
  replaceIndex = null,
}: {
  day?: any;
  trip?: any;
  index?: number;
  mealType?: string | null;
  replaceIndex?: number | null;
}) {
  const { closeDrawer } = useDrawerStore();
  const [query, setQuery] = useState("");

  // Mock data (replace with Supabase + Google)
  const curated = [
    {
      id: 1,
      name: "Blue Bottle Coffee",
      category: "Cafe",
      city: "Tokyo",
      image: "/placeholder.jpg",
    },
    {
      id: 2,
      name: "Tsuta Ramen",
      category: "Dining",
      city: "Tokyo",
      image: "/placeholder2.jpg",
    },
  ];

  const results = curated.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (place: any) => {
    if (mealType) {
      console.log("Add meal:", mealType, place);
    } else if (replaceIndex !== null) {
      console.log("Replace stop:", replaceIndex, place);
    } else {
      console.log("Add activity:", place);
    }
    closeDrawer();
  };

  return (
    <div className="px-6 py-8 space-y-10">
      {/* SEARCH BAR */}
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search restaurants, cafes, museums..."
          className="w-full px-4 py-2.5 rounded-2xl text-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white focus:outline-none focus:border-black dark:focus:border-white transition-colors"
        />
      </div>

      {/* CATEGORY FILTERS */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        <UMTagPill>Cafe</UMTagPill>
        <UMTagPill>Dining</UMTagPill>
        <UMTagPill>Culture</UMTagPill>
        <UMTagPill>Shopping</UMTagPill>
        <UMTagPill>Hotel</UMTagPill>
        <UMTagPill>Other</UMTagPill>
      </div>

      {/* CURATED PICKS */}
      <section className="space-y-6">
        <UMSectionTitle>Curated Picks</UMSectionTitle>

        {results.length === 0 ? (
          <div className="text-center py-12 text-sm text-neutral-500 dark:text-neutral-400">
            No places found. Try a different search.
          </div>
        ) : (
          results.map((place) => (
            <UMCard
              key={place.id}
              className="p-4 space-y-3 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelect(place)}
          >
              {place.image && (
                <img
                  src={place.image}
                  alt={place.name}
                  className="w-full h-40 object-cover rounded-[16px]"
                />
              )}

              <div className="space-y-1">
                <p className="font-medium text-sm text-gray-900 dark:text-white">
                  {place.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {place.category} in {place.city}
                </p>
              </div>

              <UMActionPill
                variant="primary"
                className="w-full justify-center mt-2"
                onClick={(e) => {
                  e?.stopPropagation();
                  handleSelect(place);
                }}
              >
                {mealType
                  ? `Add to ${mealType}`
                  : replaceIndex !== null
                  ? "Replace Stop"
                  : "Add to Day"}
              </UMActionPill>
            </UMCard>
          ))
        )}
      </section>
    </div>
  );
}
