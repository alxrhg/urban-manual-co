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
    <nav className="flex gap-6 overflow-x-auto py-3 -mb-px">
      {NAV_LINKS.map((link) => {
        const active = isActive(pathname || '', link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`
              text-sm whitespace-nowrap pb-3 border-b-2 transition-colors
              ${active
                ? 'text-black dark:text-white border-black dark:border-white'
                : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}
            `}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
