'use client';

import { Destination } from '@/types/destination';
import { capitalizeCity, cn, truncate } from '@/lib/utils';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { DesktopHoverCard } from './DesktopHoverCard';

type SummaryDestination = Pick<Destination, 'name' | 'city' | 'category' | 'micro_description' | 'description' | 'content'>;

interface MicroDescriptionHoverProps {
  destination: SummaryDestination;
  className?: string;
  textClassName?: string;
  align?: 'left' | 'right';
  clamp?: boolean;
}

function getPrimaryLine(destination: SummaryDestination): string {
  if (destination.micro_description?.trim()) {
    return destination.micro_description.trim();
  }

  if (destination.category && destination.city) {
    return `${destination.category} in ${capitalizeCity(destination.city)}`;
  }

  if (destination.city) {
    return `Located in ${capitalizeCity(destination.city)}`;
  }

  return destination.category || 'Details coming soon';
}

export function MicroDescriptionHover({
  destination,
  className,
  textClassName = 'text-xs text-gray-600 dark:text-gray-400',
  align = 'left',
  clamp = true,
}: MicroDescriptionHoverProps) {
  const primaryLine = getPrimaryLine(destination);
  const longFormSource = stripHtmlTags(destination.description || destination.content || '');
  const longForm = longFormSource ? truncate(longFormSource, 220) : undefined;
  const cityLabel = destination.city ? capitalizeCity(destination.city) : undefined;

  return (
    <DesktopHoverCard
      align={align}
      title={cityLabel ? `City snapshot · ${cityLabel}` : 'City snapshot'}
      content={
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{primaryLine}</p>
          {longForm && (
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {longForm}
            </p>
          )}
          {!longForm && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {cityLabel
                ? `${destination.name} captures the spirit of ${cityLabel}.`
                : `${destination.name} has a detailed write-up coming soon.`}
            </p>
          )}
        </div>
      }
      widthClass="w-72"
      ariaLabel="Destination micro description details"
      className={className}
    >
      <div className={cn(clamp ? 'line-clamp-1' : undefined, textClassName)}>
        {primaryLine}
      </div>
    </DesktopHoverCard>
  );
}

