'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Share2, Check, ChevronDown, X, Plus, List, Map, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Destination } from '@/types/destination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client';

interface DestinationActionsProps {
  destination: Destination;
  isSaved: boolean;
  isVisited: boolean;
  onSaveClick: () => void;
  onVisitClick: () => void;
  onSaveToggle?: (slug: string, saved: boolean) => void;
  onShowSaveModal: () => void;
  onShowVisitedModal: () => void;
  className?: string;
}

/**
 * DestinationActions - Action buttons for save, share, visited, etc.
 *
 * Handles:
 * - Save/unsave with dropdown for lists
 * - Share functionality
 * - Mark as visited with dropdown for details
 * - View full page link
 */
export function DestinationActions({
  destination,
  isSaved,
  isVisited,
  onSaveClick,
  onVisitClick,
  onSaveToggle,
  onShowSaveModal,
  onShowVisitedModal,
  className = '',
}: DestinationActionsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showVisitedDropdown, setShowVisitedDropdown] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/destination/${destination.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: destination.name,
          text: destination.micro_description || `Check out ${destination.name}`,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnsave = async () => {
    if (destination?.slug && user) {
      try {
        const supabaseClient = createClient();
        if (supabaseClient) {
          const { error } = await supabaseClient
            .from('saved_places')
            .delete()
            .eq('user_id', user.id)
            .eq('destination_slug', destination.slug);
          if (!error && onSaveToggle) {
            onSaveToggle(destination.slug, false);
          }
        }
      } catch (error) {
        console.error('Error unsaving:', error);
        toast.error('Failed to unsave. Please try again.');
      }
    }
    setShowSaveDropdown(false);
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Save Button with Dropdown */}
      <DropdownMenu open={showSaveDropdown} onOpenChange={setShowSaveDropdown}>
        <DropdownMenuTrigger asChild>
          <button
            className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                router.push('/auth/login');
                return;
              }
              if (!isSaved) {
                e.preventDefault();
                onSaveClick();
                setShowSaveDropdown(false);
              }
            }}
          >
            <Bookmark className={`h-3 w-3 ${isSaved ? 'fill-current' : ''}`} />
            {isSaved ? 'Saved' : 'Save'}
            {isSaved && <ChevronDown className="h-3 w-3 ml-0.5" />}
          </button>
        </DropdownMenuTrigger>
        {isSaved && (
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => {
              onShowSaveModal();
              setShowSaveDropdown(false);
            }}>
              <List className="h-3 w-3 mr-2" />
              Save to List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              router.push('/trips');
              setShowSaveDropdown(false);
            }}>
              <Map className="h-3 w-3 mr-2" />
              Save to Trip
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => {
              router.push('/account?tab=collections');
              setShowSaveDropdown(false);
            }}>
              <Plus className="h-3 w-3 mr-2" />
              Create a List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleUnsave}>
              <X className="h-3 w-3 mr-2" />
              Remove from Saved
            </DropdownMenuItem>
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      {/* Share Button */}
      <button
        className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
        onClick={handleShare}
      >
        <Share2 className="h-3 w-3" />
        {copied ? 'Copied!' : 'Share'}
      </button>

      {/* Visited Button with Dropdown */}
      {user && (
        <DropdownMenu open={showVisitedDropdown} onOpenChange={setShowVisitedDropdown}>
          <DropdownMenuTrigger asChild>
            <button
              className={`px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs transition-colors flex items-center gap-1.5 ${
                isVisited
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={(e) => {
                if (!isVisited) {
                  e.preventDefault();
                  onVisitClick();
                }
              }}
            >
              <Check className={`h-3 w-3 ${isVisited ? 'stroke-[3]' : ''}`} />
              {isVisited ? 'Visited' : 'Mark Visited'}
              {isVisited && <ChevronDown className="h-3 w-3 ml-0.5" />}
            </button>
          </DropdownMenuTrigger>
          {isVisited && (
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => {
                onShowVisitedModal();
                setShowVisitedDropdown(false);
              }}>
                <Plus className="h-3 w-3 mr-2" />
                Add Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                onVisitClick();
                setShowVisitedDropdown(false);
              }}>
                <X className="h-3 w-3 mr-2" />
                Remove Visit
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      )}

      {/* View Full Page Link */}
      {destination.slug && destination.slug.trim() && (
        <Link
          href={`/destination/${destination.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          View Full Page
        </Link>
      )}
    </div>
  );
}
