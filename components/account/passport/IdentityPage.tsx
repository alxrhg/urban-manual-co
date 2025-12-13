'use client';

import React from 'react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';

interface IdentityPageProps {
  user: User;
  stats: {
    visitedCount: number;
    savedCount: number;
    uniqueCities: Set<string>;
    uniqueCountries: Set<string>;
  };
  homeBase?: string;
  onEditProfile?: () => void;
}

export function IdentityPage({ user, stats, homeBase, onEditProfile }: IdentityPageProps) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase()
    : 'N/A';

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler';
  const avatarUrl = user.user_metadata?.avatar_url;
  const passportNumber = user.id.substring(0, 8).toUpperCase();

  // Determine traveler status based on visited count
  const getTravelerStatus = () => {
    if (stats.visitedCount >= 100) return 'MASTER EXPLORER';
    if (stats.visitedCount >= 50) return 'SEASONED TRAVELER';
    if (stats.visitedCount >= 25) return 'ADVENTURER';
    if (stats.visitedCount >= 10) return 'WANDERER';
    if (stats.visitedCount >= 5) return 'EXPLORER';
    return 'NEWCOMER';
  };

  return (
    <div className="passport-paper passport-guilloche rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Foil strip */}
      <div className="passport-foil h-3" />

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="passport-data text-[8px] text-gray-400 tracking-[0.3em]">URBAN MANUAL</p>
            <p className="passport-data text-[10px] text-gray-500 tracking-wider mt-1">TRAVEL PASSPORT</p>
          </div>
          <div className="text-right">
            <p className="passport-data text-[8px] text-gray-400">NO.</p>
            <p className="passport-data text-sm tracking-[0.2em] font-medium">{passportNumber}</p>
          </div>
        </div>

        {/* Main content - Photo and Data */}
        <div className="flex gap-6 md:gap-8">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-24 h-32 md:w-28 md:h-36 relative passport-photo bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 dark:text-gray-600">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <p className="passport-data text-[8px] text-gray-400 text-center mt-2">HOLDER PHOTO</p>
          </div>

          {/* Data fields */}
          <div className="flex-1 space-y-4">
            {/* Name */}
            <div>
              <p className="passport-data text-[8px] text-gray-400 mb-1">SURNAME / NAME</p>
              <p className="passport-data text-sm md:text-base font-medium tracking-wide truncate">
                {displayName.toUpperCase()}
              </p>
            </div>

            {/* Two column grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="passport-data text-[8px] text-gray-400 mb-1">NATIONALITY</p>
                <p className="passport-data text-xs">GLOBAL CITIZEN</p>
              </div>
              <div>
                <p className="passport-data text-[8px] text-gray-400 mb-1">STATUS</p>
                <p className="passport-data text-xs">{getTravelerStatus()}</p>
              </div>
              <div>
                <p className="passport-data text-[8px] text-gray-400 mb-1">DATE OF ISSUE</p>
                <p className="passport-data text-xs">{memberSince}</p>
              </div>
              <div>
                <p className="passport-data text-[8px] text-gray-400 mb-1">HOME BASE</p>
                <p className="passport-data text-xs truncate">{homeBase?.toUpperCase() || '---'}</p>
              </div>
            </div>

            {/* Edit button */}
            {onEditProfile && (
              <button
                onClick={onEditProfile}
                className="passport-data text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                [EDIT DETAILS]
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="passport-data text-2xl md:text-3xl font-light">{stats.visitedCount}</p>
              <p className="passport-data text-[8px] text-gray-400 mt-1">STAMPS</p>
            </div>
            <div>
              <p className="passport-data text-2xl md:text-3xl font-light">{stats.savedCount}</p>
              <p className="passport-data text-[8px] text-gray-400 mt-1">PENDING</p>
            </div>
            <div>
              <p className="passport-data text-2xl md:text-3xl font-light">{stats.uniqueCities.size}</p>
              <p className="passport-data text-[8px] text-gray-400 mt-1">CITIES</p>
            </div>
            <div>
              <p className="passport-data text-2xl md:text-3xl font-light">{stats.uniqueCountries.size}</p>
              <p className="passport-data text-[8px] text-gray-400 mt-1">NATIONS</p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
          <p className="passport-data text-[8px] text-gray-400 mb-2">HOLDER'S SIGNATURE</p>
          <p
            className="text-lg italic text-gray-600 dark:text-gray-400"
            style={{ fontFamily: 'cursive, serif' }}
          >
            {displayName}
          </p>
        </div>

        {/* MRZ zone */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 -mx-6 md:-mx-8 -mb-6 md:-mb-8 px-6 md:px-8 pb-6 md:pb-8">
          <p className="passport-data text-[9px] text-gray-300 dark:text-gray-700 tracking-[0.15em] font-mono overflow-hidden">
            P&lt;URB&lt;{displayName.toUpperCase().replace(/\s+/g, '&lt;').substring(0, 20)}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </p>
          <p className="passport-data text-[9px] text-gray-300 dark:text-gray-700 tracking-[0.15em] font-mono overflow-hidden mt-1">
            {passportNumber}&lt;&lt;&lt;&lt;{String(stats.visitedCount).padStart(3, '0')}&lt;{String(stats.uniqueCountries.size).padStart(2, '0')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </p>
        </div>
      </div>
    </div>
  );
}
