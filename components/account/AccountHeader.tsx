'use client';

import React from 'react';
import type { User } from '@supabase/supabase-js';

interface AccountHeaderProps {
  user: User | null;
  stats: {
    visitedCount: number;
    savedCount: number;
    citiesCount: number;
    countriesCount: number;
  };
  onSignOut: () => void;
}

export function AccountHeader({ user, stats, onSignOut }: AccountHeaderProps) {
  if (!user) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-light">@{user.user_metadata.user_name || user.email?.split('@')[0]}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.user_metadata.full_name || user.email}</p>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs font-medium text-gray-500 hover:text-black dark:hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        <span>📊 {stats.visitedCount} visited</span>
        <span>🏙️ {stats.citiesCount} cities</span>
        <span>🌍 {stats.countriesCount} countries</span>
        <span>❤️ {stats.savedCount} saved</span>
      </div>
    </div>
  );
}
