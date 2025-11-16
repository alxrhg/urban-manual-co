import type { PropsWithChildren } from 'react';
import { CookieConsent } from '@/components/CookieConsent';
import { Header } from './Header';
import { Footer } from './Footer';
import { useLayoutContract } from '../hooks';

export function LayoutShell({ children }: PropsWithChildren) {
  const { sections } = useLayoutContract();
  const contentSection = sections.find(section => section === 'content') ?? 'content';

  return (
    <>
      <Header />
      <main data-layout-section={contentSection} className="min-h-screen page-transition">
        {children}
      </main>
      <Footer />
      <CookieConsent />
    </>
  );
}
