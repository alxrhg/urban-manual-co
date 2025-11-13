'use client';

import { type ReactNode } from 'react';
import clsx from 'clsx';

interface ContextStackProps {
  /** Render prop for the session resume card. */
  renderSession?: () => ReactNode;
  /** Render prop for contextual cards (preferences, etc.). */
  renderContext?: () => ReactNode;
  /** Primary hero content that should appear after the context (e.g., GreetingHero). */
  children: ReactNode;
  className?: string;
}

export function ContextStack({ renderSession, renderContext, children, className }: ContextStackProps) {
  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      {renderSession && <div>{renderSession()}</div>}
      {renderContext && <div>{renderContext()}</div>}
      <div>{children}</div>
    </div>
  );
}
