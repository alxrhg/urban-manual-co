import React from 'react';

interface TabelogBadgeProps {
  rating?: number | null;
  url?: string | null;
  className?: string;
}

export function TabelogBadge({ rating, url, className = '' }: TabelogBadgeProps) {
  if (!rating) return null;

  const badge = (
    <span className={`flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      <span
        className="flex items-center justify-center h-3.5 w-3.5 rounded-sm bg-orange-500 text-white text-[8px] font-bold leading-none"
        aria-label="Tabelog"
      >
        T
      </span>
      {rating.toFixed(2)}
    </span>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
        aria-label={`View on Tabelog (rating: ${rating.toFixed(2)})`}
      >
        {badge}
      </a>
    );
  }

  return badge;
}
