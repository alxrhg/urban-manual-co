'use client';

import React from 'react';
import { ProfileEditor } from '@/components/account/ProfileEditor';
import { AccountPrivacyManager } from '@/components/account/AccountPrivacyManager';

interface SettingsTabProps {
  userId: string;
}

export default function SettingsTab({ userId }: SettingsTabProps) {
  return (
    <div className="fade-in space-y-10">
      <ProfileEditor
        userId={userId}
        onSaveComplete={() => {
          // Optionally reload user data or show success message
          alert('Profile updated successfully!');
        }}
      />
      <AccountPrivacyManager />
    </div>
  );
}

