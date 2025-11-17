/**
 * Architect Badge
 * Prominent display of architect/designer - not small metadata
 */

'use client';

import { Building2 } from 'lucide-react';
import type { Architect } from '@/types/architecture';

interface ArchitectBadgeProps {
  architect: Architect | string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ArchitectBadge({ architect, size = 'md', showIcon = true }: ArchitectBadgeProps) {
  if (!architect) return null;

  const architectName = typeof architect === 'string' ? architect : architect.name;
  const architectSlug = typeof architect === 'string' ? null : architect.slug;

  const sizeClasses = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  return (
    <a
      href={architectSlug ? `/architect/${architectSlug}` : '#'}
      className={`
        inline-flex items-center gap-2
        ${sizeClasses[size]}
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        rounded-lg
        font-medium
        text-gray-900 dark:text-gray-100
        transition-colors
        border border-gray-200 dark:border-gray-700
      `}
    >
      {showIcon && <Building2 className="w-4 h-4" />}
      <span>by {architectName}</span>
    </a>
  );
}

