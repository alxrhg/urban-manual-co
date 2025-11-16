'use client';

import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { DesktopHoverCard } from './DesktopHoverCard';
import { cn, truncate } from '@/lib/utils';
import { stripHtmlTags } from '@/lib/stripHtmlTags';
import { architectNameToSlug } from '@/lib/architect-utils';

interface ArchitectHoverPillProps {
  name: string;
  summary?: string | null;
  sourcesCount?: number;
  href?: string;
  className?: string;
  align?: 'left' | 'right';
}

export function ArchitectHoverPill({
  name,
  summary,
  sourcesCount,
  href,
  className,
  align = 'left',
}: ArchitectHoverPillProps) {
  if (!name) return null;

  const safeSummary = summary
    ? truncate(stripHtmlTags(summary), 220)
    : `Explore the signature style of ${name} and discover other notable works.`;
  const destinationHref = href || `/architect/${architectNameToSlug(name)}`;

  return (
    <DesktopHoverCard
      align={align}
      title="Architect insight"
      content={
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{safeSummary}</p>
          {typeof sourcesCount === 'number' && sourcesCount > 0 && (
            <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {sourcesCount} source{sourcesCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      }
      widthClass="w-80"
    >
      <Link
        href={destinationHref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 px-3 py-1 text-xs font-medium text-gray-900 dark:text-white bg-gray-50/70 dark:bg-gray-900/70 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors',
          className
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        {name}
      </Link>
    </DesktopHoverCard>
  );
}

