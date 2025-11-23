import React from 'react';

interface MichelinBadgeProps {
  rating?: number | string | null;
}

export function MichelinBadge({ rating }: MichelinBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-600">
      <img src="/icons/michelin.svg" alt="Michelin" className="h-3" />
      {rating ? `${rating}` : "Michelin Guide"}
    </span>
  );
}

