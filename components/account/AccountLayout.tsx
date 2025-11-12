'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import {
  UserCircle2,
  ShieldCheck,
  SlidersHorizontal,
  Clock3,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountLayoutProps {
  children: ReactNode;
}

const sections = [
  {
    href: '/account/profile',
    label: 'Profile',
    description: 'Personal details, achievements, and map insights',
    icon: UserCircle2,
  },
  {
    href: '/account/security',
    label: 'Security',
    description: 'Device sessions, authentication, and access logs',
    icon: ShieldCheck,
  },
  {
    href: '/account/preferences',
    label: 'Preferences',
    description: 'Notifications, connected services, and privacy controls',
    icon: SlidersHorizontal,
  },
  {
    href: '/account/history',
    label: 'History',
    description: 'Visited places, saved lists, and activity trail',
    icon: Clock3,
  },
];

export function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  const { user, profile, loading, signOutOtherDevices } = useUserContext();

  const activeSection = useMemo(
    () => sections.find(section => pathname.startsWith(section.href))?.href ?? '/account/profile',
    [pathname]
  );

  if (!loading && !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full max-w-sm shrink-0 space-y-8 lg:w-72">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
                    <UserCircle2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                      {profile?.display_name || profile?.username || user?.email || 'Traveler'}
                    </p>
                    {user?.email && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <p>Manage how Urban Manual personalizes your experience.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!user}
                    className="gap-2 text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:hover:text-gray-400 dark:text-red-400"
                    onClick={signOutOtherDevices}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out other devices
                  </Button>
                </div>
              </div>
            )}
          </div>

          <nav aria-label="Account sections" className="rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {sections.map(section => {
                const isActive = activeSection === section.href;
                const Icon = section.icon;
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      className={cn(
                        'flex gap-3 px-6 py-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium">{section.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{section.description}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
