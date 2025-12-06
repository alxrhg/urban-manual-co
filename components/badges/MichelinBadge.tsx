import React from 'react';
import Image from 'next/image';

interface MichelinBadgeProps {
  rating?: number | string | null;
}

export function MichelinBadge({ rating }: MichelinBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600">
      <Image
        src="/icons/michelin.svg"
        alt="Michelin"
        width={12}
        height={12}
        className="h-3 w-auto"
        loading="lazy"
      />
      {rating ? `${rating}` : "Michelin Guide"}
    </span>
  );
}

