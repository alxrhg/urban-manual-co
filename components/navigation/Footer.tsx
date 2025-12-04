'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { openCookieSettings } from '@/components/shared/CookieConsent';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const sitemapSections = [
  {
    title: 'Most Common Pages',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Explore', href: '/explore' },
      { label: 'Cities', href: '/cities' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { label: 'All Cities', href: '/cities' },
      { label: 'Restaurants', href: '/category/restaurant' },
      { label: 'Hotels', href: '/category/hotel' },
      { label: 'Cafes', href: '/category/cafe' },
      { label: 'Bars', href: '/category/bar' },
    ],
  },
  {
    title: 'Features',
    links: [
      { label: 'My Trips', href: '/trips' },
      { label: 'My Collections', href: '/account?tab=collections' },
      { label: 'Saved Places', href: '/account?tab=saved' },
      { label: 'Visited Places', href: '/account?tab=visited' },
      { label: 'Activity Feed', href: '/feed' },
    ],
  },
  {
    title: 'Account & Settings',
    links: [
      { label: 'My Account', href: '/account' },
      { label: 'Settings', href: '/account?tab=settings' },
      { label: 'Profile', href: '/profile' },
    ],
  },
  {
    title: 'Information',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Newsletter', href: '/newsletter' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
];

export function Footer() {
  const [isSitemapExpanded, setIsSitemapExpanded] = useState(false);

  return (
    <footer className="mt-20 border-t border-gray-200 dark:border-gray-800 relative" role="contentinfo">
      <div className="w-full px-6 md:px-10 lg:px-12 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>© {new Date().getFullYear()} The Manual Company. All Rights Reserved.</div>

          <div className="flex items-center gap-6">
            <Link href="/newsletter" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Newsletter
            </Link>
            <Link href="/about" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Contact
            </Link>
            <button
              onClick={() => setIsSitemapExpanded(!isSitemapExpanded)}
              className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-expanded={isSitemapExpanded}
              aria-controls="footer-sitemap"
            >
              Sitemap
              {isSitemapExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-6">
            <ThemeToggle />
            <button
              onClick={openCookieSettings}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cookie Settings
            </button>
            <Link href="/privacy" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Expandable Sitemap */}
      {isSitemapExpanded && (
        <div id="footer-sitemap" className="w-full px-6 md:px-10 lg:px-12 py-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {sitemapSections.map((section, index) => (
                <div key={index}>
                  <h2 className="text-xs font-medium text-gray-900 dark:text-white mb-2">
                    {section.title}
                  </h2>
                  <nav className="space-y-1">
                    {section.links.map((link, linkIndex) => (
                      <Link
                        key={linkIndex}
                        href={link.href}
                        className="block text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
