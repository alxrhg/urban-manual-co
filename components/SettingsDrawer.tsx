'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDrawer } from '@/contexts/DrawerContext';
import { Drawer } from '@/components/ui/Drawer';
import { Settings, User, Shield, Bell, ChevronLeft, ChevronRight, X, Palette, Globe } from 'lucide-react';

// Settings menu item
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
      className="group w-full flex items-center gap-4 p-4 sm:p-3.5 rounded-2xl sm:rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors text-left min-h-[64px] sm:min-h-[56px]"
    >
      <div className="flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700 transition-colors flex-shrink-0">
        <Icon className="h-5 w-5 text-stone-600 dark:text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base sm:text-sm font-medium text-stone-900 dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-sm sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4 text-stone-400 dark:text-stone-500 transition-transform group-hover:translate-x-0.5" />
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
      <Drawer isOpen={isOpen} onClose={handleClose}>
        <div className="h-full flex flex-col bg-white dark:bg-stone-950">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 pt-6 sm:pt-5 pb-4">
            <div className="flex items-center gap-3">
              {canGoBack ? (
                <button
                  onClick={goBack}
                  className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                </button>
              ) : (
                <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800">
                  <Settings className="w-5 h-5 text-stone-600 dark:text-stone-400" />
                </div>
              )}
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Settings
              </h1>
            </div>
            <button
              onClick={handleClose}
              className="p-2.5 sm:p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-safe">
            <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-5">
              <Settings className="w-9 h-9 sm:w-7 sm:h-7 text-stone-400 dark:text-stone-500" />
            </div>
            <h3 className="text-lg sm:text-base font-semibold text-stone-900 dark:text-white mb-2">
              Sign in required
            </h3>
            <p className="text-base sm:text-sm text-stone-500 dark:text-stone-400 max-w-[240px]">
              Sign in to access your settings and preferences
            </p>
          </div>
        </div>
      </Drawer>
    );
  }

  // Logged in state
  return (
    <Drawer isOpen={isOpen} onClose={handleClose}>
      <div className="h-full flex flex-col bg-white dark:bg-stone-950">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 pt-6 sm:pt-5 pb-4">
          <div className="flex items-center gap-3">
            {canGoBack ? (
              <button
                onClick={goBack}
                className="p-2 -ml-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 active:bg-stone-200 dark:active:bg-stone-700 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800">
                <Settings className="w-5 h-5 text-stone-600 dark:text-stone-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-lg font-semibold text-stone-900 dark:text-white">
                Settings
              </h1>
              <p className="text-sm sm:text-xs text-stone-500 dark:text-stone-400">
                Manage your account
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 sm:p-2 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-white active:scale-95 transition-all min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-safe">
          {/* Account section */}
          <div className="px-4 sm:px-5 py-2">
            <p className="px-4 sm:px-3.5 text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
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
          <div className="px-4 sm:px-5 py-2 mt-4">
            <p className="px-4 sm:px-3.5 text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2">
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
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 pb-safe border-t border-stone-100 dark:border-stone-900">
          <button
            onClick={() => handleNavigate('/account?tab=settings')}
            className="w-full py-3.5 sm:py-3 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-base sm:text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all min-h-[52px] sm:min-h-[44px]"
          >
            Open full settings
          </button>
        </div>
      </div>
    </Drawer>
  );
}
