'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

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

export default function SitemapPage() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {/* Collapsible Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 pb-4 mb-8">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full group"
            >
              <h1 className="text-lg font-medium text-gray-900 dark:text-white">Sitemap</h1>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
              )}
            </button>
          </div>

          {/* Sitemap Content */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {sitemapSections.map((section, index) => (
                <div key={index}>
                  <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    {section.title}
                  </h2>
                  <nav className="space-y-2">
                    {section.links.map((link, linkIndex) => (
                      <Link
                        key={linkIndex}
                        href={link.href}
                        className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

