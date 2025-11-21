'use client';

import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import type { Collection } from '@/types/common';

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
  variant?: 'grid' | 'drawer';
}

export function CollectionCard({ collection, onClick, variant = 'grid' }: CollectionCardProps) {
  const isDrawer = variant === 'drawer';
  const placesLabel = `${collection.destination_count ?? 0} ${
    collection.destination_count === 1 ? 'place' : 'places'
  }`;

  const createdAt = collection.created_at
    ? new Date(collection.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left transition-all ${
        isDrawer
          ? 'rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-4 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
          : 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 px-5 py-5'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ring-1 ring-gray-200 dark:ring-gray-800 ${
            isDrawer ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800'
          }`}
        >
          <span>{collection.emoji || '📚'}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
              {collection.name}
            </p>
            {collection.is_public ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
          </div>

          {collection.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{collection.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5">{placesLabel}</span>
            {createdAt && <span className="text-gray-400">Created {createdAt}</span>}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

