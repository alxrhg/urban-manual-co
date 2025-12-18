import React from 'react';

interface GoogleRatingBadgeProps {
  rating?: number | null;
  count?: number | null;
  className?: string;
}

export function GoogleRatingBadge({ rating, count, className = '' }: GoogleRatingBadgeProps) {
  if (!rating) return null;

  return (
    <span className={`flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      <img
        src="/google-logo.svg"
        alt="Google"
        className="h-3 w-3"
        loading="lazy"
      />
      {rating.toFixed(1)}
      {count ? <span className="text-[10px] opacity-75">({count.toLocaleString()})</span> : null}
    </span>
  );
}

