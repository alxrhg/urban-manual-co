import React from 'react';

interface MichelinBadgeProps {
  stars?: number | null;
  showLabel?: boolean;
  className?: string;
}

export function MichelinBadge({ stars, showLabel = false, className = '' }: MichelinBadgeProps) {
  if (!stars || stars <= 0) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900/90 backdrop-blur-sm text-white text-sm font-medium ${className}`}>
      <img
        src="/michelin-star.svg"
        alt="Michelin star"
        className="h-4 w-4"
        loading="lazy"
      />
      {stars}
      {showLabel && <span>Michelin star{stars > 1 ? 's' : ''}</span>}
    </span>
  );
}

