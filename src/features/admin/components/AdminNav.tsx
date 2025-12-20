'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LayoutDashboard, MapPin, Building2, Globe, Map, BarChart3, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/ui/tabs';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', value: 'overview', icon: LayoutDashboard },
  { href: '/admin/destinations', label: 'Destinations', value: 'destinations', icon: MapPin },
  { href: '/admin/brands', label: 'Brands', value: 'brands', icon: Building2 },
  { href: '/admin/cities', label: 'Cities', value: 'cities', icon: MapPin },
  { href: '/admin/countries', label: 'Countries', value: 'countries', icon: Globe },
  { href: '/admin/neighborhoods', label: 'Neighborhoods', value: 'neighborhoods', icon: Map },
  { href: '/admin/analytics', label: 'Analytics', value: 'analytics', icon: BarChart3 },
  { href: '/admin/enrich', label: 'Enrich', value: 'enrich', icon: Sparkles },
];

function getActiveValue(pathname: string) {
  if (pathname === '/admin') return 'overview';
  const match = NAV_LINKS.find(link => link.href !== '/admin' && pathname.startsWith(link.href));
  return match?.value || 'overview';
}

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const activeValue = getActiveValue(pathname || '');
  const activeLink = NAV_LINKS.find(l => l.value === activeValue);

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Navigation */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center justify-between w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-white"
        >
          <span className="flex items-center gap-2">
            {activeLink && <activeLink.icon className="w-4 h-4" />}
            {activeLink?.label || 'Navigation'}
          </span>
          {mobileMenuOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </button>

        {mobileMenuOpen && (
          <div className="mt-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = activeValue === link.value;
              return (
                <button
                  key={link.value}
                  onClick={() => handleNavigation(link.href)}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-900/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop Navigation - Horizontal scrollable tabs */}
      <div className="hidden sm:block overflow-x-auto scrollbar-hide">
        <Tabs value={activeValue} onValueChange={(value) => {
          const link = NAV_LINKS.find(l => l.value === value);
          if (link) router.push(link.href);
        }}>
          <TabsList className="h-auto p-1 bg-gray-100 dark:bg-gray-800 inline-flex w-auto min-w-full">
            {NAV_LINKS.map((link) => (
              <TabsTrigger
                key={link.value}
                value={link.value}
                className="text-xs px-3 py-1.5 whitespace-nowrap"
              >
                {link.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    </>
  );
}
