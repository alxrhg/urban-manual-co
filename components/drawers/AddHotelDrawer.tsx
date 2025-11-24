"use client";

import { useState } from "react";
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";

export default function AddHotelDrawer({
  day,
  trip,
  index,
}: {
  day?: any;
  trip?: any;
  index?: number;
}) {
  const { closeDrawer } = useDrawerStore();
  const [query, setQuery] = useState("");

  // TEMP MOCK DATA — replace with Supabase + Google Hotels
  const hotels = [
    {
      id: 1,
      name: "The Okura Tokyo",
      city: "Tokyo",
      image: "/placeholder.jpg",
    },
    {
      id: 2,
      name: "Park Hyatt Tokyo",
      city: "Tokyo",
      image: "/placeholder2.jpg",
    },
    {
      id: 3,
      name: "Aman Tokyo",
      city: "Tokyo",
      image: "/placeholder3.jpg",
    },
  ];

  const filtered = hotels.filter((h) =>
    h.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectHotel = (hotel: any) => {
    console.log("Assign hotel:", hotel, "to Day:", index);
    closeDrawer();
  };

  return (
    <div className="px-6 py-8 space-y-10">
      {/* SEARCH BAR */}
      <div>
        <input
          type="text"
          placeholder="Search hotels..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-[42px] px-4 rounded-xl text-sm border border-neutral-300 bg-white dark:border-white/15 dark:bg-[#1A1C1F] placeholder:text-neutral-400 dark:placeholder:text-neutral-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-0"
        />
      </div>

      {/* SECTION TITLE */}
      <UMSectionTitle>Recommended Hotels</UMSectionTitle>

      {/* RESULTS */}
      <div className="space-y-8">
        {filtered.map((hotel) => (
          <UMCard
            key={hotel.id}
            className="p-4 space-y-3 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleSelectHotel(hotel)}
          >
            {hotel.image && (
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-40 object-cover rounded-[16px]"
              />
            )}

            <div className="space-y-1">
              <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                {hotel.name}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {hotel.city}
              </p>
            </div>

            <UMActionPill
              variant="primary"
              className="w-full justify-center"
              onClick={(e) => {
                e?.stopPropagation();
                handleSelectHotel(hotel);
              }}
            >
              Select Hotel
            </UMActionPill>
          </UMCard>
        ))}
      </div>
    </div>
  );
}
