'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock, ChevronRight,
  Plane, Train, Building2, Phone, Navigation, ExternalLink,
  Coffee, Pencil, Check, ImageOff
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

/**
 * DestinationBox - Sidebar with view/edit modes
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState(false);

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
  const neighborhood = destination?.neighborhood;
  const description = destination?.micro_description || destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const phone = parsedNotes?.phone || destination?.phone;
  const rating = destination?.rating;
  const priceLevel = destination?.price_level;

  // Coordinates for directions
  const lat = destination?.latitude || parsedNotes?.latitude;
  const lng = destination?.longitude || parsedNotes?.longitude;

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
    setEditTerminal(item.parsedNotes?.terminal || '');
    setEditGate(item.parsedNotes?.gate || '');
    setEditSeat(item.parsedNotes?.seatNumber || '');
    setIsEditing(false);
    setImageError(false);
  }, [item.id]);

  // Save all changes
  const saveChanges = () => {
    if (!onItemUpdate) return;

    const updates: Partial<ItineraryItemNotes> = {};

    if (itemType === 'flight') {
      if (editDepartureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = editDepartureTime;
      if (editArrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = editArrivalTime;
      if (editTerminal !== (item.parsedNotes?.terminal || '')) updates.terminal = editTerminal;
      if (editGate !== (item.parsedNotes?.gate || '')) updates.gate = editGate;
      if (editSeat !== (item.parsedNotes?.seatNumber || '')) updates.seatNumber = editSeat;
      if (editConfirmation !== (item.parsedNotes?.confirmationNumber || '')) updates.confirmationNumber = editConfirmation;
    } else if (itemType === 'hotel') {
      if (editCheckInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = editCheckInTime;
      if (editCheckOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = editCheckOutTime;
      if (editConfirmation !== (item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '')) {
        updates.confirmationNumber = editConfirmation;
        updates.hotelConfirmation = editConfirmation;
      }
    } else if (itemType === 'train') {
      if (editDepartureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = editDepartureTime;
      if (editArrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = editArrivalTime;
      if (editConfirmation !== (item.parsedNotes?.confirmationNumber || '')) updates.confirmationNumber = editConfirmation;
    } else {
      // Place
      if (editTime !== (item.time || '') && onTimeChange) {
        onTimeChange(item.id, editTime);
      }
      if (editDuration !== (item.parsedNotes?.duration || 60)) updates.duration = editDuration;
    }

    if (editNotes !== (item.parsedNotes?.notes || '')) updates.notes = editNotes;

    if (Object.keys(updates).length > 0) {
      onItemUpdate(item.id, updates);
    }

    setIsEditing(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    if (!time) return '—';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  // Get type icon and label
  const getTypeInfo = () => {
    switch (itemType) {
      case 'flight': return { icon: Plane, label: 'FLIGHT' };
      case 'hotel': return { icon: Building2, label: 'HOTEL' };
      case 'train': return { icon: Train, label: 'TRAIN' };
      default: return { icon: MapPin, label: category?.toUpperCase() || 'PLACE' };
    }
  };

  const { icon: TypeIcon, label: typeLabel } = getTypeInfo();

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TypeIcon className="w-4 h-4 text-gray-400" />
          <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{typeLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4 text-gray-400" />
            </button>
          ) : (
            <button
              onClick={saveChanges}
              className="px-3 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            >
              Done
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* ========== FLIGHT ========== */}
        {itemType === 'flight' && (
          <>
            {/* Ticket Display */}
            <div className="rounded-xl bg-stone-50 dark:bg-gray-800/60 p-4 ring-1 ring-stone-200/60 dark:ring-gray-700/50">
              {/* Route */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-stone-900 dark:text-white font-mono">
                    {parsedNotes?.from?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </span>
                  <div className="flex items-center gap-1 px-2">
                    <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                    <div className="w-6 h-px bg-stone-300 dark:bg-gray-600" />
                    <Plane className="w-3.5 h-3.5 text-stone-400 dark:text-gray-500" />
                    <div className="w-6 h-px bg-stone-300 dark:bg-gray-600" />
                    <div className="w-1 h-1 rounded-full bg-stone-300 dark:bg-gray-600" />
                  </div>
                  <span className="text-2xl font-semibold text-stone-900 dark:text-white font-mono">
                    {parsedNotes?.to?.split(/[-–—]/)[0]?.trim().toUpperCase().slice(0, 3) || '---'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  Confirmed
                </span>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-dashed border-stone-200 dark:border-gray-700 my-3" />

              {/* Times */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Depart</p>
                  <p className="text-lg font-semibold text-stone-900 dark:text-white font-mono">
                    {editDepartureTime ? formatTime(editDepartureTime) : '--:--'}
                  </p>
                </div>
                <p className="text-[9px] text-stone-400 dark:text-gray-500 pb-1">Nonstop</p>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-stone-400 dark:text-gray-500">Arrive</p>
                  <p className="text-lg font-semibold text-stone-900 dark:text-white font-mono">
                    {editArrivalTime ? formatTime(editArrivalTime) : '--:--'}
                  </p>
                </div>
              </div>

              {/* Airline & Details */}
              <div className="mt-3 pt-2 border-t border-stone-100 dark:border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-stone-600 dark:text-gray-400">
                    {parsedNotes?.airline || 'Airline'}
                  </span>
                  <span className="text-xs text-stone-400 dark:text-gray-500 font-mono">
                    {parsedNotes?.flightNumber || ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-stone-400 dark:text-gray-500 font-mono">
                  {editTerminal && <span>T{editTerminal}</span>}
                  {editGate && <span>Gate {editGate}</span>}
                  {editSeat && <span>{editSeat}</span>}
                </div>
              </div>
            </div>

            {/* View Mode Details */}
            {!isEditing && (
              <div className="space-y-2">
                {editConfirmation && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500">Confirmation</span>
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{editConfirmation}</span>
                  </div>
                )}
                {editNotes && (
                  <div className="py-2">
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{editNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Departure</label>
                    <input
                      type="time"
                      value={editDepartureTime}
                      onChange={(e) => setEditDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Arrival</label>
                    <input
                      type="time"
                      value={editArrivalTime}
                      onChange={(e) => setEditArrivalTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="w-20">
                    <label className="text-[10px] text-gray-400 mb-1 block">Terminal</label>
                    <input
                      type="text"
                      value={editTerminal}
                      onChange={(e) => setEditTerminal(e.target.value.toUpperCase())}
                      placeholder="A"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Gate</label>
                    <input
                      type="text"
                      value={editGate}
                      onChange={(e) => setEditGate(e.target.value.toUpperCase())}
                      placeholder="B22"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-[10px] text-gray-400 mb-1 block">Seat</label>
                    <input
                      type="text"
                      value={editSeat}
                      onChange={(e) => setEditSeat(e.target.value.toUpperCase())}
                      placeholder="12A"
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Confirmation #</label>
                  <input
                    type="text"
                    value={editConfirmation}
                    onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== HOTEL ========== */}
        {itemType === 'hotel' && (
          <>
            {/* Hotel Image */}
            {image && !imageError && (
              <div className="relative h-40 rounded-xl overflow-hidden bg-stone-200 dark:bg-gray-700">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={image.includes('googleusercontent.com') || image.includes('maps.googleapis.com')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {rating && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-semibold text-white">{rating.toFixed(1)}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="font-semibold text-white text-base">{name}</h4>
                  {neighborhood && <p className="text-sm text-white/80 mt-0.5">{neighborhood}</p>}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {(phone || website || (lat && lng)) && (
              <div className="flex gap-2">
                {phone && (
                  <a href={`tel:${phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Call</span>
                  </a>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</span>
                  </a>
                )}
                {lat && lng && (
                  <a href={`https://maps.apple.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Directions</span>
                  </a>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
            )}

            {/* Stay Info - View Mode */}
            {!isEditing && (
              <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-gray-500 mb-3">Your Stay</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-1">Check-in</p>
                    <p className="text-lg font-bold text-stone-900 dark:text-white">{editCheckInTime ? formatTime(editCheckInTime) : '3:00 PM'}</p>
                    {parsedNotes?.checkInDate && (
                      <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                        {new Date(parsedNotes.checkInDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3">
                    <p className="text-[10px] text-stone-500 dark:text-gray-400 uppercase tracking-wide mb-1">Check-out</p>
                    <p className="text-lg font-bold text-stone-900 dark:text-white">{editCheckOutTime ? formatTime(editCheckOutTime) : '11:00 AM'}</p>
                    {parsedNotes?.checkOutDate && (
                      <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                        {new Date(parsedNotes.checkOutDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                {(parsedNotes?.roomType || editConfirmation) && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-stone-200 dark:border-gray-700">
                    {parsedNotes?.roomType && (
                      <div>
                        <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide">Room</p>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{parsedNotes.roomType}</p>
                      </div>
                    )}
                    {editConfirmation && (
                      <div>
                        <p className="text-[10px] text-stone-400 dark:text-gray-500 uppercase tracking-wide">Confirmation</p>
                        <p className="text-xs font-mono font-medium text-stone-700 dark:text-gray-300">{editConfirmation}</p>
                      </div>
                    )}
                  </div>
                )}

                {parsedNotes?.breakfastIncluded && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-stone-600 dark:text-gray-400">
                    <Coffee className="w-3.5 h-3.5" />
                    Breakfast included
                  </div>
                )}

                {editNotes && (
                  <div className="mt-3 pt-3 border-t border-stone-200 dark:border-gray-700">
                    <p className="text-xs text-stone-500 mb-1">Notes</p>
                    <p className="text-sm text-stone-700 dark:text-gray-300">{editNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Check-in Time</label>
                    <input
                      type="time"
                      value={editCheckInTime}
                      onChange={(e) => setEditCheckInTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Check-out Time</label>
                    <input
                      type="time"
                      value={editCheckOutTime}
                      onChange={(e) => setEditCheckOutTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Confirmation #</label>
                  <input
                    type="text"
                    value={editConfirmation}
                    onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
                    placeholder="Booking reference"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
                  />
                </div>
              </div>
            )}

            {/* View on Urban Manual */}
            {destination?.slug && (
              <Link
                href={`/destination/${destination.slug}`}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Urban Manual
              </Link>
            )}
          </>
        )}

        {/* ========== TRAIN ========== */}
        {itemType === 'train' && (
          <>
            {/* Route Display */}
            <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-gray-800 rounded-xl">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.from || '—'}</p>
                <p className="text-xs text-gray-500">{editDepartureTime ? formatTime(editDepartureTime) : '—'}</p>
              </div>
              <div className="flex items-center gap-2 px-3">
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
                <Train className="w-4 h-4 text-gray-400" />
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{parsedNotes?.to || '—'}</p>
                <p className="text-xs text-gray-500">{editArrivalTime ? formatTime(editArrivalTime) : '—'}</p>
              </div>
            </div>

            {/* View Mode Details */}
            {!isEditing && (
              <div className="space-y-2">
                {editConfirmation && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-gray-500">Confirmation</span>
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">{editConfirmation}</span>
                  </div>
                )}
                {editNotes && (
                  <div className="py-2">
                    <p className="text-sm text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{editNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Departs</label>
                    <input
                      type="time"
                      value={editDepartureTime}
                      onChange={(e) => setEditDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Arrives</label>
                    <input
                      type="time"
                      value={editArrivalTime}
                      onChange={(e) => setEditArrivalTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Confirmation #</label>
                  <input
                    type="text"
                    value={editConfirmation}
                    onChange={(e) => setEditConfirmation(e.target.value.toUpperCase())}
                    placeholder="Booking reference"
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== PLACE / RESTAURANT ========== */}
        {itemType !== 'flight' && itemType !== 'hotel' && itemType !== 'train' && (
          <>
            {/* Image */}
            {image && !imageError && (
              <div className="relative h-40 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image
                  src={image}
                  alt={name}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                  unoptimized={image.includes('googleusercontent.com') || image.includes('maps.googleapis.com')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="font-semibold text-white text-base">{name}</h4>
                  {category && <p className="text-sm text-white/80 capitalize">{category}</p>}
                </div>
              </div>
            )}

            {/* No Image Fallback */}
            {(!image || imageError) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white text-base">{name}</h4>
                {category && <p className="text-sm text-gray-500 capitalize mt-0.5">{category}</p>}
              </div>
            )}

            {/* Quick Actions */}
            {(phone || website || (lat && lng)) && (
              <div className="flex gap-2">
                {phone && (
                  <a href={`tel:${phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Call</span>
                  </a>
                )}
                {website && (
                  <a href={website} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Website</span>
                  </a>
                )}
                {lat && lng && (
                  <a href={`https://maps.apple.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Directions</span>
                  </a>
                )}
              </div>
            )}

            {/* Info */}
            <div className="space-y-2">
              {(rating || priceLevel) && (
                <div className="flex items-center gap-3 text-sm">
                  {rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-gray-900 dark:text-white">{rating.toFixed(1)}</span>
                    </div>
                  )}
                  {priceLevel && priceLevel > 0 && (
                    <span className="text-gray-400">{'$'.repeat(priceLevel)}</span>
                  )}
                  {neighborhood && <span className="text-gray-400">· {neighborhood}</span>}
                </div>
              )}

              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
              )}

              {address && (
                <div className="flex items-start gap-2 pt-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-500">{address}</span>
                </div>
              )}
            </div>

            {/* View Mode Details */}
            {!isEditing && (
              <div className="bg-stone-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                {editTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Time</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatTime(editTime)}</span>
                  </div>
                )}
                {editDuration && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Duration</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {DURATION_OPTIONS.find(d => d.value === editDuration)?.label || `${editDuration} min`}
                    </span>
                  </div>
                )}
                {editNotes && (
                  <div className="pt-2 border-t border-stone-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{editNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 mb-1 block">Time</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-[10px] text-gray-400 mb-1 block">Duration</label>
                    <select
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg"
                    >
                      {DURATION_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 mb-1 block">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border-0 rounded-lg resize-none"
                  />
                </div>
              </div>
            )}

            {/* View on Urban Manual */}
            {destination?.slug && (
              <Link
                href={`/destination/${destination.slug}`}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Urban Manual
              </Link>
            )}
          </>
        )}

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="w-full py-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Remove from itinerary
          </button>
        )}
      </div>
    </div>
  );
}
