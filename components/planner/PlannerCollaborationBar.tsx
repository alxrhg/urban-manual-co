'use client';

import { Users, MessageCircle } from 'lucide-react';
import { usePlanner } from '@/contexts/PlannerContext';

function getInitials(name?: string | null) {
  if (!name) return '?';
  const segments = name.trim().split(' ');
  if (segments.length === 1) return segments[0].slice(0, 2).toUpperCase();
  return (segments[0][0] + segments[segments.length - 1][0]).toUpperCase();
}

export function PlannerCollaborationBar() {
  const { collaborators, comments, activeDayId, itinerary } = usePlanner();

  const commentCount = comments.length;

  return (
    <div className="flex items-center justify-between border-b border-neutral-200/70 bg-white/60 px-6 py-3 text-xs text-neutral-500 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/60 dark:text-neutral-400">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Users className="size-4" />
          <span className="font-medium text-neutral-600 dark:text-neutral-300">Collaborators</span>
          {collaborators.length === 0 ? (
            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400">
              Just you planning right now
            </span>
          ) : (
            <div className="flex items-center gap-2">
              {collaborators.slice(0, 4).map(collaborator => (
                <span
                  key={collaborator.userId}
                  className={`flex size-7 items-center justify-center rounded-full border border-white text-[11px] font-semibold text-neutral-700 shadow-sm ring-2 ring-white/80 dark:border-neutral-900 dark:text-neutral-200 dark:ring-neutral-900/80 ${
                    collaborator.activeDayId === activeDayId ? 'bg-primary/90 text-white' : 'bg-neutral-100 dark:bg-neutral-800'
                  }`}
                  title={collaborator.name || 'Collaborator'}
                >
                  {getInitials(collaborator.name)}
                </span>
              ))}
              {collaborators.length > 4 && (
                <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400">
                  +{collaborators.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
        {itinerary?.sharedLink && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Shared link enabled
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <MessageCircle className="size-4" />
        <span className="font-medium text-neutral-600 dark:text-neutral-300">Comment threads</span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-neutral-600 dark:bg-neutral-800/70 dark:text-neutral-300">
          {commentCount}
        </span>
      </div>
    </div>
  );
}

export default PlannerCollaborationBar;
