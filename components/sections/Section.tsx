'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  contentClassName?: string;
  id?: string;
  /** Remove default padding - useful for full-width sections */
  noPadding?: boolean;
  /** Background variant */
  variant?: 'default' | 'muted' | 'card';
}

/**
 * Reusable section wrapper with consistent styling
 * Used across homepage sections for unified look and feel
 */
export function Section({
  children,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View All',
  className = '',
  contentClassName = '',
  id,
  noPadding = false,
  variant = 'default',
}: SectionProps) {
  const variantClasses = {
    default: '',
    muted: 'bg-gray-50 dark:bg-gray-900/50',
    card: 'bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800',
  };

  return (
    <section
      id={id}
      className={`
        ${noPadding ? '' : 'py-12 md:py-16 lg:py-20'}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${contentClassName}`}>
        {/* Section Header */}
        {(title || viewAllHref) && (
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              {title && (
                <h2 className="text-xl md:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
                  {subtitle}
                </p>
              )}
            </div>
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="
                  flex items-center gap-1 text-sm font-medium
                  text-gray-600 dark:text-gray-400
                  hover:text-gray-900 dark:hover:text-white
                  transition-colors duration-200
                  whitespace-nowrap
                "
              >
                {viewAllLabel}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

/**
 * Section divider for visual separation
 */
export function SectionDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <hr className="border-gray-200 dark:border-gray-800" />
    </div>
  );
}
