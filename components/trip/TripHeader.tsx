'use client';

import Link from 'next/link';
import { ArrowLeft, Share2, Settings, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TripHeaderProps {
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  tripTag?: string;
  activeTab: 'overview' | 'itinerary';
  onTabChange: (tab: 'overview' | 'itinerary') => void;
  onSettingsClick?: () => void;
  onShareClick?: () => void;
  collaborators?: Array<{ name: string; initials: string; color: string }>;
}

/**
 * TripHeader - Header for trip pages
 * Features: Back navigation, tab navigation, trip tag, large title, collaborators
 */
export default function TripHeader({
  title,
  destination,
  startDate,
  endDate,
  tripTag,
  activeTab,
  onTabChange,
  onSettingsClick,
  onShareClick,
  collaborators = [],
}: TripHeaderProps) {
  // Format dates
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const dateRange = startDate && endDate
    ? `${formatDate(startDate)} — ${formatDate(endDate)}`
    : startDate
      ? formatDate(startDate)
      : '';

  return (
    <header className="w-full">
      {/* Top Bar: Back + Tabs + Actions */}
      <div className="flex items-center justify-between py-3">
        {/* Back Button */}
        <Link
          href="/trips"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Trips</span>
        </Link>

        {/* Tab Navigation */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-full p-1">
          {(['overview', 'itinerary'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`
                px-4 py-2 text-sm font-medium rounded-full transition-all
                ${activeTab === tab
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Collaborators */}
          <div className="flex items-center -space-x-2">
            {collaborators.slice(0, 2).map((collab, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white dark:border-gray-950"
                style={{ backgroundColor: collab.color }}
              >
                {collab.initials}
              </div>
            ))}
            <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border-2 border-white dark:border-gray-950">
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Share */}
          <button
            onClick={onShareClick}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Settings */}
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Trip Tag */}
      {tripTag && (
        <div className="mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full border border-gray-200 dark:border-gray-700">
            {tripTag}
          </span>
        </div>
      )}

      {/* Large Title */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight mb-4">
        {title}
      </h1>

      {/* Location & Dates */}
      <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400">
        {destination && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm">{destination}</span>
          </div>
        )}
        {dateRange && (
          <>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm">{dateRange}</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
