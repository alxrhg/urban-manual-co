import React from 'react';
import Image from 'next/image';

interface GoogleRatingBadgeProps {
  rating?: number | null;
  count?: number | null;
}

export function GoogleRatingBadge({ rating, count }: GoogleRatingBadgeProps) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Image
        src="/icons/google.svg"
        alt="Google"
        width={12}
        height={12}
        className="h-3 w-auto"
        loading="lazy"
      />
      {rating && rating.toFixed(1)}
      {count ? <span className="text-[10px] opacity-75">({count})</span> : null}
    </span>
  );
}

