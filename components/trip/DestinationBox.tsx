'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock, ChevronDown,
  Plane, Train, Building2, Phone, Navigation, ExternalLink,
  Flag, Tag, CalendarCheck, Timer, Check
} from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import type { ItineraryItemNotes } from '@/types/trip';

interface DestinationBoxProps {
  item: EnrichedItineraryItem;
  onClose?: () => void;
  onTimeChange?: (itemId: string, time: string) => void;
  onNotesChange?: (itemId: string, notes: string) => void;
  onItemUpdate?: (itemId: string, updates: Partial<ItineraryItemNotes>) => void;
  onRemove?: (itemId: string) => void;
  className?: string;
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'Must do', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'want-to', label: 'Want to', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'if-time', label: 'If time', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

const BOOKING_OPTIONS = [
  { value: 'need-to-book', label: 'Need to book' },
  { value: 'booked', label: 'Booked' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'walk-in', label: 'Walk-in' },
];

const TAG_OPTIONS = ['Romantic', 'Kid-friendly', 'Outdoor', 'Foodie', 'Photo spot', 'Local favorite'];

/**
 * DestinationBox - Full-featured destination details for sidebar
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const [showMore, setShowMore] = useState(false);

  // Edit state
  const [editTime, setEditTime] = useState(item.time || '');
  const [editNotes, setEditNotes] = useState(item.parsedNotes?.notes || '');
  const [editConfirmation, setEditConfirmation] = useState(
    item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || ''
  );
  const [editDepartureTime, setEditDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [editArrivalTime, setEditArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');
  const [editCheckInTime, setEditCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [editCheckOutTime, setEditCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [editDuration, setEditDuration] = useState(item.parsedNotes?.duration || 60);
  const [editPriority, setEditPriority] = useState(item.parsedNotes?.priority || '');
  const [editBookingStatus, setEditBookingStatus] = useState(item.parsedNotes?.bookingStatus || '');
  const [editTags, setEditTags] = useState<string[]>(item.parsedNotes?.tags || []);

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const neighborhood = destination?.neighborhood;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const phone = parsedNotes?.phone;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;
  const michelinStars = destination?.michelin_stars;

  // Reset when item changes
  useEffect(() => {
    setEditTime(item.time || '');
    setEditNotes(item.parsedNotes?.notes || '');
    setEditConfirmation(item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '');
    setEditDepartureTime(item.parsedNotes?.departureTime || '');
    setEditArrivalTime(item.parsedNotes?.arrivalTime || '');
    setEditCheckInTime(item.parsedNotes?.checkInTime || '');
    setEditCheckOutTime(item.parsedNotes?.checkOutTime || '');
    setEditDuration(item.parsedNotes?.duration || 60);
    setEditPriority(item.parsedNotes?.priority || '');
    setEditBookingStatus(item.parsedNotes?.bookingStatus || '');
    setEditTags(item.parsedNotes?.tags || []);
    setShowMore(false);
  }, [item.id]);

  // Save changes on blur or when values change
  const saveChanges = (field: string, value: unknown) => {
    if (!onItemUpdate) return;

    const updates: Partial<ItineraryItemNotes> = {};

    switch (field) {
      case 'time':
        if (onTimeChange && value !== item.time) {
          onTimeChange(item.id, value as string);
        }
        return;
      case 'notes':
        if (value !== (item.parsedNotes?.notes || '')) updates.notes = value as string;
        break;
      case 'duration':
        if (value !== (item.parsedNotes?.duration || 60)) updates.duration = value as number;
        break;
      case 'priority':
        updates.priority = (value as string) as 'must-do' | 'want-to' | 'if-time' | undefined;
        break;
      case 'bookingStatus':
        updates.bookingStatus = (value as string) as 'need-to-book' | 'booked' | 'waitlist' | 'walk-in' | undefined;
        break;
      case 'tags':
        updates.tags = value as string[];
        break;
      case 'checkInTime':
        if (value !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = value as string;
        break;
      case 'checkOutTime':
        if (value !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = value as string;
        break;
      case 'departureTime':
        if (value !== (item.parsedNotes?.departureTime || '')) updates.departureTime = value as string;
        break;
      case 'arrivalTime':
        if (value !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = value as string;
        break;
      case 'confirmation':
        if (itemType === 'hotel') {
          updates.confirmationNumber = value as string;
          updates.hotelConfirmation = value as string;
        } else {
          updates.confirmationNumber = value as string;
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      onItemUpdate(item.id, updates);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = editTags.includes(tag)
      ? editTags.filter(t => t !== tag)
      : [...editTags, tag];
    setEditTags(newTags);
    saveChanges('tags', newTags);
  };

  // Get type icon
  const TypeIcon = itemType === 'flight' ? Plane : itemType === 'train' ? Train : itemType === 'hotel' ? Building2 : MapPin;

  // Coordinates for directions
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;

  const isPlace = itemType !== 'flight' && itemType !== 'train' && itemType !== 'hotel';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <TypeIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{itemType}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
            {name}
          </h3>
          {category && (
            <span className="text-xs text-gray-500 capitalize">{category}</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Image */}
      {image && isPlace && (
        <div className="aspect-[2/1] relative">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
          />
          {michelinStars && michelinStars > 0 && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              {michelinStars}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Flight/Train route display */}
        {(itemType === 'flight' || itemType === 'train') && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.from || '—'}</p>
              <p className="text-xs text-gray-500">{editDepartureTime || '—'}</p>
            </div>
            <div className="flex items-center gap-2 px-3">
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
              <TypeIcon className="w-4 h-4 text-gray-400" />
              <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.to || '—'}</p>
              <p className="text-xs text-gray-500">{editArrivalTime || '—'}</p>
            </div>
          </div>
        )}

        {/* Hotel check-in/out display */}
        {itemType === 'hotel' && (editCheckInTime || editCheckOutTime) && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-0.5">Check-in</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{editCheckInTime || '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-0.5">Check-out</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{editCheckOutTime || '—'}</p>
            </div>
          </div>
        )}

        {/* Rating & Price (places only) */}
        {isPlace && (rating || priceLevel) && (
          <div className="flex items-center gap-3 text-sm">
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">{rating.toFixed(1)}</span>
              </div>
            )}
            {priceLevel && priceLevel > 0 && (
              <span className="text-gray-400">{'$'.repeat(priceLevel)}</span>
            )}
            {neighborhood && (
              <span className="text-gray-400">· {neighborhood}</span>
            )}
          </div>
        )}

        {/* Description (places only) */}
        {isPlace && description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
            {description}
          </p>
        )}

        {/* Priority badges (places only) */}
        {isPlace && (
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  const newValue = editPriority === opt.value ? '' : opt.value;
                  setEditPriority(newValue);
                  saveChanges('priority', newValue);
                }}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all ${
                  editPriority === opt.value
                    ? opt.color
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Edit Fields */}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          {/* Time for places */}
          {isPlace && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  onBlur={() => saveChanges('time', editTime)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
              <div className="w-28">
                <label className="text-[10px] text-gray-400 mb-1 block">Duration</label>
                <select
                  value={editDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditDuration(val);
                    saveChanges('duration', val);
                  }}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Times for flights/trains */}
          {(itemType === 'flight' || itemType === 'train') && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Departs</label>
                <input
                  type="time"
                  value={editDepartureTime}
                  onChange={(e) => setEditDepartureTime(e.target.value)}
                  onBlur={() => saveChanges('departureTime', editDepartureTime)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Arrives</label>
                <input
                  type="time"
                  value={editArrivalTime}
                  onChange={(e) => setEditArrivalTime(e.target.value)}
                  onBlur={() => saveChanges('arrivalTime', editArrivalTime)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Times for hotels */}
          {itemType === 'hotel' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Check-in</label>
                <input
                  type="time"
                  value={editCheckInTime}
                  onChange={(e) => setEditCheckInTime(e.target.value)}
                  onBlur={() => saveChanges('checkInTime', editCheckInTime)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 mb-1 block">Check-out</label>
                <input
                  type="time"
                  value={editCheckOutTime}
                  onChange={(e) => setEditCheckOutTime(e.target.value)}
                  onBlur={() => saveChanges('checkOutTime', editCheckOutTime)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Booking status (places only) */}
          {isPlace && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Booking</label>
              <select
                value={editBookingStatus}
                onChange={(e) => {
                  setEditBookingStatus(e.target.value);
                  saveChanges('bookingStatus', e.target.value);
                }}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
              >
                <option value="">Not set</option>
                {BOOKING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Confirmation for bookable items */}
          {(itemType === 'hotel' || itemType === 'flight' || itemType === 'train' || editBookingStatus === 'booked') && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Confirmation #</label>
              <input
                type="text"
                value={editConfirmation}
                onChange={(e) => setEditConfirmation(e.target.value)}
                onBlur={() => saveChanges('confirmation', editConfirmation)}
                placeholder="Booking reference"
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
              />
            </div>
          )}

          {/* Tags (places only) */}
          {isPlace && (
            <div>
              <label className="text-[10px] text-gray-400 mb-1.5 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 text-[11px] rounded-full transition-all ${
                      editTags.includes(tag)
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              onBlur={() => saveChanges('notes', editNotes)}
              placeholder="Add a note..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Quick Actions */}
        {(phone || website || (lat && lng)) && (
          <div className="flex items-center gap-2 pt-2">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                Call
              </a>
            )}
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Web
              </a>
            )}
            {lat && lng && (
              <a
                href={`https://maps.apple.com/?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Directions
              </a>
            )}
          </div>
        )}

        {/* Address */}
        {address && (
          <p className="text-xs text-gray-400 leading-relaxed">{address}</p>
        )}

        {/* Remove */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Remove from itinerary
          </button>
        )}
      </div>
    </div>
  );
}
