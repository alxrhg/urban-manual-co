'use client';

import React from 'react';

type AccountTab = 'profile' | 'visited' | 'saved' | 'collections' | 'trips' | 'achievements' | 'settings';

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
  { id: 'settings', label: 'Settings' },
];

export function AccountTabs({ activeTab, setActiveTab }: AccountTabsProps) {
  return (
    <div className="mb-12">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`transition-all ${
              activeTab === tab.id
                ? "font-medium text-black dark:text-white"
                : "font-medium text-black/30 dark:text-gray-500 hover:text-black/60 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

