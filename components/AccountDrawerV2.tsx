'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { DrawerHeader } from '@/components/ui/DrawerHeader';
import { DrawerSection } from '@/components/ui/DrawerSection';

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

// Placeholder components - to be implemented with full functionality
function ProfileSection({ user }: { user: User }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Profile</h3>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </div>
  );
}

function PreferencesSection() {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Preferences</h3>
      <p className="text-sm text-muted-foreground">Preferences settings</p>
    </div>
  );
}

function LogoutSection() {
  return (
    <div>
      <button className="text-sm text-red-600">Logout</button>
    </div>
  );
}

export default function AccountDrawer({ isOpen, onClose, user }: AccountDrawerProps) {
  if (!user) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerHeader title="Account" subtitle={user.email || ''} />

      <DrawerSection bordered>
        <ProfileSection user={user} />
      </DrawerSection>

      <DrawerSection bordered>
        <PreferencesSection />
      </DrawerSection>

      <DrawerSection>
        <LogoutSection />
      </DrawerSection>
    </Drawer>
  );
}

