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
        <div className="space-y-10">
          <ProfileEditor
            userId={user.id}
            onSaveComplete={() => {
              // Optionally show success message
            }}
          />
          <AccountPrivacyManager />
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">You're not signed in</p>
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

