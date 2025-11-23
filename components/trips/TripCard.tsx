"use client";

import Image from "next/image";
import UMCard from "@/components/ui/UMCard";
import UMActionPill from "@/components/ui/UMActionPill";

interface Trip {
  id: string | number;
  name: string;
  coverImage?: string | null;
  city?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  [key: string]: any;
}

interface TripCardProps {
  trip: Trip;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function TripCard({ trip, onView, onEdit, onDelete }: TripCardProps) {
  const dateDisplay = trip.startDate && trip.endDate 
    ? `${trip.startDate} → ${trip.endDate}`
    : trip.startDate || trip.endDate || null;
  
  const metaInfo = [trip.city, dateDisplay].filter(Boolean).join(' • ');

  return (
    <UMCard className="p-4 space-y-3">
      {trip.coverImage && (
        <Image
          src={trip.coverImage}
          alt={trip.name}
          width={600}
          height={400}
          className="w-full h-48 object-cover rounded-[16px]"
        />
      )}

      <div className="space-y-1">
        <p className="text-[17px] font-semibold">{trip.name}</p>
        {metaInfo && (
          <p className="text-[14px] text-neutral-500">{metaInfo}</p>
        )}
      </div>

      {/* ACTION PILL ROW */}
      <div className="flex gap-2 pt-2">
        {onView && <UMActionPill onClick={onView}>View Trip</UMActionPill>}
        {onEdit && <UMActionPill onClick={onEdit}>Edit</UMActionPill>}
        {onDelete && <UMActionPill onClick={onDelete}>Delete</UMActionPill>}
      </div>
    </UMCard>
  );
}

