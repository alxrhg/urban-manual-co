'use client';

import React from 'react';
import type { User } from '@supabase/supabase-js';

interface PassportCoverProps {
  user: User;
  onOpen: () => void;
  stats: {
    visitedCount: number;
    uniqueCountries: Set<string>;
  };
}

export function PassportCover({ user, onOpen, stats }: PassportCoverProps) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Traveler';
  const passportNumber = user.id.substring(0, 8).toUpperCase();

  return (
    <button
      onClick={onOpen}
      className="group w-full max-w-md mx-auto"
    >
      {/* Passport exterior */}
      <div className="relative bg-[#1a365d] dark:bg-[#0f172a] rounded-lg shadow-2xl overflow-hidden aspect-[3/4] transform transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-3xl">
        {/* Leather texture overlay */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Gold border inset */}
        <div className="absolute inset-4 border border-amber-400/30 rounded" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-between py-12 px-8 text-amber-100">
          {/* Top emblem */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-amber-400/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-amber-400/70" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <p className="passport-data text-[10px] tracking-[0.3em] text-amber-400/70 mb-1">
              URBAN MANUAL
            </p>
            <p className="passport-data text-[8px] tracking-[0.2em] text-amber-400/50">
              TRAVEL IDENTITY
            </p>
          </div>

          {/* Center - PASSPORT text */}
          <div className="text-center">
            <h1 className="passport-data text-2xl tracking-[0.4em] font-bold text-amber-200/90 mb-6">
              PASSPORT
            </h1>

            {/* Embossed name */}
            <div className="relative">
              <p
                className="passport-data text-sm tracking-[0.15em] text-amber-300/80"
                style={{
                  textShadow: '1px 1px 1px rgba(0,0,0,0.5), -1px -1px 1px rgba(255,255,255,0.1)',
                }}
              >
                {displayName.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <p className="passport-data text-xl text-amber-200/90">{stats.visitedCount}</p>
                <p className="passport-data text-[8px] text-amber-400/50">STAMPS</p>
              </div>
              <div className="w-px h-8 bg-amber-400/20" />
              <div>
                <p className="passport-data text-xl text-amber-200/90">{stats.uniqueCountries.size}</p>
                <p className="passport-data text-[8px] text-amber-400/50">COUNTRIES</p>
              </div>
            </div>

            <p className="passport-data text-[8px] text-amber-400/40">
              NO. {passportNumber}
            </p>
          </div>
        </div>

        {/* Spine effect on left */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Hover hint */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <p className="passport-data text-[10px] text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity tracking-widest">
            TAP TO OPEN
          </p>
        </div>
      </div>
    </button>
  );
}
