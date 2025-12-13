'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UseFollowOptions {
  targetUserId: string;
  initialIsFollowing?: boolean;
}

interface UseFollowReturn {
  isFollowing: boolean;
  isLoading: boolean;
  followerCount: number;
  toggleFollow: () => Promise<void>;
  requiresAuth: boolean;
}

/**
 * Hook for follow/unfollow user actions with optimistic UI updates
 */
export function useFollow({ targetUserId, initialIsFollowing = false }: UseFollowOptions): UseFollowReturn {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  // Sync with initial value when it changes
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const toggleFollow = useCallback(async () => {
    if (!user?.id || !targetUserId) return;
    if (user.id === targetUserId) return; // Can't follow yourself

    // Optimistic update
    const previousState = isFollowing;
    setIsFollowing(!isFollowing);
    setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setIsFollowing(previousState);
        setFollowerCount(prev => previousState ? prev + 1 : prev - 1);
        const data = await response.json();
        console.error('Follow action failed:', data.error);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsFollowing(previousState);
      setFollowerCount(prev => previousState ? prev + 1 : prev - 1);
      console.error('Error toggling follow:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, targetUserId, isFollowing]);

  return {
    isFollowing,
    isLoading,
    followerCount,
    toggleFollow,
    requiresAuth: !user,
  };
}
