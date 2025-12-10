'use client';

import React from 'react';
import { ProfileEditor } from '@/components/ProfileEditor';
import { AccountPrivacyManager } from '@/components/AccountPrivacyManager';
import { toast } from '@/components/ui/sonner';

interface SettingsTabProps {
  userId: string;
}

export default function SettingsTab({ userId }: SettingsTabProps) {
  return (
    <div className="fade-in space-y-10">
      <ProfileEditor
        userId={userId}
        onSaveComplete={() => {
          toast.success('Profile updated successfully!');
        }}
      />
      <AccountPrivacyManager />
    </div>
  );
}

