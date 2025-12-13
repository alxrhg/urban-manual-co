'use client';

import React from 'react';
import { User, Stamp, Bookmark, FolderHeart, Plane, Award, Settings, Sliders } from 'lucide-react';

export type PassportSection =
  | 'identity'
  | 'stamps'
  | 'bucketlist'
  | 'albums'
  | 'wallet'
  | 'endorsements'
  | 'preferences'
  | 'settings';

interface PassportNavProps {
  activeSection: PassportSection;
  onSectionChange: (section: PassportSection) => void;
  stats?: {
    stamps: number;
    pending: number;
    trips: number;
    endorsements: number;
  };
}

const sections: {
  id: PassportSection;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  pageNumber: number;
}[] = [
  { id: 'identity', label: 'Identity', shortLabel: 'ID', icon: User, pageNumber: 1 },
  { id: 'stamps', label: 'Visa Pages', shortLabel: 'Stamps', icon: Stamp, pageNumber: 2 },
  { id: 'bucketlist', label: 'Bucket List', shortLabel: 'Pending', icon: Bookmark, pageNumber: 3 },
  { id: 'albums', label: 'Travel Albums', shortLabel: 'Albums', icon: FolderHeart, pageNumber: 4 },
  { id: 'wallet', label: 'Document Wallet', shortLabel: 'Wallet', icon: Plane, pageNumber: 5 },
  { id: 'endorsements', label: 'Endorsements', shortLabel: 'Badges', icon: Award, pageNumber: 6 },
  { id: 'preferences', label: 'Preferences', shortLabel: 'Prefs', icon: Sliders, pageNumber: 7 },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, pageNumber: 8 },
];

export function PassportNav({ activeSection, onSectionChange, stats }: PassportNavProps) {
  const activeIndex = sections.findIndex(s => s.id === activeSection);

  return (
    <div className="space-y-4">
      {/* Tab navigation - horizontal scrolling on mobile */}
      <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
        <div className="flex gap-1 md:gap-2 min-w-max">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;

            // Get badge count
            let badgeCount: number | undefined;
            if (stats) {
              if (section.id === 'stamps') badgeCount = stats.stamps;
              if (section.id === 'bucketlist') badgeCount = stats.pending;
              if (section.id === 'wallet') badgeCount = stats.trips;
              if (section.id === 'endorsements') badgeCount = stats.endorsements;
            }

            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`
                  relative flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition-all
                  ${isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="passport-data text-[10px] md:text-xs hidden md:inline">
                  {section.label}
                </span>
                <span className="passport-data text-[10px] md:hidden">
                  {section.shortLabel}
                </span>

                {/* Badge */}
                {badgeCount !== undefined && badgeCount > 0 && (
                  <span className={`
                    absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-medium
                    flex items-center justify-center px-1
                    ${isActive
                      ? 'bg-white dark:bg-black text-black dark:text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }
                  `}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page indicator */}
      <div className="flex items-center justify-center gap-2">
        <p className="passport-data text-[10px] text-gray-400">
          PAGE {sections[activeIndex]?.pageNumber || 1} OF {sections.length}
        </p>
        <div className="flex gap-1">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`
                w-2 h-2 rounded-full transition-all
                ${index === activeIndex
                  ? 'bg-black dark:bg-white w-4'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }
              `}
              aria-label={`Go to ${section.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
