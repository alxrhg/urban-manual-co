'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock,
  Plane, Train, Building2, Phone, Navigation,
  ImageOff, Heart, Baby, Sun, Utensils, Camera, Trash2
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
  { value: 240, label: '4 hours' },
];

const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'Must do', activeClass: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'want-to', label: 'Want to', activeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  { value: 'if-time', label: 'If time', activeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const BOOKING_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'booked', label: 'Booked' },
  { value: 'need-to-book', label: 'Need to book' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'waitlist', label: 'On waitlist' },
];

const TAG_OPTIONS = [
  { value: 'Romantic', icon: Heart },
  { value: 'Kid-friendly', icon: Baby },
  { value: 'Outdoor', icon: Sun },
  { value: 'Foodie', icon: Utensils },
  { value: 'Photo spot', icon: Camera },
  { value: 'Local favorite', icon: Star },
];

export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
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
  const [imageError, setImageError] = useState(false);

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
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
    setImageError(false);
  }, [item.id]);

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

  const TypeIcon = itemType === 'flight' ? Plane : itemType === 'train' ? Train : itemType === 'hotel' ? Building2 : MapPin;
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;
  const phone = parsedNotes?.phone;
  const website = destination?.website || parsedNotes?.website;
  const isPlace = itemType !== 'flight' && itemType !== 'train' && itemType !== 'hotel';

  const handleDirections = () => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (name) {
      const query = encodeURIComponent(`${name}${destination?.city ? `, ${destination.city}` : ''}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-800">
            <TypeIcon className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {itemType.toUpperCase()}
            </span>
            <h2 className="text-lg font-semibold text-white leading-tight">
              {name}
            </h2>
            {category && (
              <p className="text-sm text-gray-400 capitalize">
                {category.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Image */}
      <div className="relative h-44 bg-gray-800">
        {image && !imageError ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized={image.includes('googleusercontent.com') || image.includes('maps.googleapis.com')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-gray-600" />
          </div>
        )}
        {michelinStars && michelinStars > 0 && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-current" />
            {michelinStars}
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="p-4 space-y-6">
        {/* Flight/Train route display */}
        {(itemType === 'flight' || itemType === 'train') && (
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{parsedNotes?.from || '—'}</p>
              <p className="text-xs text-gray-400">{editDepartureTime || '—'}</p>
            </div>
            <div className="flex items-center gap-2 px-3">
              <div className="w-8 h-px bg-gray-600" />
              <TypeIcon className="w-4 h-4 text-gray-400" />
              <div className="w-8 h-px bg-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{parsedNotes?.to || '—'}</p>
              <p className="text-xs text-gray-400">{editArrivalTime || '—'}</p>
            </div>
          </div>
        )}

        {/* Hotel check-in/out display */}
        {itemType === 'hotel' && (
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-900/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-in</p>
                <p className="text-sm font-semibold text-white">{editCheckInTime || '15:00'}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-700" />
            <div className="flex items-center gap-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Check-out</p>
                <p className="text-sm font-semibold text-white">{editCheckOutTime || '11:00'}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-900/30 flex items-center justify-center">
                <Clock className="w-4 h-4 text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* Priority Pills (places only) */}
        {isPlace && (
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((option) => {
              const isActive = editPriority === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    const newValue = isActive ? '' : option.value;
                    setEditPriority(newValue);
                    saveChanges('priority', newValue);
                  }}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${isActive
                      ? option.activeClass
                      : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                    }
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Time & Duration (places) */}
        {isPlace && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  onBlur={() => saveChanges('time', editTime)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Duration
              </label>
              <select
                value={editDuration}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setEditDuration(val);
                  saveChanges('duration', val);
                }}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Flight/Train times */}
        {(itemType === 'flight' || itemType === 'train') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Departs
              </label>
              <input
                type="time"
                value={editDepartureTime}
                onChange={(e) => setEditDepartureTime(e.target.value)}
                onBlur={() => saveChanges('departureTime', editDepartureTime)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Arrives
              </label>
              <input
                type="time"
                value={editArrivalTime}
                onChange={(e) => setEditArrivalTime(e.target.value)}
                onBlur={() => saveChanges('arrivalTime', editArrivalTime)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Hotel times */}
        {itemType === 'hotel' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Check-in
              </label>
              <input
                type="time"
                value={editCheckInTime}
                onChange={(e) => setEditCheckInTime(e.target.value)}
                onBlur={() => saveChanges('checkInTime', editCheckInTime)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Check-out
              </label>
              <input
                type="time"
                value={editCheckOutTime}
                onChange={(e) => setEditCheckOutTime(e.target.value)}
                onBlur={() => saveChanges('checkOutTime', editCheckOutTime)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Booking Status (places only) */}
        {isPlace && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Booking
            </label>
            <select
              value={editBookingStatus}
              onChange={(e) => {
                setEditBookingStatus(e.target.value);
                saveChanges('bookingStatus', e.target.value);
              }}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
            >
              {BOOKING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Confirmation for bookable items */}
        {(itemType === 'hotel' || itemType === 'flight' || itemType === 'train' || editBookingStatus === 'booked') && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Confirmation #
            </label>
            <input
              type="text"
              value={editConfirmation}
              onChange={(e) => setEditConfirmation(e.target.value)}
              onBlur={() => saveChanges('confirmation', editConfirmation)}
              placeholder="Booking reference"
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Tags (places only) */}
        {isPlace && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = editTags.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleTag(option.value)}
                    className={`
                      flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all
                      ${isActive
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                      }
                    `}
                  >
                    <Icon className="w-3 h-3" />
                    {option.value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Notes
          </label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            onBlur={() => saveChanges('notes', editNotes)}
            placeholder="Add a note..."
            rows={3}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800" />

        {/* Actions */}
        <div className="space-y-3">
          {/* Directions */}
          <button
            onClick={handleDirections}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </button>

          {/* Quick links row */}
          {(phone || website) && (
            <div className="flex items-center gap-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          )}

          {/* Remove */}
          {onRemove && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove from itinerary
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
