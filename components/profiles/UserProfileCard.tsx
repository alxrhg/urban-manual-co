'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Globe, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserProfile, UserStats } from '@/types/features';

interface UserProfileCardProps {
  profile: UserProfile & { stats?: UserStats | null };
  showFollowButton?: boolean;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  compact?: boolean;
}

export function UserProfileCard({
  profile,
  showFollowButton = true,
  onFollow,
  onUnfollow,
  compact = false,
}: UserProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(profile.is_following || false);
  const [isLoading, setIsLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(profile.followers_count || 0);

  const handleFollowToggle = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isFollowing && onUnfollow) {
        await onUnfollow();
        setIsFollowing(false);
        setFollowersCount((c) => c - 1);
      } else if (!isFollowing && onFollow) {
        await onFollow();
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  if (compact) {
    return (
      <Link
        href={`/profile/${profile.username || profile.id}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name || 'User'}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-sm font-medium">
              {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{profile.display_name || profile.username}</p>
          {profile.username && profile.display_name && (
            <p className="text-sm text-gray-500 truncate">@{profile.username}</p>
          )}
        </div>
        {showFollowButton && onFollow && (
          <Button
            size="sm"
            variant={isFollowing ? 'outline' : 'default'}
            onClick={(e) => {
              e.preventDefault();
              handleFollowToggle();
            }}
            disabled={isLoading}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Button>
        )}
      </Link>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Cover Image */}
      {profile.cover_url && (
        <div className="h-32 relative">
          <Image src={profile.cover_url} alt="" fill className="object-cover" />
        </div>
      )}

      <div className="p-4">
        {/* Avatar and Follow */}
        <div className="flex items-start justify-between -mt-12 mb-3">
          <Link href={`/profile/${profile.username || profile.id}`}>
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                width={80}
                height={80}
                className="rounded-full border-4 border-white dark:border-gray-900"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 border-4 border-white dark:border-gray-900 flex items-center justify-center">
                <span className="text-2xl font-medium">
                  {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
          </Link>

          {showFollowButton && onFollow && (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={handleFollowToggle}
              disabled={isLoading}
              className="mt-14"
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        {/* Name & Username */}
        <Link href={`/profile/${profile.username || profile.id}`}>
          <h3 className="font-semibold text-lg hover:underline">
            {profile.display_name || profile.username || 'Anonymous'}
          </h3>
        </Link>
        {profile.username && (
          <p className="text-gray-500 text-sm">@{profile.username}</p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm line-clamp-2">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
          {profile.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Globe className="h-4 w-4" /> Website
            </a>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Joined {formatDate(profile.created_at)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm">
          <span>
            <strong>{followersCount}</strong>{' '}
            <span className="text-gray-500">followers</span>
          </span>
          <span>
            <strong>{profile.following_count || 0}</strong>{' '}
            <span className="text-gray-500">following</span>
          </span>
          {profile.stats && (
            <>
              <span>
                <strong>{profile.stats.destinations_visited}</strong>{' '}
                <span className="text-gray-500">places visited</span>
              </span>
            </>
          )}
        </div>

        {/* Travel Style & Interests */}
        {(profile.travel_style || profile.favorite_categories?.length) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.travel_style && (
              <Badge variant="secondary">{profile.travel_style}</Badge>
            )}
            {profile.favorite_categories?.slice(0, 3).map((cat) => (
              <Badge key={cat} variant="outline">
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
