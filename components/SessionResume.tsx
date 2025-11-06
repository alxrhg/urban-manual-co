'use client';

import { Clock, X } from 'lucide-react';
import { useState } from 'react';

interface ConversationSession {
  id: string;
  last_activity: string;
  context_summary?: {
    city?: string;
    category?: string;
    preferences?: string[];
    lastQuery?: string;
  };
  message_count?: number;
}

interface SessionResumeProps {
  session: ConversationSession;
  onResume: (sessionId: string) => void;
  onDismiss?: () => void;
}

export function SessionResume({ session, onResume, onDismiss }: SessionResumeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Format the last activity time
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Build context description
  const contextParts: string[] = [];
  if (session.context_summary?.lastQuery) {
    contextParts.push(`"${session.context_summary.lastQuery}"`);
  } else {
    if (session.context_summary?.city) contextParts.push(session.context_summary.city);
    if (session.context_summary?.category) contextParts.push(session.context_summary.category);
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              Continue your conversation
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {contextParts.length > 0 ? (
              <>You were exploring {contextParts.join(' ')}</>
            ) : (
              <>You have an active conversation</>
            )}{' '}
            <span className="text-gray-500 dark:text-gray-400">• {formatTime(session.last_activity)}</span>
          </p>
          <button
            onClick={() => onResume(session.id)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Resume conversation
          </button>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  );
}
