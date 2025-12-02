'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, User, Shield, Bell, ChevronLeft, ChevronRight, Palette, Globe } from 'lucide-react';

function MenuItem({
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
      className="group w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform group-hover:translate-x-0.5" />
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

  const handleClose = canGoBack ? goBack : closeDrawer;

  // Not logged in state
  if (!user) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              {canGoBack ? (
                <Button variant="ghost" size="icon" onClick={goBack} className="-ml-2">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              ) : (
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
              )}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Settings
              </h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
              <Settings className="w-9 h-9 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sign in required
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[240px]">
              Sign in to access your settings and preferences
            </p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Logged in state
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="card-right" className="flex flex-col p-0" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <Button variant="ghost" size="icon" onClick={goBack} className="-ml-2">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your account
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {/* Account section */}
          <div className="px-4 py-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Account
            </p>
            <div className="space-y-1">
              <MenuItem
                icon={User}
                label="Profile"
                description="Edit your profile information"
                onClick={() => handleNavigate('/account?tab=profile')}
              />
              <MenuItem
                icon={Shield}
                label="Privacy"
                description="Manage your data & privacy"
                onClick={() => handleNavigate('/account?tab=privacy')}
              />
              <MenuItem
                icon={Bell}
                label="Notifications"
                description="Email & push preferences"
                onClick={() => handleNavigate('/account?tab=notifications')}
              />
            </div>
          </div>

          {/* App section */}
          <div className="px-4 py-2 mt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              App
            </p>
            <div className="space-y-1">
              <MenuItem
                icon={Palette}
                label="Appearance"
                description="Theme & display options"
                onClick={() => handleNavigate('/account?tab=settings')}
              />
              <MenuItem
                icon={Globe}
                label="Language & Region"
                description="Change language settings"
                onClick={() => handleNavigate('/account?tab=settings')}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button
            onClick={() => handleNavigate('/account?tab=settings')}
            className="w-full"
          >
            Open full settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
