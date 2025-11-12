'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, User, Clock, Search as SearchIcon, MapPin, Tag, MessageSquare } from 'lucide-react';
import { SearchLogEntry } from '../api/destinations';

interface SearchLogsFeedProps {
  logs: SearchLogEntry[];
  isLoading?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

interface GroupedSession {
  userId: string | null;
  sessionId: string;
  logs: SearchLogEntry[];
  firstSeen: Date;
  lastSeen: Date;
}

export function SearchLogsFeed({ logs, isLoading = false }: SearchLogsFeedProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const groupedSessions = useMemo(() => {
    // Group logs by user_id and create session groups
    const sessionMap = new Map<string, GroupedSession>();

    logs.forEach((log) => {
      const userId = log.user_id || 'anonymous';
      // Create a session key based on user and time proximity (within 30 minutes)
      const logTime = new Date(log.created_at).getTime();
      let sessionKey = `${userId}-${Math.floor(logTime / (30 * 60 * 1000))}`;

      if (!sessionMap.has(sessionKey)) {
        sessionMap.set(sessionKey, {
          userId: log.user_id,
          sessionId: sessionKey,
          logs: [],
          firstSeen: new Date(log.created_at),
          lastSeen: new Date(log.created_at),
        });
      }

      const session = sessionMap.get(sessionKey)!;
      session.logs.push(log);
      const logDate = new Date(log.created_at);
      if (logDate < session.firstSeen) session.firstSeen = logDate;
      if (logDate > session.lastSeen) session.lastSeen = logDate;
    });

    // Sort sessions by most recent first
    return Array.from(sessionMap.values()).sort(
      (a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()
    );
  }, [logs]);

  const toggleSession = (sessionId: string) => {
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

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading search activity...</p>
      </div>
    );
  }

  if (groupedSessions.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="max-w-md mx-auto">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-medium text-black dark:text-white mb-2">No search activity yet</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Search logs will appear here as users explore destinations. Each session shows a user's journey through the platform, revealing discovery patterns and intent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedSessions.map((session) => {
        const isExpanded = expandedSessions.has(session.sessionId);
        const sessionDuration = Math.round(
          (session.lastSeen.getTime() - session.firstSeen.getTime()) / 1000 / 60
        );

        return (
          <div
            key={session.sessionId}
            className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden hover:border-gray-200 dark:hover:border-gray-600 transition-colors"
          >
            {/* Session Header */}
            <button
              onClick={() => toggleSession(session.sessionId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {session.userId ? (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">?</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-black dark:text-white">
                      {session.userId ? `User ${session.userId.substring(0, 8)}` : 'Anonymous user'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {session.logs.length} {session.logs.length === 1 ? 'search' : 'searches'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {session.firstSeen.toLocaleString()}
                    </span>
                    {sessionDuration > 0 && (
                      <span>• {sessionDuration} min session</span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded Session Details */}
            {isExpanded && (
              <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                <div className="p-4 space-y-3">
                  {session.logs.map((log, index) => {
                    const metadata = isRecord(log.metadata) ? log.metadata : undefined;
                    const query = metadata ? getStringField(metadata, 'query') : '';
                    const intentRecord = metadata && isRecord(metadata.intent) ? metadata.intent : undefined;
                    const filtersRecord = metadata && isRecord(metadata.filters) ? metadata.filters : undefined;
                    const intentCity = intentRecord ? getStringField(intentRecord, 'city') : '';
                    const intentCategory = intentRecord ? getStringField(intentRecord, 'category') : '';
                    const filterCity = filtersRecord ? getStringField(filtersRecord, 'city') : '';
                    const filterCategory = filtersRecord ? getStringField(filtersRecord, 'category') : '';
                    const countValue = metadata?.count;
                    const count =
                      typeof countValue === 'number'
                        ? countValue.toString()
                        : typeof countValue === 'string'
                          ? countValue
                          : '';
                    const source = metadata ? getStringField(metadata, 'source') : '';
                    const displayCity = intentCity || filterCity;
                    const displayCategory = intentCategory || filterCategory;

                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mt-0.5">
                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {query && (
                                <div className="flex items-center gap-2 mb-2">
                                  <SearchIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm font-medium text-black dark:text-white">
                                    "{query}"
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                {displayCity && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {displayCity}
                                  </span>
                                )}
                                {displayCategory && (
                                  <span className="flex items-center gap-1">
                                    <Tag className="h-3 w-3" />
                                    {displayCategory}
                                  </span>
                                )}
                                {count && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {count} results
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                          {source && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500">
                              Source: {source}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

