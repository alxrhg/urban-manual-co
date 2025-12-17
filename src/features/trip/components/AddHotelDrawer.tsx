"use client";

import { useState } from "react";
import UMSectionTitle from "@/ui/UMSectionTitle";
import { useDrawerStore } from "@/lib/stores/drawer-store";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent } from "@/ui/card";
import { MapPin } from "lucide-react";

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
    <div className="px-6 py-8 space-y-8">
      {/* SEARCH BAR */}
      <div>
        <Input
          type="text"
          placeholder="Search hotels..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* SECTION TITLE */}
      <UMSectionTitle>Recommended Hotels</UMSectionTitle>

      {/* RESULTS */}
      <div className="space-y-4">
        {filtered.map((hotel) => (
          <Card
            key={hotel.id}
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors overflow-hidden"
            onClick={() => handleSelectHotel(hotel)}
          >
            {hotel.image ? (
              <div className="relative w-full h-40">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              </div>
            )}

            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {hotel.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {hotel.city}
                </p>
              </div>

              <Button
                className="w-full rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectHotel(hotel);
                }}
              >
                Select Hotel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
