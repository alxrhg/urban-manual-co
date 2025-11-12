'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/contexts/UserContext';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountLayoutProps {
  children: ReactNode;
}

const sections = [
  {
    href: '/account/profile',
    label: 'Profile',
  },
  {
    href: '/account/security',
    label: 'Security',
  },
  {
    href: '/account/preferences',
    label: 'Preferences',
  },
  {
    href: '/account/history',
    label: 'History',
  },
];

export function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOutOtherDevices } = useUserContext();

  const activeSection = useMemo(
    () => sections.find(section => pathname.startsWith(section.href))?.href ?? '/account/profile',
    [pathname]
  );

  useEffect(() => {
    if (!loading && !user) {
      const redirectTo = pathname || '/account/profile';
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [loading, user, pathname, router]);

  if (!loading && !user) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 md:flex-row">
        <aside className="w-full max-w-xs shrink-0 space-y-6 text-sm md:w-64">
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {profile?.display_name || profile?.username || user?.email || 'Traveler'}
                </p>
                {user?.email && <p className="text-gray-500 dark:text-gray-400">{user.email}</p>}
              </>
            )}
          </div>

          <nav aria-label="Account sections">
            <ul className="space-y-2">
              {sections.map(section => {
                const isActive = activeSection === section.href;
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      className={cn(
                        'flex items-center gap-2 text-sm transition-colors hover:underline',
                        isActive
                          ? 'font-semibold text-blue-600 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300'
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div>
            <button
              type="button"
              disabled={!user}
              onClick={signOutOtherDevices}
              className="text-sm text-red-600 underline hover:text-red-700 disabled:text-gray-400 disabled:hover:text-gray-400 dark:text-red-400"
            >
              Sign out other devices
            </button>
          </div>
        </aside>

        <main className="flex-1 pb-8">
          <div className="space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
