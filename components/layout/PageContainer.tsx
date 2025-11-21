import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageContainer provides consistent max-width and padding for page content
 * across all public pages. This ensures visual consistency.
 */
export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 ${className}`}>
      {children}
    </div>
  );
}

