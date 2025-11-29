'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * AppShell - Cohesive wrapper for header and page content
 *
 * Creates a unified visual experience where the header and content
 * feel like part of the same page, not separate elements.
 *
 * Features:
 * - Shared background between header and content
 * - Consistent page transitions
 * - Unified gutters and max-width
 * - Seamless scrolling experience
 */

export interface AppShellProps {
  /** Header content */
  header?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Background variant */
  background?: 'default' | 'subtle' | 'transparent';
  /** Whether to show the unified page wrapper */
  unified?: boolean;
  /** Additional class for the shell */
  className?: string;
}

export function AppShell({
  header,
  children,
  footer,
  background = 'default',
  unified = true,
  className,
}: AppShellProps) {
  const backgroundClasses = {
    default: 'bg-white dark:bg-um-slate-950',
    subtle: 'bg-um-gray-50 dark:bg-um-slate-950',
    transparent: 'bg-transparent',
  };

  if (!unified) {
    return (
      <div className={cn('min-h-screen flex flex-col', backgroundClasses[background], className)}>
        {header}
        <main className="flex-1">{children}</main>
        {footer}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-h-screen flex flex-col',
        backgroundClasses[background],
        className
      )}
    >
      {/* Unified page wrapper - header and content share the same visual space */}
      <div className="flex-1 flex flex-col">
        {/* Header - integrated into page flow, no separate background */}
        {header && (
          <div className="relative z-header shrink-0">
            {header}
          </div>
        )}

        {/* Main content - flows naturally from header */}
        <main
          id="main-content"
          className="flex-1 page-transition"
          role="main"
        >
          {children}
        </main>
      </div>

      {/* Footer - at the bottom */}
      {footer}
    </div>
  );
}

/**
 * PageWrapper - Consistent page-level wrapper with unified gutters
 *
 * Use this inside pages to maintain consistent spacing with header
 */
export interface PageWrapperProps {
  children: React.ReactNode;
  /** Max width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
  /** Padding variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Top spacing (accounts for header) */
  topSpacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Bottom spacing */
  bottomSpacing?: 'none' | 'sm' | 'md' | 'lg';
  /** Center content */
  centered?: boolean;
  /** Additional class */
  className?: string;
}

export function PageWrapper({
  children,
  maxWidth = 'xl',
  padding = 'md',
  topSpacing = 'none',
  bottomSpacing = 'md',
  centered = true,
  className,
}: PageWrapperProps) {
  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-[1280px]',
    full: 'max-w-[1800px]',
    none: '',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-4 md:px-6',
    md: 'px-6 md:px-10',
    lg: 'px-8 md:px-12',
  };

  const topSpacingClasses = {
    none: '',
    sm: 'pt-4 md:pt-6',
    md: 'pt-6 md:pt-10',
    lg: 'pt-10 md:pt-16',
  };

  const bottomSpacingClasses = {
    none: '',
    sm: 'pb-8 md:pb-12',
    md: 'pb-12 md:pb-20',
    lg: 'pb-20 md:pb-32',
  };

  return (
    <div
      className={cn(
        'w-full',
        paddingClasses[padding],
        topSpacingClasses[topSpacing],
        bottomSpacingClasses[bottomSpacing],
        className
      )}
    >
      <div
        className={cn(
          maxWidthClasses[maxWidth],
          centered && 'mx-auto'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default AppShell;
