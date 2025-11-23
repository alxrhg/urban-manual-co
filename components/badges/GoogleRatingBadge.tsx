import React from 'react';

interface GoogleRatingBadgeProps {
  rating?: number | null;
  count?: number | null;
}

export function GoogleRatingBadge({ rating, count }: GoogleRatingBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <img src="/icons/google.svg" alt="Google" className="h-3" />
      {rating && rating.toFixed(1)}
      {count ? <span className="text-[10px] opacity-75">({count})</span> : null}
    </span>
  );
}

