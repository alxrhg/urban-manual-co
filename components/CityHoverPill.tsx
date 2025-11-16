'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { cn, capitalizeCity } from '@/lib/utils';
import { DesktopHoverCard } from './DesktopHoverCard';

interface CityHoverPillProps {
  city: string;
  country?: string | null;
  microDescription?: string | null;
  href?: string;
  className?: string;
  align?: 'left' | 'right';
}

export function CityHoverPill({
  city,
  country,
  microDescription,
  href,
  className,
  align = 'left',
}: CityHoverPillProps) {
  if (!city) return null;

  const cityLabel = capitalizeCity(city);
  const headline = country ? `${cityLabel}, ${country}` : cityLabel;
  const description =
    microDescription && microDescription.trim().length > 0
      ? microDescription.trim()
      : `Tap to explore curated places in ${cityLabel}.`;

  const pillClasses = cn(
    'inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors',
    className
  );

  const PillElement = href
    ? (
        <Link href={href} className={pillClasses}>
          <MapPin className="h-3 w-3" />
          {headline}
        </Link>
      )
    : (
        <span className={pillClasses}>
          <MapPin className="h-3 w-3" />
          {headline}
        </span>
      );

  return (
    <DesktopHoverCard
      align={align}
      title="City spotlight"
      content={
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{headline}</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{description}</p>
          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
            Hover to preview city intel
          </p>
        </div>
      }
      widthClass="w-64"
    >
      {PillElement}
    </DesktopHoverCard>
  );
}

