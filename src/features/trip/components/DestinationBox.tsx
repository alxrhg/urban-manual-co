'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock,
  Plane, Train, Building2, Navigation, ExternalLink,
  ImageOff, Coffee
} from 'lucide-react';
import Link from 'next/link';
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
  { value: 'must-do', label: 'Must do', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' },
  { value: 'want-to', label: 'Want to', color: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  { value: 'if-time', label: 'If time', color: 'bg-stone-50 text-stone-500 border-stone-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' },
];

const BOOKING_OPTIONS = [
  { value: 'need-to-book', label: 'Need to book' },
  { value: 'booked', label: 'Booked' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'walk-in', label: 'Walk-in' },
];

const TAG_OPTIONS = ['Romantic', 'Kid-friendly', 'Outdoor', 'Foodie', 'Photo spot', 'Local favorite'];

/**
 * DestinationBox - Clean sidebar design for item details
 */
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

  // Flight-specific fields
  const [editTerminal, setEditTerminal] = useState(item.parsedNotes?.terminal || '');
  const [editGate, setEditGate] = useState(item.parsedNotes?.gate || '');
  const [editSeat, setEditSeat] = useState(item.parsedNotes?.seatNumber || '');

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;

  // Coordinates for directions
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;

  const isPlace = itemType !== 'flight' && itemType !== 'train' && itemType !== 'hotel';
  const isHotel = itemType === 'hotel';
  const isFlight = itemType === 'flight';

  // Get type icon and label
  const getTypeInfo = () => {
    switch (itemType) {
      case 'flight':
        return { icon: Plane, label: 'Flight' };
      case 'train':
        return { icon: Train, label: 'Train' };
      case 'hotel':
        return { icon: Building2, label: 'Hotel' };
      default:
        return { icon: MapPin, label: category?.replace(/_/g, ' ') || 'Place' };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

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
    setEditTerminal(item.parsedNotes?.terminal || '');
    setEditGate(item.parsedNotes?.gate || '');
    setEditSeat(item.parsedNotes?.seatNumber || '');
    setImageError(false);
  }, [item.id]);

  // Save changes
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
      case 'terminal':
        updates.terminal = value as string;
        break;
      case 'gate':
        updates.gate = value as string;
        break;
      case 'seatNumber':
        updates.seatNumber = value as string;
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

  // Format time for display
  const formatDisplayTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes?.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-stone-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-stone-400 dark:text-gray-500 text-xs uppercase tracking-wide mb-1">
              <TypeIcon className="w-3.5 h-3.5" />
              <span>{typeInfo.label}</span>
            </div>
            <h3 className="font-semibold text-stone-900 dark:text-white text-lg leading-tight">
              {name}
            </h3>
            {category && !isFlight && (
              <p className="text-sm text-stone-500 dark:text-gray-400 capitalize mt-0.5">
                {category.replace(/_/g, ' ')}
              </p>
            )}
            {isFlight && parsedNotes?.airline && (
              <p className="text-sm text-stone-500 dark:text-gray-400 mt-0.5">
                {parsedNotes.airline} {parsedNotes.flightNumber || ''}
              </p>
            )}
          </div>
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

      {/* Hero Image (for places and hotels) */}
      {(isPlace || isHotel) && (
        <div className="px-4">
          <div className="relative h-44 w-full bg-stone-100 dark:bg-gray-800 rounded-xl overflow-hidden">
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
                <ImageOff className="w-10 h-10 text-stone-300 dark:text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Rating badge */}
            {rating && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-800/80 backdrop-blur-sm">
                <img src="/google-logo.svg" alt="Google" className="w-3.5 h-3.5" />
                <span className="text-sm font-medium text-white">{rating.toFixed(1)}</span>
              </div>
            )}

            {/* Title overlay */}
            <div className="absolute bottom-3 left-3 right-3">
              <h4 className="text-white font-semibold text-base">{name}</h4>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Action buttons */}
        {(website || (lat && lng)) && (
          <div className="flex gap-2">
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Website
              </a>
            )}
            {lat && lng && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 dark:border-gray-700 text-sm text-stone-700 dark:text-gray-300 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Directions
              </a>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-sm text-stone-600 dark:text-gray-400 leading-relaxed">
            {description}
          </p>
        )}

        {/* Info rows */}
        <div className="space-y-0">
          {/* Rating row */}
          {rating && (
            <div className="flex items-center justify-between py-3 border-t border-stone-100 dark:border-gray-800">
              <span className="text-sm text-stone-500 dark:text-gray-400">Rating</span>
              <div className="flex items-center gap-1">
                <img src="/google-logo.svg" alt="Google" className="w-4 h-4" />
                <span className="text-sm font-medium text-stone-900 dark:text-white">{rating.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Price row */}
          {priceLevel && priceLevel > 0 && (
            <div className="flex items-center justify-between py-3 border-t border-stone-100 dark:border-gray-800">
              <span className="text-sm text-stone-500 dark:text-gray-400">Price</span>
              <span className="text-sm font-medium text-stone-900 dark:text-white">
                {'$'.repeat(priceLevel)}
              </span>
            </div>
          )}

          {/* Address row */}
          {address && (
            <div className="flex items-start gap-2 py-3 border-t border-stone-100 dark:border-gray-800">
              <MapPin className="w-4 h-4 text-stone-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-stone-600 dark:text-gray-400">{address}</p>
            </div>
          )}
        </div>

        {/* ============ FLIGHT SECTION ============ */}
        {isFlight && (
          <div className="space-y-4">
            {/* Flight Route Display */}
            <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                {/* Departure */}
                <div>
                  <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">Departure</p>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white">
                    {parsedNotes?.from?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 truncate max-w-[80px]">
                    {parsedNotes?.from?.split(/[-–—]/)[1]?.trim() || ''}
                  </p>
                </div>

                {/* Flight path */}
                <div className="flex flex-col items-center px-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
                    <div className="w-8 h-px bg-stone-200 dark:bg-gray-700" />
                    <Plane className="w-4 h-4 text-stone-400 dark:text-gray-500" />
                    <div className="w-8 h-px bg-stone-200 dark:bg-gray-700" />
                    <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-gray-600" />
                  </div>
                </div>

                {/* Arrival */}
                <div className="text-right">
                  <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">Arrival</p>
                  <p className="text-2xl font-bold text-stone-900 dark:text-white">
                    {parsedNotes?.to?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-gray-400 truncate max-w-[80px]">
                    {parsedNotes?.to?.split(/[-–—]/)[1]?.trim() || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Flight Times */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Departure</label>
                <input
                  type="time"
                  value={editDepartureTime}
                  onChange={(e) => setEditDepartureTime(e.target.value)}
                  onBlur={() => saveChanges('departureTime', editDepartureTime)}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Arrival</label>
                <input
                  type="time"
                  value={editArrivalTime}
                  onChange={(e) => setEditArrivalTime(e.target.value)}
                  onBlur={() => saveChanges('arrivalTime', editArrivalTime)}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                />
              </div>
            </div>

            {/* Terminal, Gate, Seat */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Terminal</label>
                <input
                  type="text"
                  value={editTerminal}
                  onChange={(e) => setEditTerminal(e.target.value.toUpperCase())}
                  onBlur={() => saveChanges('terminal', editTerminal)}
                  placeholder="A"
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl text-center font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Gate</label>
                <input
                  type="text"
                  value={editGate}
                  onChange={(e) => setEditGate(e.target.value.toUpperCase())}
                  onBlur={() => saveChanges('gate', editGate)}
                  placeholder="B22"
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl text-center font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Seat</label>
                <input
                  type="text"
                  value={editSeat}
                  onChange={(e) => setEditSeat(e.target.value.toUpperCase())}
                  onBlur={() => saveChanges('seatNumber', editSeat)}
                  placeholder="12A"
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl text-center font-mono"
                />
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Confirmation #</label>
              <input
                type="text"
                value={editConfirmation}
                onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
                onBlur={() => saveChanges('confirmation', editConfirmation)}
                placeholder="Booking reference"
                className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl font-mono"
              />
            </div>
          </div>
        )}

        {/* ============ HOTEL SECTION ============ */}
        {isHotel && (
          <div className="space-y-4">
            {/* Your Stay Section */}
            <div className="pt-2">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-3">
                Your Stay
              </p>

              <div className="flex gap-3">
                {/* Check-in */}
                <div className="flex-1 bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                    Check-in
                  </p>
                  <p className="text-xl font-semibold text-stone-900 dark:text-white">
                    {editCheckInTime || '15:00'}
                  </p>
                </div>

                {/* Check-out */}
                <div className="flex-1 bg-stone-50 dark:bg-gray-800/50 rounded-xl p-3">
                  <p className="text-xs text-stone-400 dark:text-gray-500 uppercase tracking-wide mb-1">
                    Check-out
                  </p>
                  <p className="text-xl font-semibold text-stone-900 dark:text-white">
                    {editCheckOutTime || '11:00'}
                  </p>
                </div>
              </div>
            </div>

            {/* Hotel Times Edit */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Check-in</label>
                <input
                  type="time"
                  value={editCheckInTime}
                  onChange={(e) => setEditCheckInTime(e.target.value)}
                  onBlur={() => saveChanges('checkInTime', editCheckInTime)}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Check-out</label>
                <input
                  type="time"
                  value={editCheckOutTime}
                  onChange={(e) => setEditCheckOutTime(e.target.value)}
                  onBlur={() => saveChanges('checkOutTime', editCheckOutTime)}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                />
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Confirmation #</label>
              <input
                type="text"
                value={editConfirmation}
                onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
                onBlur={() => saveChanges('confirmation', editConfirmation)}
                placeholder="Booking reference"
                className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl font-mono"
              />
            </div>

            {/* Breakfast indicator */}
            {parsedNotes?.breakfastIncluded && (
              <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-gray-400 py-2">
                <Coffee className="w-4 h-4" />
                <span>Breakfast included</span>
                {parsedNotes.breakfastTime && (
                  <span className="text-stone-400">({parsedNotes.breakfastTime})</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============ PLACE SECTION ============ */}
        {isPlace && (
          <div className="space-y-4">
            {/* Priority badges */}
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const newValue = editPriority === opt.value ? '' : opt.value;
                    setEditPriority(newValue);
                    saveChanges('priority', newValue);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    editPriority === opt.value
                      ? opt.color
                      : 'bg-white dark:bg-gray-900 text-stone-400 border-stone-200 dark:border-gray-700 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Time and Duration */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Time</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  onBlur={() => saveChanges('time', editTime)}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Duration</label>
                <select
                  value={editDuration}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEditDuration(val);
                    saveChanges('duration', val);
                  }}
                  className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Booking status */}
            <div>
              <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Booking</label>
              <select
                value={editBookingStatus}
                onChange={(e) => {
                  setEditBookingStatus(e.target.value);
                  saveChanges('bookingStatus', e.target.value);
                }}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl"
              >
                <option value="">Not set</option>
                {BOOKING_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs text-stone-400 dark:text-gray-500 mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      editTags.includes(tag)
                        ? 'bg-stone-900 dark:bg-white text-white dark:text-gray-900 border-stone-900 dark:border-white'
                        : 'bg-white dark:bg-gray-900 text-stone-500 border-stone-200 dark:border-gray-700 hover:border-stone-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notes (all types) */}
        <div>
          <label className="text-xs text-stone-400 dark:text-gray-500 mb-1.5 block">Notes</label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            onBlur={() => saveChanges('notes', editNotes)}
            placeholder="Add a note..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl resize-none"
          />
        </div>

        {/* Directions button (if no action buttons shown above) */}
        {lat && lng && !website && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Directions
          </a>
        )}

        {/* View on Urban Manual link */}
        {destination?.slug && (
          <Link
            href={`/destinations/${destination.slug}`}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View on Urban Manual
          </Link>
        )}

        {/* Remove button */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="w-full py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Remove from itinerary
          </button>
        )}
      </div>
    </div>
  );
}
