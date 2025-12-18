import React from 'react';

interface MichelinBadgeProps {
  stars?: number | null;
  showLabel?: boolean;
  className?: string;
}

export function MichelinBadge({ stars, showLabel = false, className = '' }: MichelinBadgeProps) {
  if (!stars || stars <= 0) return null;

  return (
    <span className={`flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      <img
        src="/michelin-star.svg"
        alt="Michelin star"
        className="h-3 w-3"
        loading="lazy"
      />
      {stars}
      {showLabel && <span>Michelin star{stars > 1 ? 's' : ''}</span>}
    </span>
  );
}

