'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo } from 'react';
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
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full max-w-sm shrink-0 space-y-8 lg:w-72">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircle2 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      {profile?.display_name || profile?.username || user?.email || 'Traveler'}
                    </p>
                    {user?.email && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Manage how Urban Manual personalizes your experience.</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!user}
                    className="gap-2 text-destructive hover:text-destructive/90 disabled:text-muted-foreground"
                    onClick={signOutOtherDevices}
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out other devices
                  </Button>
                </div>
              </div>
            )}
          </div>

          <nav aria-label="Account sections" className="rounded-3xl border border-border bg-card shadow-sm">
            <ul className="divide-y divide-border/60">
              {sections.map(section => {
                const isActive = activeSection === section.href;
                const Icon = section.icon;
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      className={cn(
                        'flex gap-3 px-6 py-5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium text-foreground">{section.label}</span>
                        <span className="text-xs text-muted-foreground">{section.description}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <main className="flex-1">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
