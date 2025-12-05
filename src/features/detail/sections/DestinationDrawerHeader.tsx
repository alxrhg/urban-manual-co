'use client';

import { useRouter } from 'next/navigation';
import { X, Bookmark, Plus, Check, Edit } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import type { Destination } from '@/types/destination';

interface DestinationDrawerHeaderProps {
  destination: Destination;
  isEditMode: boolean;
  isAdmin: boolean;
  isSaved: boolean;
  isAddedToTrip: boolean;
  onClose: () => void;
  onEditToggle: () => void;
  onSaveChange: (saved: boolean) => void;
  onShowSaveModal: () => void;
  onAddToTrip: () => void;
}

export function DestinationDrawerHeader({
  destination,
  isEditMode,
  isAdmin,
  isSaved,
  isAddedToTrip,
  onClose,
  onEditToggle,
  onSaveChange,
  onShowSaveModal,
  onAddToTrip,
}: DestinationDrawerHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const handleSaveClick = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const supabase = createClient();
    if (!supabase || !destination.slug) return;

    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
        if (!error) onSaveChange(false);
      } else {
        const { error } = await supabase
          .from('saved_places')
          .upsert({
            user_id: user.id,
            destination_slug: destination.slug,
          });
        if (!error) {
          onSaveChange(true);
          onShowSaveModal();
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      toast.error('Failed to save');
    }
  };

  return (
    <div className="flex items-center justify-between w-full gap-3 px-1">
      {/* Left: Close + Title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Close drawer"
        >
          <X className="h-4 w-4 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
        </button>
        <h2 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {isEditMode ? 'Edit Destination' : (destination.name || 'Destination')}
        </h2>
      </div>

      {/* Right: Action buttons */}
      {user && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Admin Edit Button */}
          {isAdmin && (
            <button
              onClick={onEditToggle}
              className={`p-2 rounded-lg transition-colors ${
                isEditMode
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
              aria-label={isEditMode ? 'Exit edit mode' : 'Edit destination'}
            >
              <Edit className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}

          {/* Bookmark */}
          <button
            onClick={handleSaveClick}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isSaved ? 'Remove from saved' : 'Save destination'}
          >
            <Bookmark
              className={`h-4 w-4 ${
                isSaved
                  ? 'fill-current text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              strokeWidth={1.5}
            />
          </button>

          {/* Add to Trip */}
          <button
            onClick={onAddToTrip}
            disabled={isAddedToTrip}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label={isAddedToTrip ? 'Added to trip' : 'Add to trip'}
          >
            {isAddedToTrip ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2} />
            ) : (
              <Plus className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
