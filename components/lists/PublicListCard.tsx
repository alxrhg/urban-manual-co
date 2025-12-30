'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, Eye } from 'lucide-react';
import { Button } from '@/ui/button';
import type { PublicList } from '@/types/features';

interface PublicListCardProps {
  list: PublicList;
  onLike?: () => Promise<void>;
  onUnlike?: () => Promise<void>;
  showUser?: boolean;
}

export function PublicListCard({ list, onLike, onUnlike, showUser = true }: PublicListCardProps) {
  const [isLiked, setIsLiked] = useState(list.is_liked || false);
  const [likesCount, setLikesCount] = useState(list.likes_count);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isLiked && onUnlike) {
        await onUnlike();
        setIsLiked(false);
        setLikesCount((c) => c - 1);
      } else if (!isLiked && onLike) {
        await onLike();
        setIsLiked(true);
        setLikesCount((c) => c + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link
      href={`/lists/${list.id}`}
      className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Cover Image */}
      <div className="relative h-40 bg-gray-100 dark:bg-gray-800">
        {list.cover_image ? (
          <Image
            src={list.cover_image}
            alt={list.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            {list.emoji}
          </div>
        )}

        {/* Like button overlay */}
        {onLike && (
          <button
            onClick={handleLikeToggle}
            disabled={isLoading}
            className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
              isLiked
                ? 'bg-red-500 text-white'
                : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        )}

        {/* Featured badge */}
        {list.is_featured && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-medium px-2 py-1 rounded">
            Featured
          </span>
        )}
      </div>

      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-1">
          {list.emoji} {list.title}
        </h3>

        {/* Description */}
        {list.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {list.description}
          </p>
        )}

        {/* User */}
        {showUser && list.user && (
          <div className="flex items-center gap-2 mt-3">
            {list.user.avatar_url ? (
              <Image
                src={list.user.avatar_url}
                alt={list.user.display_name || ''}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-xs">
                  {(list.user.display_name || list.user.username || 'U')[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {list.user.display_name || list.user.username}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {list.item_count || 0} places
          </span>
          <span className="flex items-center gap-1">
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} /> {likesCount}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {list.views_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
