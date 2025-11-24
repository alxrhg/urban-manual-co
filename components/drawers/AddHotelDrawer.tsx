"use client";

import { useState, useEffect } from "react";
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";
import UMSectionTitle from "@/components/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Day {
  date: string;
  city: string;
  [key: string]: any;
}

interface Trip {
  id?: string;
  [key: string]: any;
}

interface Hotel {
  id: number;
  name: string;
  city: string;
  image?: string;
  slug?: string;
  rating?: number;
  [key: string]: any;
}

interface AddHotelDrawerProps {
  trip?: Trip | null;
  day?: Day | null;
  index?: number;
}

export default function AddHotelDrawer({ trip, day, index }: AddHotelDrawerProps) {
  const { closeDrawer } = useDrawerStore();
  const [query, setQuery] = useState("");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch hotels from Supabase
  useEffect(() => {
    const fetchHotels = async () => {
      const city = day?.city || trip?.destination || null;
      if (!city) return;

      setLoading(true);
      try {
        const supabase = createClient();
        if (!supabase) return;

        let queryBuilder = supabase
          .from("destinations")
          .select("id, name, category, city, image, slug, rating")
          .eq("category", "Hotel")
          .ilike("city", `%${city}%`)
          .limit(20);

        const { data, error } = await queryBuilder;

        if (error) throw error;
        setHotels((data || []) as Hotel[]);
      } catch (error) {
        console.error("Error fetching hotels:", error);
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [day?.city, trip?.destination]);

  // Filter hotels by search query
  const filtered = hotels.filter((h) =>
    h.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectHotel = (hotel: Hotel) => {
    console.log("Assign hotel:", hotel, "to day:", index);
    // TODO: Implement hotel assignment functionality
    closeDrawer();
  };

  return (
    <div className="px-6 py-6 space-y-10">
      {/* SEARCH INPUT */}
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          placeholder="Search hotels..."
          className="w-full h-[42px] px-4 rounded-xl bg-white border border-neutral-300 text-sm text-gray-900 dark:bg-[#1A1C1F] dark:border-white/20 dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:ring-offset-0"
        />
      </div>

      {/* SECTION */}
      <UMSectionTitle>Recommended Hotels</UMSectionTitle>

      {/* HOTEL LIST */}
      {loading ? (
        <div className="text-center py-8 text-sm text-neutral-500">
          Loading hotels...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-neutral-500">
          No hotels found. Try a different search.
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((hotel) => (
            <UMCard
              key={hotel.id}
              className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleSelectHotel(hotel)}
            >
              {/* IMAGE */}
              {hotel.image && (
                <div className="w-full h-40 relative overflow-hidden rounded-[16px] mb-3">
                  <Image
                    src={hotel.image}
                    alt={hotel.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* INFO */}
              <div className="mt-3 space-y-1">
                <p className="text-[17px] font-semibold text-gray-900 dark:text-white">
                  {hotel.name}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {hotel.city}
                </p>
                {hotel.rating && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    ⭐ {hotel.rating}
                  </p>
                )}
              </div>

              {/* ACTION */}
              <div className="pt-3">
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
              </div>
            </UMCard>
          ))}
        </div>
      )}
    </div>
  );
}

