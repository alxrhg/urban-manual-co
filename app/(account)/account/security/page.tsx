'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck, Monitor, MapPin, Clock3, ChevronDown, ChevronUp, MoreVertical, RefreshCw, LogOut, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

function getActivityTypeIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'login':
    case 'sign_in':
      return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case 'logout':
    case 'sign_out':
      return <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    case 'password_change':
    case 'password_reset':
      return <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case 'suspicious_activity':
    case 'security_alert':
      return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    default:
      return <Info className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
}

function getActivityTypeLabel(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getActivityAnnotation(type: string, description?: string | null): string {
  if (description) return description;
  
  switch (type.toLowerCase()) {
    case 'login':
    case 'sign_in':
      return 'You signed in to your account from a new device or location.';
    case 'logout':
    case 'sign_out':
      return 'You signed out of your account.';
    case 'password_change':
      return 'Your password was successfully changed.';
    case 'password_reset':
      return 'A password reset was requested for your account.';
    case 'suspicious_activity':
      return 'Unusual activity was detected. Please review and secure your account if needed.';
    default:
      return 'Account activity was recorded.';
  }
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
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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

  const toggleSessionDetails = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  if (!user) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-2xl font-medium text-black dark:text-white">Sign in required</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Authenticate to review your session history and security events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24">
      {/* Narrative Intro with Trust Badge */}
      <section className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl md:text-4xl font-medium text-black dark:text-white">
              Security & Sessions
            </h1>
            <div className="space-y-4 text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              <p>
                Your account security is our priority. We track active sessions, monitor account activity, and provide tools to help you maintain control over your account access.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All sessions are encrypted and monitored for suspicious activity. You can review active devices, revoke access, and audit your account history at any time.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Account secure
              </span>
            </div>
          </div>
        </div>

        {/* Actions Menu - Secondary Sheet */}
        <div className="flex items-center justify-end">
          <DropdownMenu open={showActionsMenu} onOpenChange={setShowActionsMenu}>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-normal text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600">
                <MoreVertical className="h-4 w-4" />
                Actions
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    setSigningOutOthers(true);
                    await signOutOtherDevices();
                  } finally {
                    setSigningOutOthers(false);
                    setShowActionsMenu(false);
                  }
                }}
                disabled={signingOutOthers || !user}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out all other devices
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  refreshSessions();
                  setShowActionsMenu(false);
                }}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh sessions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      {/* Sessions List - Card Style */}
      <section aria-labelledby="session-list" className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 id="session-list" className="text-2xl md:text-3xl font-medium text-black dark:text-white">
              Active Sessions
            </h2>
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              {activeSessions.length} {activeSessions.length === 1 ? 'session' : 'sessions'}
            </span>
          </div>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            Devices and browsers where you're currently signed in. Review and manage access as needed.
          </p>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-16 px-6 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-medium text-black dark:text-white mb-2">
                No active sessions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Sign in on a device to start tracking session activity. We'll show the device, location, and last activity here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map(session => {
              const isEnded = Boolean(session.ended_at);
              const isExpanded = expandedSessions.has(session.id);
              const isCurrentSession = session.session_id === user?.id; // Simplified check

              return (
                <div
                  key={session.id}
                  className="border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-200 dark:hover:border-gray-600 transition-colors bg-white dark:bg-gray-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-4">
                      {/* Device & Status */}
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-medium text-black dark:text-white">
                              {session.device_type || 'Web session'}
                            </h3>
                            {isCurrentSession && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-normal">
                                Current
                              </span>
                            )}
                            {isEnded && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-normal">
                                Ended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {session.location_city || 'Unknown'}, {session.location_country || 'Unknown'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatRelative(session.last_activity || session.started_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Advanced Details - Collapsible */}
                      {isExpanded && (
                        <div className="pl-14 space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Session Details
                            </div>
                            <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <div>
                                <span className="font-medium">Started:</span>{' '}
                                {new Date(session.started_at).toLocaleString()}
                              </div>
                              {session.last_activity && (
                                <div>
                                  <span className="font-medium">Last activity:</span>{' '}
                                  {new Date(session.last_activity).toLocaleString()}
                                </div>
                              )}
                              {session.referrer && (
                                <div>
                                  <span className="font-medium">Referrer:</span>{' '}
                                  <span className="font-mono text-xs">{session.referrer}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium">Session ID:</span>{' '}
                                <span className="font-mono text-xs">{session.session_id.substring(0, 16)}...</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleSessionDetails(session.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                        aria-label={isExpanded ? "Hide details" : "Show details"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {!isEnded && !isCurrentSession && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  setEndingSessionId(session.session_id);
                                  await endSession(session.session_id);
                                } finally {
                                  setEndingSessionId(null);
                                }
                              }}
                              disabled={endingSessionId === session.session_id}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              {endingSessionId === session.session_id ? 'Signing out...' : 'Sign out device'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Activity Log - Timeline Component */}
      <section aria-labelledby="activity-log" className="space-y-8">
        <div className="space-y-2">
          <h2 id="activity-log" className="text-2xl md:text-3xl font-medium text-black dark:text-white">
            Activity Timeline
          </h2>
          <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
            A chronological record of account events and security activities. Use this timeline to verify account access and detect any unusual activity.
          </p>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-16 px-6 border border-gray-100 dark:border-gray-700 rounded-2xl">
            <div className="max-w-md mx-auto">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-xl font-medium text-black dark:text-white mb-2">
                No activity recorded
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Account activity will appear here as events occur. This helps you maintain visibility into account access and security events.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            
            <div className="space-y-6">
              {recentActivity.map((entry, index) => {
                const icon = getActivityTypeIcon(entry.type);
                const label = getActivityTypeLabel(entry.type);
                const annotation = getActivityAnnotation(entry.type, entry.description);

                return (
                  <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                    {/* Timeline Dot */}
                    <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-black dark:text-white mb-1">
                              {label}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {annotation}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                              {formatRelative(entry.created_at)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Additional Context */}
                        {(entry.destination_slug || entry.metadata) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                            {entry.destination_slug && (
                              <div className="text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Related to:</span>{' '}
                                <span className="text-gray-600 dark:text-gray-400">{entry.destination_slug}</span>
                              </div>
                            )}
                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <details className="text-xs">
                                <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
                                  View metadata
                                </summary>
                                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-gray-600 dark:text-gray-400 font-mono">
                                  {JSON.stringify(entry.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
