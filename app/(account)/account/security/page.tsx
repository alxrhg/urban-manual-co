'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, Monitor, MapPin, Clock3 } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        <h1 className="text-2xl font-semibold text-foreground">Sign in required</h1>
        <p className="text-muted-foreground">
          Authenticate to review your session history and security events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-foreground">Security & sessions</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Monitor active devices, revoke access, and review your recent activity.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={signingOutOthers || !user}
            onClick={async () => {
              try {
                setSigningOutOthers(true);
                await signOutOtherDevices();
              } finally {
                setSigningOutOthers(false);
              }
            }}
          >
            Sign out all other devices
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={refreshSessions}
          >
            Refresh
          </Button>
        </div>
      </header>

      <section aria-labelledby="session-list" className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 id="session-list" className="text-lg font-medium text-foreground">
              Active sessions
            </h2>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
              {activeSessions.length} active
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Sessions update automatically when you sign in or sign out on a device.
          </p>
        </div>

        {activeSessions.length === 0 ? (
          <Alert>
            <AlertTitle>No active sessions</AlertTitle>
            <AlertDescription>
              Sign in on a device to start tracking session activity. We will surface the device, location, and last seen time here.
            </AlertDescription>
          </Alert>
        ) : (
          <ul className="space-y-4">
            {activeSessions.map(session => {
              const isEnded = Boolean(session.ended_at);
              return (
                <li
                  key={session.id}
                  className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm transition hover:border-primary/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Monitor className="h-4 w-4" aria-hidden="true" />
                        <span>{session.device_type || 'Web session'}</span>
                        <Clock3 className="h-4 w-4" aria-hidden="true" />
                        <span>Started {formatRelative(session.started_at)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                        <span>
                          {session.location_city || 'Unknown city'}, {session.location_country || 'Unknown country'}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                          Last activity {formatRelative(session.last_activity || session.started_at)}
                        </span>
                      </div>
                      {session.referrer && (
                        <p className="text-xs text-muted-foreground">Referrer: {session.referrer}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isEnded || endingSessionId === session.session_id}
                      onClick={async () => {
                        try {
                          setEndingSessionId(session.session_id);
                          await endSession(session.session_id);
                        } finally {
                          setEndingSessionId(null);
                        }
                      }}
                    >
                      {isEnded ? 'Ended' : endingSessionId === session.session_id ? 'Ending…' : 'Sign out device'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="activity-log" className="space-y-4">
        <div className="space-y-1">
          <h2 id="activity-log" className="text-lg font-medium text-foreground">
            Activity log
          </h2>
          <p className="text-sm text-muted-foreground">
            We capture key account events to help you verify any suspicious activity.
          </p>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map(entry => (
              <li
                key={entry.id}
                className="rounded-2xl border border-border bg-card/80 p-4 text-sm shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground capitalize">{entry.type.replace(/_/g, ' ')}</p>
                    {entry.description && (
                      <p className="text-muted-foreground">{entry.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()} · {formatRelative(entry.created_at)}
                    </p>
                  </div>
                  {entry.destination_slug && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                      {entry.destination_slug}
                    </Badge>
                  )}
                </div>
                {entry.metadata && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted p-3 text-xs text-muted-foreground">
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
