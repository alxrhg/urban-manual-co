'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Share2, Check, Navigation, ExternalLink, Plus, ChevronDown, List, Map, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/useToast';
import type { Destination } from '@/types/destination';

interface DestinationActionsProps {
  destination: Destination;
  isSaved: boolean;
  isVisited: boolean;
  onSaveChange: (saved: boolean) => void;
  onVisitChange: (visited: boolean) => void;
  onShowSaveModal: () => void;
  onShowVisitedModal: () => void;
  directionsUrl: string | null;
}

export function DestinationActions({
  destination,
  isSaved,
  isVisited,
  onSaveChange,
  onVisitChange,
  onShowSaveModal,
  onShowVisitedModal,
  directionsUrl,
}: DestinationActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;
    const title = destination.name || 'Check out this place';

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToggle = async () => {
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
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleVisitToggle = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const supabase = createClient();
    if (!supabase || !destination.slug) return;

    try {
      if (isVisited) {
        const { error } = await supabase
          .from('visited_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);
        if (!error) onVisitChange(false);
      } else {
        const { error } = await supabase
          .from('visited_places')
          .upsert({
            user_id: user.id,
            destination_slug: destination.slug,
            visited_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,destination_slug',
          });
        if (!error) onVisitChange(true);
      }
    } catch (error) {
      console.error('Error toggling visit:', error);
      toast.error('Failed to update visit status.');
    }
  };

  const buttonClass = "inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors";
  const activeButtonClass = "inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-900 dark:text-white transition-colors";

  return (
    <div className="flex flex-wrap gap-2">
      {/* Save Button */}
      <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
        <DropdownMenuTrigger asChild>
          <button
            className={isSaved ? activeButtonClass : buttonClass}
            onClick={(e) => {
              if (!isSaved) {
                e.preventDefault();
                handleSaveToggle();
              }
            }}
          >
            <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
            {isSaved && <ChevronDown className="h-3 w-3" />}
          </button>
        </DropdownMenuTrigger>
        {isSaved && (
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => { onShowSaveModal(); setShowSaveDropdown(false); }}>
              <List className="h-3.5 w-3.5 mr-2" />
              Add to Collection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { router.push('/trips'); setShowSaveDropdown(false); }}>
              <Map className="h-3.5 w-3.5 mr-2" />
              Add to Trip
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { handleSaveToggle(); setShowSaveDropdown(false); }}>
              <X className="h-3.5 w-3.5 mr-2" />
              Remove from Saved
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      {/* Share Button */}
      <button onClick={handleShare} className={buttonClass}>
        <Share2 className="h-3.5 w-3.5" />
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* Visited Button */}
      {user && (
        <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
          <DropdownMenuTrigger asChild>
            <button
              className={isVisited ? activeButtonClass : buttonClass}
              onClick={(e) => {
                if (!isVisited) {
                  e.preventDefault();
                  handleVisitToggle();
                }
              }}
            >
              <Check className={`h-3.5 w-3.5 ${isVisited ? 'stroke-[2.5]' : ''}`} />
              {isVisited ? 'Visited' : 'Mark Visited'}
              {isVisited && <ChevronDown className="h-3 w-3" />}
            </button>
          </DropdownMenuTrigger>
          {isVisited && (
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => { onShowVisitedModal(); setShowVisitedDropdown(false); }}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { handleVisitToggle(); setShowVisitedDropdown(false); }}>
                <X className="h-3.5 w-3.5 mr-2" />
                Remove Visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      )}

      {/* Directions Button */}
      {directionsUrl && (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation className="h-3.5 w-3.5" />
          Directions
        </a>
      )}

      {/* Full Page Link */}
      {destination.slug && (
        <Link
          href={`/destination/${destination.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Full Page
        </Link>
      )}
    </div>
  );
}
