'use client';

import { useCallback } from 'react';
import Link from "next/link";
import { useAdminEditMode } from '@/contexts/AdminEditModeContext';
import { capitalizeCity } from '@/lib/utils';

interface InlineEditControlsProps {
  inlineCitySlug: string;
}

export function InlineEditControls({ inlineCitySlug }: InlineEditControlsProps) {
  const {
    isEditMode: inlineEditModeEnabled,
    enableEditMode: enableInlineEditMode,
    disableEditMode: disableInlineEditMode,
  } = useAdminEditMode();

  const handleLaunchEditMode = useCallback((path: string) => {
    if (typeof window === 'undefined') return;
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    enableInlineEditMode();
    const url = formattedPath.includes('?') ? `${formattedPath}&edit=1` : `${formattedPath}?edit=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [enableInlineEditMode]);

  const inlineCityLabel = capitalizeCity(inlineCitySlug);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">Inline editing</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Toggle edit affordances on the live site. Changes sync straight to Supabase.
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => handleLaunchEditMode('/')}
          className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Open homepage
        </button>
        <button
          onClick={() => handleLaunchEditMode(`/city/${inlineCitySlug}`)}
          className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Edit {inlineCityLabel}
        </button>
        {inlineEditModeEnabled ? (
          <button
            onClick={disableInlineEditMode}
            className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Turn off
          </button>
        ) : (
          <button
            onClick={enableInlineEditMode}
            className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            Enable now
          </button>
        )}
        <Link
          href="/admin/discover"
          className="rounded border border-gray-200 dark:border-gray-700 px-3 py-1 text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          Go to Discover
        </Link>
      </div>
      {inlineEditModeEnabled && (
        <p className="text-xs text-amber-800 dark:text-amber-200 italic">
          Edit mode is active. Use the edit badge on any destination card to make changes in place.
        </p>
      )}
    </div>
  );
}
