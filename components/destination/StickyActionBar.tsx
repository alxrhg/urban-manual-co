'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Plus, Navigation, Share2, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics/track';
import { QuickTripSelector } from '@/components/QuickTripSelector';
import { SaveDestinationModal } from '@/components/SaveDestinationModal';

interface StickyActionBarProps {
  destinationId?: number;
  destinationSlug: string;
  destinationName: string;
  destinationCity: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function StickyActionBar({
  destinationId,
  destinationSlug,
  destinationName,
  destinationCity,
  latitude,
  longitude,
}: StickyActionBarProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTripSelector, setShowTripSelector] = useState(false);

  // Show bar after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if destination is saved
  useEffect(() => {
    async function checkIfSaved() {
      if (!user || !destinationSlug) return;

      try {
        const { data } = await supabase
          .from('saved_places')
          .select('id')
          .eq('user_id', user.id)
          .eq('destination_slug', destinationSlug)
          .single();

        setIsSaved(!!data);
      } catch {
        setIsSaved(false);
      }
    }

    checkIfSaved();
  }, [user, destinationSlug]);

  const handleSave = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (isSaved) {
      // If already saved, show modal to manage collections
      setShowSaveModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('saved_places').upsert({
        user_id: user.id,
        destination_slug: destinationSlug,
      });

      if (!error) {
        setIsSaved(true);
        trackEvent({
          event_type: 'save',
          destination_slug: destinationSlug,
          metadata: { source: 'sticky_action_bar' },
        });
      }
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToTrip = () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setShowTripSelector(true);
  };

  const handleDirections = () => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      window.open(url, '_blank', 'noopener,noreferrer');
      trackEvent({
        event_type: 'click',
        destination_slug: destinationSlug,
        metadata: { action: 'get_directions', source: 'sticky_action_bar' },
      });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: destinationName,
      text: `Check out ${destinationName} in ${destinationCity}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        trackEvent({
          event_type: 'click',
          destination_slug: destinationSlug,
          metadata: { action: 'share', method: 'native', source: 'sticky_action_bar' },
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      trackEvent({
        event_type: 'click',
        destination_slug: destinationSlug,
        metadata: { action: 'share', method: 'clipboard', source: 'sticky_action_bar' },
      });
    }
  };

  return (
    <>
      {/* Sticky Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Destination info */}
              <div className="flex-1 min-w-0 hidden sm:block">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {destinationName}
                </h3>
                <p className="text-sm text-gray-500 truncate">{destinationCity}</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-1 sm:flex-none justify-center sm:justify-end">
                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isSaved
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isSaved ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  <span className="hidden xs:inline">{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* Add to Trip button */}
                <button
                  onClick={handleAddToTrip}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">Add to Trip</span>
                </button>

                {/* Directions button */}
                {latitude && longitude && (
                  <button
                    onClick={handleDirections}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span className="hidden sm:inline">Directions</span>
                  </button>
                )}

                {/* Share button */}
                <button
                  onClick={handleShare}
                  className="p-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safe area padding for mobile */}
      <div
        className={`h-[72px] transition-all duration-300 ${isVisible ? 'block' : 'hidden'}`}
      />

      {/* Modals */}
      {destinationId && (
        <SaveDestinationModal
          destinationId={destinationId}
          destinationSlug={destinationSlug}
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={() => {
            setIsSaved(true);
            setShowSaveModal(false);
          }}
        />
      )}

      <QuickTripSelector
        isOpen={showTripSelector}
        onClose={() => setShowTripSelector(false)}
        destinationSlug={destinationSlug}
        destinationName={destinationName}
        destinationCity={destinationCity}
      />
    </>
  );
}
