'use client';

import { ReactNode } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

interface LayoutShellProps {
  children: ReactNode;
  /** Use transparent header for hero sections */
  transparentHeader?: boolean;
  /** Hide footer on specific pages */
  hideFooter?: boolean;
  /** Additional class for main content */
  className?: string;
}

/**
 * LayoutShell - Unified wrapper for all pages
 * Provides consistent page structure with the new editorial aesthetic
 */
export function LayoutShell({
  children,
  transparentHeader = false,
  hideFooter = false,
  className = '',
}: LayoutShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <Header variant={transparentHeader ? 'transparent' : 'solid'} />
      <main className={`flex-1 pt-20 ${className}`}>
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
