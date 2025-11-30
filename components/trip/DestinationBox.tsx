'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, MapPin, Star, Globe, Clock, ChevronDown, ExternalLink, Pencil, Check, Trash2, StickyNote } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onNotesChange?: (itemId: string, notes: string) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

/**
 * DestinationBox - Inline destination details component with edit mode
 * Shows when an itinerary item is clicked, replacing other sidebar content
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onNotesChange,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const [showMore, setShowMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTime, setEditTime] = useState(item.time || '');
  const [editNotes, setEditNotes] = useState(item.parsedNotes?.notes || item.parsedNotes?.raw || '');

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const neighborhood = destination?.neighborhood;
  const description = destination?.description;
  const address = destination?.formatted_address;
  const website = destination?.website;
  const rating = destination?.rating;
  const reviewCount = destination?.user_ratings_total;
  const priceLevel = destination?.price_level;
  const michelinStars = destination?.michelin_stars;

  const handleSave = () => {
    if (onTimeChange && editTime !== item.time) {
      onTimeChange(item.id, editTime);
    }
    if (onNotesChange && editNotes !== (item.parsedNotes?.notes || item.parsedNotes?.raw || '')) {
      onNotesChange(item.id, editNotes);
    }
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate">
            {name}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
              title="Save changes"
            >
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4 text-stone-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-stone-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Image */}
        {image && (
          <div className="aspect-[16/9] relative rounded-xl overflow-hidden">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover"
            />
            {michelinStars && michelinStars > 0 && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                {michelinStars} Michelin
              </div>
            )}
          </div>
        )}

        {/* Category & Neighborhood */}
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <span className="px-2.5 py-1 bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-300 text-xs font-medium rounded-full capitalize">
              {category}
            </span>
          )}
          {neighborhood && (
            <span className="px-2.5 py-1 bg-stone-50 dark:bg-gray-800/50 text-stone-500 dark:text-gray-400 text-xs rounded-full">
              {neighborhood}
            </span>
          )}
        </div>

        {/* Rating & Price */}
        {(rating || priceLevel) && (
          <div className="flex items-center gap-3 text-xs">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-stone-700 dark:text-gray-300">{rating.toFixed(1)}</span>
                {reviewCount && (
                  <span className="text-stone-400 dark:text-gray-500">({reviewCount.toLocaleString()})</span>
                )}
              </div>
            )}
            {priceLevel && priceLevel > 0 && (
              <span className="text-stone-500 dark:text-gray-400">
                {'$'.repeat(priceLevel)}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <div>
            <p className={`text-sm text-stone-600 dark:text-gray-300 leading-relaxed ${!showMore ? 'line-clamp-3' : ''}`}>
              {description}
            </p>
            {description.length > 150 && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="flex items-center gap-1 mt-1.5 text-xs text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-300 transition-colors"
              >
                {showMore ? 'Show less' : 'Show more'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{address}</p>
          </div>
        )}

        {/* Editable Time Section */}
        <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs font-medium text-stone-500 dark:text-gray-400">Scheduled Time</span>
          </div>
          {isEditing ? (
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
            />
          ) : (
            <p className="text-sm text-stone-700 dark:text-gray-300">
              {item.time || <span className="text-stone-400 dark:text-gray-500 italic">No time set</span>}
            </p>
          )}
        </div>

        {/* Editable Notes Section */}
        <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs font-medium text-stone-500 dark:text-gray-400">Notes</span>
          </div>
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 resize-none"
            />
          ) : (
            <p className="text-sm text-stone-700 dark:text-gray-300">
              {parsedNotes?.notes || parsedNotes?.raw || <span className="text-stone-400 dark:text-gray-500 italic">No notes</span>}
            </p>
          )}
        </div>

        {/* Links */}
        {website && (
          <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="truncate">{website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* Remove Button (only in edit mode) */}
        {isEditing && onRemove && (
          <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove from Itinerary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
