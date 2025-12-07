'use client';

import { memo } from 'react';
import { Save, Share2, Trash2, Loader2 } from 'lucide-react';
import { TripActionsProps } from './types';

/**
 * TripActions - Footer actions for trip management
 *
 * Provides:
 * - Save/Update trip button
 * - Share trip button
 * - Clear trip option
 */
const TripActions = memo(function TripActions({
  tripId,
  isModified,
  isSaving,
  onSave,
  onShare,
  onClear,
}: TripActionsProps) {
  const saveLabel = tripId ? 'Update' : 'Save';

  return (
    <footer className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
      {/* Primary actions */}
      <div className="flex gap-2">
        {/* Save button */}
        <button
          onClick={onSave}
          disabled={isSaving || !isModified}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveLabel} Trip
        </button>

        {/* Share button */}
        <button
          onClick={onShare}
          className="px-4 py-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          aria-label="Share trip"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Danger zone */}
      <button
        onClick={onClear}
        className="w-full flex items-center justify-center gap-2 py-2 text-[12px] font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Clear Trip
      </button>
    </footer>
  );
});

export default TripActions;
