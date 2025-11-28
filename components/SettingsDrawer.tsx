'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Settings, User, Shield, Bell, ChevronRight, ChevronLeft } from 'lucide-react';

function NavItem({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl sm:rounded-xl px-4 sm:px-3 py-4 sm:py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-900 active:bg-stone-100 dark:active:bg-stone-800 min-h-[60px] sm:min-h-0"
    >
      <div className="flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-xl sm:rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 flex-shrink-0">
        <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base sm:text-sm font-medium text-stone-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-sm sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4 text-stone-400 flex-shrink-0" />
    </button>
  );
}

export function SettingsDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer, goBack, canGoBack } = useDrawer();
  const isOpen = isDrawerOpen('settings');

  const handleNavigate = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path), 200);
  };

  const backButton = canGoBack ? (
    <button
      onClick={goBack}
      className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-xl sm:rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0"
    >
      <ChevronLeft className="h-5 w-5 text-stone-600 dark:text-stone-400" />
    </button>
  ) : (
    <Settings className="h-5 w-5 text-stone-500" />
  );

  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={canGoBack ? goBack : closeDrawer}>
        <DrawerHeader
          title="Settings"
          leftAccessory={backButton}
        />

        <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16 pb-safe">
          <DrawerSection>
            <div className="text-center py-16 sm:py-12">
              <p className="text-base sm:text-sm text-stone-500 dark:text-stone-400">
                Sign in to access settings
              </p>
            </div>
          </DrawerSection>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onClose={canGoBack ? goBack : closeDrawer}>
      <DrawerHeader
        title="Settings"
        subtitle="Manage your account"
        leftAccessory={backButton}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16 pb-safe">
        <DrawerSection bordered>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 sm:mb-2 px-1">
            Account
          </p>
          <div className="-mx-4 sm:-mx-3 space-y-1">
            <NavItem
              icon={User}
              label="Profile"
              description="Edit your profile information"
              onClick={() => handleNavigate('/account?tab=profile')}
            />
            <NavItem
              icon={Shield}
              label="Privacy"
              description="Manage your data & privacy"
              onClick={() => handleNavigate('/account?tab=privacy')}
            />
            <NavItem
              icon={Bell}
              label="Notifications"
              description="Email & push preferences"
              onClick={() => handleNavigate('/account?tab=notifications')}
            />
          </div>
        </DrawerSection>

        <DrawerSection>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3 sm:mb-2 px-1">
            App
          </p>
          <div className="-mx-4 sm:-mx-3 space-y-1">
            <NavItem
              icon={Settings}
              label="Preferences"
              description="Display, language & more"
              onClick={() => handleNavigate('/account?tab=settings')}
            />
          </div>
        </DrawerSection>
      </div>

      <DrawerActionBar>
        <button
          onClick={() => handleNavigate('/account?tab=settings')}
          className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl sm:rounded-xl px-4 py-4 sm:py-3 text-base sm:text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity min-h-[56px] sm:min-h-[44px]"
        >
          Open full settings
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
