'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Heart, MapPin, Star, List, User, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  user_id: string;
  type: string;
  destination_slug: string | null;
  list_id: string | null;
  review_id: string | null;
  content: string | null;
  created_at: string;
  user_profiles?: {
    username: string;
    display_name: string;
    profile_photo: string | null;
  };
  destinations?: {
    name: string;
    slug: string;
  };
  lists?: {
    name: string;
  };
  reviews?: {
    rating: number;
  };
}

interface ActivityFeedProps {
  userId?: string;
  followingOnly?: boolean;
  limit?: number;
}

export function ActivityFeed({ userId, followingOnly = false, limit = 20 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchActivities();
  }, [userId, followingOnly, limit]);

  const fetchActivities = async () => {
    try {
      const supabaseClient = createClient();
      let query = supabaseClient
        .from('activities')
        .select(`
          *,
          user_profiles (
            username,
            display_name,
            profile_photo
          ),
          destinations (
            name,
            slug
          ),
          lists (
            name
          ),
          reviews (
            rating
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      } else if (followingOnly) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: following } = await supabaseClient
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);

          if (following && following.length > 0) {
            const followingIds = (following as any[]).map((f: any) => f.following_id);
            query = query.in('user_id', followingIds);
          } else {
            setActivities([]);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'saved':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'visited':
        return <MapPin className="h-4 w-4 text-green-500" />;
      case 'reviewed':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'created_list':
        return <List className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatActivityText = (activity: Activity) => {
    const username = activity.user_profiles?.display_name || activity.user_profiles?.username || 'Someone';
    const destName = activity.destinations?.name || 'a destination';

    switch (activity.type) {
      case 'saved':
        return (
          <span>
            <strong>{username}</strong> saved <strong>{destName}</strong>
          </span>
        );
      case 'visited':
        return (
          <span>
            <strong>{username}</strong> visited <strong>{destName}</strong>
          </span>
        );
      case 'reviewed':
        const stars = activity.reviews?.rating ? '⭐'.repeat(activity.reviews.rating) : '';
        return (
          <span>
            <strong>{username}</strong> reviewed <strong>{destName}</strong> {stars}
          </span>
        );
      case 'created_list':
        return (
          <span>
            <strong>{username}</strong> created a list "<strong>{activity.lists?.name}</strong>"
          </span>
        );
      default:
        return <span>{activity.content || 'New activity'}</span>;
    }
  };

  const getTimeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-2xl p-4 h-20"></div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <span className="text-gray-500 dark:text-gray-400">No activity yet</span>
        <span className="text-sm text-gray-400 dark:text-gray-500 mt-2">
          Start saving and visiting destinations to see activity here
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            if (activity.destination_slug && activity.destinations) {
              router.push(`/destination/${activity.destination_slug}`);
            }
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-900 dark:text-white">
                {formatActivityText(activity)}
              </span>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{getTimeAgo(activity.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
