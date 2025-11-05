/**
 * Feed Card Component
 * Displays a destination card in the algorithmic feed
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Heart, X, MapPin, Star, Sparkles } from 'lucide-react';
import { useSignalTracking } from '@/hooks/useSignalTracking';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { FeedCard as FeedCardType } from '@/hooks/useFeed';

interface FeedCardProps {
  card: FeedCardType;
  onSave?: () => void;
  onSkip?: () => void;
}

export function FeedCard({ card, onSave, onSkip }: FeedCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    trackView,
    startDwellTimer,
    stopDwellTimer,
    trackHover,
    trackClick,
    trackSave,
    trackSkip,
  } = useSignalTracking();

  const { destination, reason, position } = card;

  // Check if already saved
  useEffect(() => {
    async function checkSaved() {
      if (!user) return;

      const { data } = await supabase
        .from('saved_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .single();

      setIsSaved(!!data);
    }

    checkSaved();
  }, [user, destination.slug]);

  // Track view when card enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackView(destination.id, position);
            startDwellTimer(destination.id, position);
          } else {
            stopDwellTimer(destination.id, position);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
      stopDwellTimer(destination.id, position);
    };
  }, [destination.id, position, trackView, startDwellTimer, stopDwellTimer]);

  const handleSave = async () => {
    if (!user || saving) return;

    setSaving(true);
    trackSave(destination.id, position);

    try {
      if (isSaved) {
        // Unsave
        await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('destination_slug', destination.slug);

        setIsSaved(false);
      } else {
        // Save
        await supabase.from('saved_places').insert({
          user_id: user.id,
          destination_slug: destination.slug,
        });

        setIsSaved(true);
      }

      onSave?.();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    trackSkip(destination.id, position);
    onSkip?.();
  };

  const handleClick = () => {
    trackClick(destination.id, position);
    router.push(`/destination/${destination.slug}`);
  };

  const getPriceLabel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  return (
    <div
      ref={cardRef}
      className="group relative bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-800"
      onMouseEnter={() => trackHover(destination.id, position)}
    >
      {/* Image */}
      <div
        className="relative h-64 md:h-80 cursor-pointer overflow-hidden"
        onClick={handleClick}
      >
        {destination.image && (
          <Image
            src={destination.image}
            alt={destination.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Badges overlay */}
        <div className="absolute top-4 left-4 flex gap-2">
          {destination.michelin_stars > 0 && (
            <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {destination.michelin_stars}★ Michelin
            </span>
          )}
          {destination.crown && (
            <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-medium rounded-full">
              👑 Crown
            </span>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white text-xl md:text-2xl font-bold mb-1">
            {destination.name}
          </h3>
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{destination.city}</span>
            {destination.category && (
              <>
                <span>•</span>
                <span>{destination.category}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card content */}
      <div className="p-4">
        {/* Meta info */}
        <div className="flex items-center gap-3 mb-3 text-sm text-gray-600 dark:text-gray-400">
          {destination.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{destination.rating.toFixed(1)}</span>
            </div>
          )}
          {destination.price_level && (
            <span className="text-gray-800 dark:text-gray-300 font-medium">
              {getPriceLabel(destination.price_level)}
            </span>
          )}
        </div>

        {/* Reason */}
        {reason && (
          <div className="mb-4 flex items-start gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{reason}</span>
          </div>
        )}

        {/* Description preview */}
        {destination.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
            {destination.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
            <span className="font-medium">Skip</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all touch-manipulation ${
              isSaved
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            <span className="font-medium">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
