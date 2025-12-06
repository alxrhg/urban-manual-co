'use client';

import React from 'react';

type AccountTab = 'profile' | 'visited' | 'saved' | 'collections' | 'trips' | 'achievements' | 'preferences' | 'settings';

interface AccountTabsProps {
  activeTab: AccountTab;
  setActiveTab: (tab: AccountTab) => void;
}

const TABS: { id: AccountTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'visited', label: 'Visited' },
  { id: 'saved', label: 'Saved' },
  { id: 'collections', label: 'Lists' },
  { id: 'trips', label: 'Trips' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'settings', label: 'Settings' },
];

export function AccountTabs({ activeTab, setActiveTab }: AccountTabsProps) {
  return (
    <div className="mb-12">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
              activeTab === tab.id
                ? "bg-black dark:bg-white text-white dark:text-black"
                : "border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

