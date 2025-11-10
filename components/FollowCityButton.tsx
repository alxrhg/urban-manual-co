'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Heart } from 'lucide-react';

interface FollowCityButtonProps {
  citySlug: string;
  cityName: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
}

export function FollowCityButton({ 
  citySlug, 
  cityName,
  variant = 'default',
  showLabel = true 
}: FollowCityButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      checkFollowStatus();
    } else {
      setIsLoading(false);
    }
  }, [user, citySlug]);

  const checkFollowStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follow_cities')
        .select('id')
        .eq('user_id', user.id)
        .eq('city_slug', citySlug)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking follow status:', error);
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!user) {
      // Redirect to login or show toast
      return;
    }

    setIsUpdating(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follow_cities')
          .delete()
          .eq('user_id', user.id)
          .eq('city_slug', citySlug);

        if (error) throw error;
        setIsFollowing(false);
      } else {
        // Follow
        const { error } =         await (supabase
          .from('follow_cities')
          .insert as any)({
            user_id: user.id,
            city_slug: citySlug,
          });

        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      alert('Failed to update follow status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user) {
    return null; // Don't show button if not logged in
  }

  if (isLoading) {
    return (
      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    );
  }

  const buttonClass = variant === 'compact'
    ? `p-1.5 rounded-full ${isFollowing ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-dark-blue-800 text-gray-600 dark:text-gray-400'} hover:opacity-80 transition-opacity`
    : `px-3 py-1.5 rounded-2xl text-sm font-medium flex items-center gap-2 transition-colors ${
        isFollowing
          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          : 'bg-gray-100 dark:bg-dark-blue-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
      } hover:opacity-80`;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isUpdating}
      className={buttonClass}
      aria-label={isFollowing ? `Unfollow ${cityName}` : `Follow ${cityName}`}
    >
      <Heart 
        className={`h-4 w-4 ${isFollowing ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span>{isFollowing ? 'Following' : 'Follow'}</span>
      )}
    </button>
  );
}

