'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  MapPin,
  TrendingUp,
  Search,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview', icon: LayoutDashboard },
  { href: '/admin/destinations', label: 'Destinations', value: 'destinations', icon: MapPin },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics', icon: TrendingUp },
  { href: '/admin/searches', label: 'Searches', value: 'searches', icon: Search },
  { href: '/admin/enrich', label: 'Enrich', value: 'enrich', icon: Sparkles },
  { href: '/admin/reindex', label: 'Reindex', value: 'reindex', icon: RefreshCw },
];

function getActiveValue(pathname: string) {
  if (pathname === '/admin') return 'overview';
  const match = NAV_LINKS.find(link => link.href !== '/admin' && pathname.startsWith(link.href));
  return match?.value || 'overview';
}

interface AdminNavProps {
  minimal?: boolean;
}

export function AdminNav({ minimal = false }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeValue = getActiveValue(pathname || '');

  // Minimal version for dashboard header - shows icon links
  if (minimal) {
    return (
      <nav className="flex items-center gap-1">
        {NAV_LINKS.filter(link => link.value !== 'overview').map((link) => {
          const Icon = link.icon;
          const isActive = activeValue === link.value;
          return (
            <Link
              key={link.value}
              href={link.href}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                isActive
                  ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                  : 'text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // Full tabs version for sub-pages
  return (
    <Tabs value={activeValue} onValueChange={(value) => {
      const link = NAV_LINKS.find(l => l.value === value);
      if (link) router.push(link.href);
    }}>
      <TabsList className="h-auto p-1 bg-gray-100 dark:bg-gray-800">
        {NAV_LINKS.map((link) => (
          <TabsTrigger
            key={link.value}
            value={link.value}
            className="text-xs px-3 py-1.5"
          >
            {link.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
