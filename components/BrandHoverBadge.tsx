'use client';

import { Destination } from '@/types/destination';
import { capitalizeCity, cn } from '@/lib/utils';
import { DesktopHoverCard } from './DesktopHoverCard';

interface BrandHoverBadgeProps {
  destination: Pick<Destination, 'brand' | 'city' | 'category' | 'name'>;
  className?: string;
  align?: 'left' | 'right';
}

export function BrandHoverBadge({ destination, className, align = 'left' }: BrandHoverBadgeProps) {
  if (!destination.brand) return null;

  const cityLabel = destination.city ? capitalizeCity(destination.city) : null;
  const experienceLabel = destination.category
    ? destination.category.toLowerCase()
    : 'experience';

  return (
    <DesktopHoverCard
      align={align}
      title="Brand insight"
      content={
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{destination.brand}</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            {destination.name} showcases the {destination.brand} take on {experienceLabel}
            {cityLabel ? ` in ${cityLabel}` : ''}. Hover to compare how this brand expresses its DNA across the collection.
          </p>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Brand profile coming soon
          </p>
        </div>
      }
      widthClass="w-72"
      ariaLabel="Brand insight popover"
      className={cn('inline-flex', className)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm'
        )}
      >
        {destination.brand}
      </span>
    </DesktopHoverCard>
  );
}

