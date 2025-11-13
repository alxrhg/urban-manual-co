'use client';

import { type ReactNode } from 'react';
import clsx from 'clsx';

interface HeroShellProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Render function for the main hero body. This maps to the block that used to wrap
   * GreetingHero / chat output inside app/page.tsx (roughly lines 1860-2050).
   */
  renderHero: () => ReactNode;
  /** Optional render function for the footer slot (city/category lists, etc.). */
  renderFooter?: () => ReactNode;
}

export function HeroShell({ renderHero, renderFooter, className, ...sectionProps }: HeroShellProps) {
  return (
    <section
      className={clsx(
        'min-h-[65vh] flex flex-col px-6 md:px-10 lg:px-12 py-16 md:py-24 pb-8 md:pb-12',
        className,
      )}
      {...sectionProps}
    >
      <div className="w-full flex md:justify-start flex-1 items-center">
        <div className="w-full md:w-1/2 md:ml-[calc(50%-2rem)] max-w-2xl flex flex-col h-full">
          <div className="flex-1 flex items-center">
            <div className="w-full">{renderHero()}</div>
          </div>
        </div>
      </div>
      {renderFooter && (
        <div className="flex-1 flex items-end">
          <div className="w-full pt-6">{renderFooter()}</div>
        </div>
      )}
    </section>
  );
}
