'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Drawer } from '@/components/ui/Drawer';
import { ProfileEditor } from '@/components/ProfileEditor';
import { AccountPrivacyManager } from '@/components/AccountPrivacyManager';
import { useDrawer } from '@/contexts/DrawerContext';

export function SettingsDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const isOpen = isDrawerOpen('settings');
  const { user } = useAuth();

  const content = (
    <div className="px-6 py-6">
      {user ? (
        <div className="space-y-6">
          <ProfileEditor
            userId={user.id}
            onSaveComplete={() => {
              // Optionally show success message
            }}
          />
          <AccountPrivacyManager />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">You're not signed in</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Sign in to manage your settings</p>
          <button
            onClick={() => {
              closeDrawer();
              window.location.href = '/auth/login';
            }}
            className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm font-semibold"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeDrawer}
      title="Settings"
    >
      {content}
    </Drawer>
  );
}

