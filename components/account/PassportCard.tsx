'use client';

import React from 'react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

interface PassportCardProps {
  user: User;
  stats: {
    visitedCount: number;
    savedCount: number;
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
    curationCompletionPercentage: number;
  };
  totalDestinations: number;
  homeBase?: string;
}

export function PassportCard({ user, stats, totalDestinations, homeBase }: PassportCardProps) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'N/A';

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler';
  const avatarUrl = user.user_metadata?.avatar_url;

  // Generate a passport number from user ID (first 8 chars uppercase)
  const passportNumber = user.id.substring(0, 8).toUpperCase();

  return (
    <div className="passport-paper passport-guilloche rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {/* Foil strip at top */}
      <div className="passport-foil h-2" />

      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Photo Section */}
          <div className="flex-shrink-0">
            <div className="w-28 h-36 md:w-32 md:h-40 relative passport-photo rounded-sm overflow-hidden bg-gray-200 dark:bg-gray-800">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Photo caption */}
            <div className="mt-2 text-center">
              <span className="passport-data text-[10px] text-gray-400">Photo</span>
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-1">Urban Manual</p>
                <p className="passport-data text-[10px] text-gray-400">Travel Passport</p>
              </div>
              <div className="text-right">
                <p className="passport-data text-[10px] text-gray-400 mb-1">No.</p>
                <p className="passport-data text-sm tracking-widest">{passportNumber}</p>
              </div>
            </div>

            {/* Data Fields */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-1">Name</p>
                <p className="passport-data text-sm truncate">{displayName}</p>
              </div>
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-1">Member Since</p>
                <p className="passport-data text-sm">{memberSince}</p>
              </div>
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-1">Home Base</p>
                <p className="passport-data text-sm">{homeBase || '---'}</p>
              </div>
              <div>
                <p className="passport-data text-[10px] text-gray-400 mb-1">Status</p>
                <p className="passport-data text-sm">
                  {stats.curationCompletionPercentage >= 75
                    ? 'Explorer'
                    : stats.curationCompletionPercentage >= 50
                    ? 'Adventurer'
                    : stats.curationCompletionPercentage >= 25
                    ? 'Wanderer'
                    : 'Newcomer'}
                </p>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="text-center">
                <p className="passport-data text-xl md:text-2xl font-light">{stats.visitedCount}</p>
                <p className="passport-data text-[9px] text-gray-400">Stamps</p>
              </div>
              <div className="text-center">
                <p className="passport-data text-xl md:text-2xl font-light">{stats.savedCount}</p>
                <p className="passport-data text-[9px] text-gray-400">Saved</p>
              </div>
              <div className="text-center">
                <p className="passport-data text-xl md:text-2xl font-light">{stats.uniqueCities.size}</p>
                <p className="passport-data text-[9px] text-gray-400">Cities</p>
              </div>
              <div className="text-center">
                <p className="passport-data text-xl md:text-2xl font-light">{stats.uniqueCountries.size}</p>
                <p className="passport-data text-[9px] text-gray-400">Countries</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <p className="passport-data text-[10px] text-gray-400">Curation Progress</p>
                <p className="passport-data text-[10px]">
                  {stats.visitedCount}/{totalDestinations}
                </p>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black dark:bg-white transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(stats.curationCompletionPercentage, 100)}%` }}
                />
              </div>
              <p className="passport-data text-[10px] text-gray-400 mt-2">
                {stats.curationCompletionPercentage}% Complete
              </p>
            </div>
          </div>
        </div>

        {/* MRZ-style footer (Machine Readable Zone) */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="passport-data text-[10px] text-gray-300 dark:text-gray-600 tracking-[0.2em] truncate">
            P&lt;URB&lt;{displayName.toUpperCase().replace(/\s+/g, '&lt;')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </p>
          <p className="passport-data text-[10px] text-gray-300 dark:text-gray-600 tracking-[0.2em] truncate">
            {passportNumber}&lt;&lt;&lt;&lt;&lt;&lt;{memberSince.replace(/\s+/g, '').toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </p>
        </div>
      </div>

      {/* Foil strip at bottom */}
      <div className="passport-foil h-2" />
    </div>
  );
}
