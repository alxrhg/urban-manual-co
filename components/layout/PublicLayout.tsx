import { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

/**
 * PublicLayout provides the shared shell (header, footer, page container)
 * for all public pages in Urban Manual.
 * 
 * This ensures consistent branding, navigation, and footer across:
 * - Homepage (/)
 * - City pages (/city/[slug])
 * - Destination pages (/destination/[slug])
 * - Places catalogue (/places/[slug])
 * - Recent page (/recent)
 * - 404 page (not-found.tsx)
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <PublicHeader />
      <main className="min-h-screen page-transition">
        {children}
      </main>
      <PublicFooter />
    </>
  );
}

