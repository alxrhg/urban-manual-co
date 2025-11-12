'use client';

import { useMemo, useState } from 'react';
import { useUserContext } from '@/contexts/UserContext';

function formatRelative(dateInput?: string | null): string {
  if (!dateInput) return 'Unknown';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

export default function AccountSecurityPage() {
  const {
    user,
    sessions,
    activityLog,
    loading,
    endSession,
    signOutOtherDevices,
    refreshSessions,
  } = useUserContext();
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [signingOutOthers, setSigningOutOthers] = useState(false);

  const activeSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aTime = new Date(a.started_at).getTime();
      const bTime = new Date(b.started_at).getTime();
      return bTime - aTime;
    });
  }, [sessions]);

  const recentActivity = useMemo(() => {
    return [...activityLog].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [activityLog]);

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in required</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Authenticate to review your session history and security events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-sm">
      <header className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Security &amp; sessions</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review the devices connected to your account and recent security events.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={signingOutOthers || !user}
            onClick={async () => {
              try {
                setSigningOutOthers(true);
                await signOutOtherDevices();
              } finally {
                setSigningOutOthers(false);
              }
            }}
            className="underline hover:text-blue-600 disabled:text-gray-400"
          >
            {signingOutOthers ? 'Signing out other devices…' : 'Sign out all other devices'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={refreshSessions}
            className="underline hover:text-blue-600 disabled:text-gray-400"
          >
            Refresh list
          </button>
        </div>
      </header>

      <section aria-labelledby="session-list" className="space-y-3">
        <h2 id="session-list" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Active sessions ({activeSessions.length})
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Sessions update automatically when you sign in or out on a device.
        </p>

        {activeSessions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No active sessions at the moment.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {activeSessions.map(session => {
              const isEnded = Boolean(session.ended_at);
              return (
                <li key={session.id} className="py-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {session.device_type || 'Web session'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Started {formatRelative(session.started_at)} · Last activity {formatRelative(session.last_activity || session.started_at)}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {session.location_city || 'Unknown city'}, {session.location_country || 'Unknown country'}
                  </p>
                  {session.referrer && (
                    <p className="text-gray-500 dark:text-gray-400">Referrer: {session.referrer}</p>
                  )}
                  <div className="mt-2">
                    <button
                      type="button"
                      disabled={isEnded || endingSessionId === session.session_id}
                      onClick={async () => {
                        try {
                          setEndingSessionId(session.session_id);
                          await endSession(session.session_id);
                        } finally {
                          setEndingSessionId(null);
                        }
                      }}
                      className="underline hover:text-red-600 disabled:text-gray-400"
                    >
                      {isEnded
                        ? 'Session ended'
                        : endingSessionId === session.session_id
                          ? 'Ending session…'
                          : 'Sign out this device'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="activity-log" className="space-y-3">
        <h2 id="activity-log" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Activity log
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          We capture key account events to help you verify anything unusual.
        </p>
        {recentActivity.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No recent activity recorded.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {recentActivity.map(entry => (
              <li key={entry.id} className="py-3">
                <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">{entry.type.replace(/_/g, ' ')}</p>
                {entry.description && (
                  <p className="text-gray-600 dark:text-gray-400">{entry.description}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400">
                  {new Date(entry.created_at).toLocaleString()} · {formatRelative(entry.created_at)}
                </p>
                {entry.destination_slug && (
                  <p className="text-gray-500 dark:text-gray-400">Destination: {entry.destination_slug}</p>
                )}
                {entry.metadata && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-md bg-gray-100 p-3 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
