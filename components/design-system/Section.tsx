'use client';

import * as React from 'react';
import clsx from 'clsx';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ children, className, ...rest }, ref) => (
    <section
      ref={ref}
      className={clsx('space-y-6', className)}
      {...rest}
    >
      {children}
    </section>
  )
);
Section.displayName = 'Section';

export interface SectionHeaderProps {
  eyebrow?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  align?: 'start' | 'center';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  icon,
  actions,
  align = 'start',
}: SectionHeaderProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        align === 'center' && 'text-center md:text-left',
      )}
    >
      <div className={clsx('space-y-2', align === 'center' && 'md:text-left')}>
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
            {eyebrow}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          {icon ? <span className="text-gray-500 dark:text-gray-400">{icon}</span> : null}
          {title ? (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export interface SectionRailProps {
  children: React.ReactNode;
  className?: string;
  tone?: 'none' | 'subtle';
}

export function SectionRail({ children, className, tone = 'none' }: SectionRailProps) {
  return (
    <div
      className={clsx(
        'space-y-6',
        tone === 'subtle' && 'rounded-3xl border border-gray-100 dark:border-gray-800/80 bg-white/60 dark:bg-gray-900/40 p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
