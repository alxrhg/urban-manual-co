'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/destinations', label: 'Destinations' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/searches', label: 'Searches' },
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
    <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname || '', link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-all ${
              active
                ? 'font-medium text-black dark:text-white'
                : 'font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
