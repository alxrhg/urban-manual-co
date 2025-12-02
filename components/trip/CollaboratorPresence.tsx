'use client';

import { useState } from 'react';
import { Users, Circle } from 'lucide-react';
import type { TripPresence, TripCollaborator } from '@/types/trip';

interface CollaboratorPresenceProps {
  presence: TripPresence[];
  collaborators: TripCollaborator[];
  currentUserId?: string;
  maxVisible?: number;
}

// Generate consistent colors based on user ID
function getUserColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function CollaboratorPresence({
  presence,
  collaborators,
  currentUserId,
  maxVisible = 4,
}: CollaboratorPresenceProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Filter out current user and get active users
  const activeUsers = presence.filter(
    (p) => p.userId !== currentUserId && p.isActive
  );

  if (activeUsers.length === 0) {
    return null;
  }

  const visibleUsers = activeUsers.slice(0, maxVisible);
  const remainingCount = activeUsers.length - maxVisible;

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatar Stack */}
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.userId}
            className={`relative w-8 h-8 rounded-full border-2 border-white dark:border-stone-900 flex items-center justify-center text-white text-xs font-medium shadow-sm ${getUserColor(
              user.userId
            )}`}
            style={{ zIndex: maxVisible - index }}
          >
            {user.userAvatar ? (
              <img
                src={user.userAvatar}
                alt={user.userName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user.userName)
            )}
            {/* Active indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-stone-900 rounded-full" />
          </div>
        ))}

        {/* Remaining count */}
        {remainingCount > 0 && (
          <div
            className="relative w-8 h-8 rounded-full border-2 border-white dark:border-stone-900 bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 text-xs font-medium shadow-sm"
            style={{ zIndex: 0 }}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-full left-0 mt-2 z-50">
          <div className="bg-white dark:bg-stone-800 rounded-xl shadow-lg border border-stone-200 dark:border-stone-700 py-2 px-3 min-w-[180px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-stone-100 dark:border-stone-700">
              <Users className="w-4 h-4 text-stone-500" />
              <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                {activeUsers.length} viewing now
              </span>
            </div>
            <div className="space-y-1.5">
              {activeUsers.map((user) => (
                <div key={user.userId} className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium ${getUserColor(
                      user.userId
                    )}`}
                  >
                    {user.userAvatar ? (
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getInitials(user.userName)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-900 dark:text-white truncate">
                      {user.userName}
                    </p>
                    {user.currentDay && (
                      <p className="text-[10px] text-stone-500">
                        Day {user.currentDay}
                      </p>
                    )}
                  </div>
                  <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Cursor indicator showing where another user is editing
 */
export function CollaboratorCursor({
  userName,
  userId,
  position,
}: {
  userName: string;
  userId: string;
  position?: { itemId?: string; field?: string };
}) {
  if (!position?.itemId) return null;

  return (
    <div
      className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-medium text-white ${getUserColor(
        userId
      )} shadow-sm whitespace-nowrap z-50`}
    >
      {userName}
    </div>
  );
}

/**
 * Inline editing indicator for an item
 */
export function ItemEditingIndicator({
  editors,
  currentUserId,
}: {
  editors: TripPresence[];
  currentUserId?: string;
}) {
  const otherEditors = editors.filter((e) => e.userId !== currentUserId);

  if (otherEditors.length === 0) return null;

  const editor = otherEditors[0];

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
      <div
        className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium ${getUserColor(
          editor.userId
        )}`}
      >
        {getInitials(editor.userName)}
      </div>
      <span>{editor.userName} is editing...</span>
    </div>
  );
}
