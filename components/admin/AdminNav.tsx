'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview' },
  { href: '/admin/destinations', label: 'Destinations', value: 'destinations' },
  { href: '/admin/users', label: 'Users', value: 'users' },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics' },
  { href: '/admin/searches', label: 'Searches', value: 'searches' },
  { href: '/admin/pipeline', label: 'Pipeline', value: 'pipeline' },
];

function getActiveValue(pathname: string) {
  if (pathname === '/admin') return 'overview';
  const match = NAV_LINKS.find(link => link.href !== '/admin' && pathname.startsWith(link.href));
  return match?.value || 'overview';
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeValue = getActiveValue(pathname || '');

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
