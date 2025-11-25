'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';
import { DrawerActionBar } from '@/components/ui/DrawerActionBar';
import { Settings, User, Shield, Bell, ChevronRight } from 'lucide-react';

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
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </button>
  );
}

export function SettingsDrawer() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('settings');

  const handleNavigate = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path), 200);
  };

  if (!user) {
    return (
      <Drawer isOpen={isOpen} onClose={closeDrawer}>
        <DrawerHeader
          title="Settings"
          leftAccessory={<Settings className="h-5 w-5 text-gray-500" />}
        />

        <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
          <DrawerSection>
            <div className="text-center py-12">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sign in to access settings
              </p>
            </div>
          </DrawerSection>
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer}>
      <DrawerHeader
        title="Settings"
        subtitle="Manage your account"
        leftAccessory={<Settings className="h-5 w-5 text-gray-500" />}
      />

      <div className="overflow-y-auto max-h-[calc(100vh-4rem)] pb-16">
        <DrawerSection bordered>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Account
          </p>
          <div className="-mx-3">
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
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            App
          </p>
          <div className="-mx-3">
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
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium"
        >
          Open full settings
        </button>
      </DrawerActionBar>
    </Drawer>
  );
}
