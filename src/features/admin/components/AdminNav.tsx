'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview' },
  { href: '/admin/destinations', label: 'Destinations', value: 'destinations' },
  { href: '/admin/brands', label: 'Brands', value: 'brands' },
  { href: '/admin/cities', label: 'Cities', value: 'cities' },
  { href: '/admin/countries', label: 'Countries', value: 'countries' },
  { href: '/admin/neighborhoods', label: 'Neighborhoods', value: 'neighborhoods' },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics' },
  { href: '/admin/enrich', label: 'Enrich', value: 'enrich' },
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
      <TabsList className="h-auto p-1.5 bg-[#0c1523] dark:bg-[#0c1523] rounded-full">
        {NAV_LINKS.map((link) => (
          <TabsTrigger
            key={link.value}
            value={link.value}
            className="text-sm px-4 py-2 text-gray-500 data-[state=active]:bg-[#1e2736] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            {link.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
