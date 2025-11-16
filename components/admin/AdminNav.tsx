'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin', label: 'Destinations' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/searches', label: 'Search Insights' },
  { href: '/admin/discover', label: 'Discover' },
  { href: '/admin/enrich', label: 'Enrich' },
  { href: '/admin/reindex', label: 'Reindex' },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') {
    return pathname === '/admin';
  }
  return pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-wrap gap-2 text-xs">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              inline-flex items-center rounded-full border px-4 py-2 font-medium transition-colors
              ${active
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
