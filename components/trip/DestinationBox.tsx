'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X, MapPin, Star, Globe, Clock, ChevronDown, ExternalLink,
  Pencil, Check, Trash2, StickyNote, Plane, Train, Building2,
  Calendar, Phone, Ticket, Coffee, Users, BedDouble
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

const CATEGORIES = ['Restaurant', 'Cafe', 'Bar', 'Museum', 'Gallery', 'Shopping', 'Hotel', 'Landmark', 'Park', 'Other'];

/**
 * DestinationBox - Inline destination details component with full edit mode
 * Adapts edit fields based on item type (place, flight, hotel, train)
 */
export default function DestinationBox({
  item,
  onClose,
  onTimeChange,
  onNotesChange,
  onItemUpdate,
  onRemove,
  className = '',
}: DestinationBoxProps) {
  const [showMore, setShowMore] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Common fields
  const [editTime, setEditTime] = useState(item.time || '');
  const [editNotes, setEditNotes] = useState(item.parsedNotes?.notes || item.parsedNotes?.raw || '');
  const [editCategory, setEditCategory] = useState(item.parsedNotes?.category || item.destination?.category || '');

  // Reservation fields
  const [editConfirmation, setEditConfirmation] = useState(item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '');
  const [editPhone, setEditPhone] = useState(item.parsedNotes?.phone || '');
  const [editPartySize, setEditPartySize] = useState(item.parsedNotes?.partySize?.toString() || '');

  // Flight fields
  const [editAirline, setEditAirline] = useState(item.parsedNotes?.airline || '');
  const [editFlightNumber, setEditFlightNumber] = useState(item.parsedNotes?.flightNumber || '');
  const [editFrom, setEditFrom] = useState(item.parsedNotes?.from || '');
  const [editTo, setEditTo] = useState(item.parsedNotes?.to || '');
  const [editDepartureDate, setEditDepartureDate] = useState(item.parsedNotes?.departureDate || '');
  const [editDepartureTime, setEditDepartureTime] = useState(item.parsedNotes?.departureTime || '');
  const [editArrivalDate, setEditArrivalDate] = useState(item.parsedNotes?.arrivalDate || '');
  const [editArrivalTime, setEditArrivalTime] = useState(item.parsedNotes?.arrivalTime || '');

  // Train fields
  const [editTrainLine, setEditTrainLine] = useState(item.parsedNotes?.trainLine || '');
  const [editTrainNumber, setEditTrainNumber] = useState(item.parsedNotes?.trainNumber || '');

  // Hotel fields
  const [editCheckInDate, setEditCheckInDate] = useState(item.parsedNotes?.checkInDate || '');
  const [editCheckOutDate, setEditCheckOutDate] = useState(item.parsedNotes?.checkOutDate || '');
  const [editCheckInTime, setEditCheckInTime] = useState(item.parsedNotes?.checkInTime || '');
  const [editCheckOutTime, setEditCheckOutTime] = useState(item.parsedNotes?.checkOutTime || '');
  const [editBreakfastIncluded, setEditBreakfastIncluded] = useState(item.parsedNotes?.breakfastIncluded || false);

  const destination = item.destination;
  const parsedNotes = item.parsedNotes;
  const itemType = parsedNotes?.type || 'place';

  const name = item.title || destination?.name || 'Place';
  const image = destination?.image || destination?.image_thumbnail || parsedNotes?.image;
  const category = destination?.category || parsedNotes?.category;
  const neighborhood = destination?.neighborhood;
  const description = destination?.description;
  const address = destination?.formatted_address || parsedNotes?.address;
  const website = destination?.website || parsedNotes?.website;
  const rating = destination?.rating;
  const reviewCount = destination?.user_ratings_total;
  const priceLevel = destination?.price_level;
  const michelinStars = destination?.michelin_stars;

  // Reset edit state when item changes
  useEffect(() => {
    setEditTime(item.time || '');
    setEditNotes(item.parsedNotes?.notes || item.parsedNotes?.raw || '');
    setEditCategory(item.parsedNotes?.category || item.destination?.category || '');
    setEditConfirmation(item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '');
    setIsEditing(false);
  }, [item.id]);

  const handleSave = () => {
    // Update time
    if (onTimeChange && editTime !== item.time) {
      onTimeChange(item.id, editTime);
    }

    // Update notes
    if (onNotesChange && editNotes !== (item.parsedNotes?.notes || item.parsedNotes?.raw || '')) {
      onNotesChange(item.id, editNotes);
    }

    // Update other fields via onItemUpdate
    if (onItemUpdate) {
      const updates: Partial<ItineraryItemNotes> = {};

      if (editCategory !== (item.parsedNotes?.category || '')) {
        updates.category = editCategory;
      }
      if (editConfirmation !== (item.parsedNotes?.confirmationNumber || item.parsedNotes?.hotelConfirmation || '')) {
        updates.confirmationNumber = editConfirmation;
        updates.hotelConfirmation = editConfirmation;
      }
      if (editPhone !== (item.parsedNotes?.phone || '')) {
        updates.phone = editPhone;
      }

      // Flight-specific updates
      if (itemType === 'flight') {
        if (editAirline !== (item.parsedNotes?.airline || '')) updates.airline = editAirline;
        if (editFlightNumber !== (item.parsedNotes?.flightNumber || '')) updates.flightNumber = editFlightNumber;
        if (editFrom !== (item.parsedNotes?.from || '')) updates.from = editFrom;
        if (editTo !== (item.parsedNotes?.to || '')) updates.to = editTo;
        if (editDepartureDate !== (item.parsedNotes?.departureDate || '')) updates.departureDate = editDepartureDate;
        if (editDepartureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = editDepartureTime;
        if (editArrivalDate !== (item.parsedNotes?.arrivalDate || '')) updates.arrivalDate = editArrivalDate;
        if (editArrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = editArrivalTime;
      }

      // Train-specific updates
      if (itemType === 'train') {
        if (editTrainLine !== (item.parsedNotes?.trainLine || '')) updates.trainLine = editTrainLine;
        if (editTrainNumber !== (item.parsedNotes?.trainNumber || '')) updates.trainNumber = editTrainNumber;
        if (editFrom !== (item.parsedNotes?.from || '')) updates.from = editFrom;
        if (editTo !== (item.parsedNotes?.to || '')) updates.to = editTo;
        if (editDepartureDate !== (item.parsedNotes?.departureDate || '')) updates.departureDate = editDepartureDate;
        if (editDepartureTime !== (item.parsedNotes?.departureTime || '')) updates.departureTime = editDepartureTime;
        if (editArrivalTime !== (item.parsedNotes?.arrivalTime || '')) updates.arrivalTime = editArrivalTime;
      }

      // Hotel-specific updates
      if (itemType === 'hotel') {
        if (editCheckInDate !== (item.parsedNotes?.checkInDate || '')) updates.checkInDate = editCheckInDate;
        if (editCheckOutDate !== (item.parsedNotes?.checkOutDate || '')) updates.checkOutDate = editCheckOutDate;
        if (editCheckInTime !== (item.parsedNotes?.checkInTime || '')) updates.checkInTime = editCheckInTime;
        if (editCheckOutTime !== (item.parsedNotes?.checkOutTime || '')) updates.checkOutTime = editCheckOutTime;
        if (editBreakfastIncluded !== (item.parsedNotes?.breakfastIncluded || false)) updates.breakfastIncluded = editBreakfastIncluded;
      }

      if (Object.keys(updates).length > 0) {
        onItemUpdate(item.id, updates);
      }
    }

    setIsEditing(false);
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(item.id);
      onClose?.();
    }
  };

  // Get type icon and color
  const getTypeInfo = () => {
    switch (itemType) {
      case 'flight':
        return { icon: Plane, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Flight' };
      case 'train':
        return { icon: Train, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Train' };
      case 'hotel':
        return { icon: Building2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Hotel' };
      default:
        return { icon: MapPin, color: 'text-stone-500', bg: 'bg-stone-50 dark:bg-gray-800', label: 'Place' };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg ${typeInfo.bg}`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-stone-900 dark:text-white truncate">
              {name}
            </h3>
            <span className="text-[10px] text-stone-400 dark:text-gray-500">{typeInfo.label}</span>
          </div>
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
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Image (for places/hotels) */}
        {image && itemType !== 'flight' && itemType !== 'train' && (
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

        {/* === FLIGHT EDIT FIELDS === */}
        {itemType === 'flight' && (
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Airline</label>
                    <input
                      type="text"
                      value={editAirline}
                      onChange={(e) => setEditAirline(e.target.value)}
                      placeholder="e.g., United"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Flight #</label>
                    <input
                      type="text"
                      value={editFlightNumber}
                      onChange={(e) => setEditFlightNumber(e.target.value)}
                      placeholder="e.g., UA123"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">From</label>
                    <input
                      type="text"
                      value={editFrom}
                      onChange={(e) => setEditFrom(e.target.value)}
                      placeholder="e.g., JFK"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">To</label>
                    <input
                      type="text"
                      value={editTo}
                      onChange={(e) => setEditTo(e.target.value)}
                      placeholder="e.g., CDG"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Date</label>
                    <input
                      type="date"
                      value={editDepartureDate}
                      onChange={(e) => setEditDepartureDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure Time</label>
                    <input
                      type="time"
                      value={editDepartureTime}
                      onChange={(e) => setEditDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival Date</label>
                    <input
                      type="date"
                      value={editArrivalDate}
                      onChange={(e) => setEditArrivalDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival Time</label>
                    <input
                      type="time"
                      value={editArrivalTime}
                      onChange={(e) => setEditArrivalTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Flight route display */}
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-stone-900 dark:text-white">{parsedNotes?.from || '---'}</p>
                    <p className="text-xs text-stone-500">{parsedNotes?.departureTime || '--:--'}</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-4">
                    <div className="flex-1 h-px bg-stone-300 dark:bg-gray-600" />
                    <Plane className="w-4 h-4 mx-2 text-blue-500" />
                    <div className="flex-1 h-px bg-stone-300 dark:bg-gray-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-stone-900 dark:text-white">{parsedNotes?.to || '---'}</p>
                    <p className="text-xs text-stone-500">{parsedNotes?.arrivalTime || '--:--'}</p>
                  </div>
                </div>
                {parsedNotes?.departureDate && (
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{parsedNotes.departureDate}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === TRAIN EDIT FIELDS === */}
        {itemType === 'train' && (
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Train Line</label>
                    <input
                      type="text"
                      value={editTrainLine}
                      onChange={(e) => setEditTrainLine(e.target.value)}
                      placeholder="e.g., Eurostar"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Train #</label>
                    <input
                      type="text"
                      value={editTrainNumber}
                      onChange={(e) => setEditTrainNumber(e.target.value)}
                      placeholder="e.g., 9001"
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">From</label>
                    <input
                      type="text"
                      value={editFrom}
                      onChange={(e) => setEditFrom(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">To</label>
                    <input
                      type="text"
                      value={editTo}
                      onChange={(e) => setEditTo(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Departure</label>
                    <input
                      type="time"
                      value={editDepartureTime}
                      onChange={(e) => setEditDepartureTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Arrival</label>
                    <input
                      type="time"
                      value={editArrivalTime}
                      onChange={(e) => setEditArrivalTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Train route display */}
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">{parsedNotes?.from || '---'}</p>
                    <p className="text-xs text-stone-500">{parsedNotes?.departureTime || '--:--'}</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center px-4">
                    <div className="flex-1 h-px bg-stone-300 dark:bg-gray-600" />
                    <Train className="w-4 h-4 mx-2 text-orange-500" />
                    <div className="flex-1 h-px bg-stone-300 dark:bg-gray-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-stone-900 dark:text-white">{parsedNotes?.to || '---'}</p>
                    <p className="text-xs text-stone-500">{parsedNotes?.arrivalTime || '--:--'}</p>
                  </div>
                </div>
                {parsedNotes?.trainLine && (
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Train className="w-3.5 h-3.5" />
                    <span>{parsedNotes.trainLine} {parsedNotes.trainNumber}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* === HOTEL EDIT FIELDS === */}
        {itemType === 'hotel' && (
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Check-in Date</label>
                    <input
                      type="date"
                      value={editCheckInDate}
                      onChange={(e) => setEditCheckInDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Check-in Time</label>
                    <input
                      type="time"
                      value={editCheckInTime}
                      onChange={(e) => setEditCheckInTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Check-out Date</label>
                    <input
                      type="date"
                      value={editCheckOutDate}
                      onChange={(e) => setEditCheckOutDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Check-out Time</label>
                    <input
                      type="time"
                      value={editCheckOutTime}
                      onChange={(e) => setEditCheckOutTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editBreakfastIncluded}
                    onChange={(e) => setEditBreakfastIncluded(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300"
                  />
                  <Coffee className="w-4 h-4 text-stone-400" />
                  <span className="text-sm text-stone-700 dark:text-gray-300">Breakfast included</span>
                </label>
              </>
            ) : (
              <>
                {/* Hotel stay display */}
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl space-y-2">
                  {(parsedNotes?.checkInDate || parsedNotes?.checkOutDate) && (
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="text-stone-500">Check-in</p>
                        <p className="font-medium text-stone-900 dark:text-white">
                          {parsedNotes?.checkInDate || '---'} {parsedNotes?.checkInTime && `at ${parsedNotes.checkInTime}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500">Check-out</p>
                        <p className="font-medium text-stone-900 dark:text-white">
                          {parsedNotes?.checkOutDate || '---'} {parsedNotes?.checkOutTime && `at ${parsedNotes.checkOutTime}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {parsedNotes?.breakfastIncluded && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <Coffee className="w-3.5 h-3.5" />
                      <span>Breakfast included</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* === PLACE FIELDS (category, rating, etc) === */}
        {(itemType === 'place' || itemType === 'breakfast' || !itemType) && (
          <>
            {/* Category & Neighborhood */}
            {isEditing ? (
              <div>
                <label className="block text-xs text-stone-500 dark:text-gray-400 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            ) : (
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
            )}

            {/* Rating & Price (view only) */}
            {!isEditing && (rating || priceLevel) && (
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

            {/* Description (view only) */}
            {!isEditing && description && (
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
          </>
        )}

        {/* Address (view only) */}
        {!isEditing && address && (
          <div className="flex items-start gap-2 text-xs text-stone-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{address}</p>
          </div>
        )}

        {/* === COMMON EDITABLE FIELDS === */}

        {/* Scheduled Time */}
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

        {/* Reservation Info */}
        <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <Ticket className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs font-medium text-stone-500 dark:text-gray-400">Reservation Info</span>
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editConfirmation}
                onChange={(e) => setEditConfirmation(e.target.value)}
                placeholder="Confirmation number"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
              />
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
              />
              {(itemType === 'place' || !itemType) && (
                <input
                  type="number"
                  value={editPartySize}
                  onChange={(e) => setEditPartySize(e.target.value)}
                  placeholder="Party size"
                  min="1"
                  className="w-full px-3 py-2 rounded-lg bg-stone-50 dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-sm"
                />
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {(parsedNotes?.confirmationNumber || parsedNotes?.hotelConfirmation) ? (
                <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-300">
                  <span className="font-mono">{parsedNotes?.confirmationNumber || parsedNotes?.hotelConfirmation}</span>
                </div>
              ) : null}
              {parsedNotes?.phone && (
                <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-300">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{parsedNotes.phone}</span>
                </div>
              )}
              {parsedNotes?.partySize && (
                <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-gray-300">
                  <Users className="w-3.5 h-3.5 text-stone-400" />
                  <span>{parsedNotes.partySize} guests</span>
                </div>
              )}
              {!parsedNotes?.confirmationNumber && !parsedNotes?.hotelConfirmation && !parsedNotes?.phone && (
                <p className="text-sm text-stone-400 dark:text-gray-500 italic">No reservation info</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
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

        {/* Links (view only) */}
        {!isEditing && website && (
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
