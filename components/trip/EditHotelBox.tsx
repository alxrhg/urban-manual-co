'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Hotel, X, Calendar, Star, Phone, Globe, MapPin, Loader2, Coffee, Utensils, Bed, Waves, Dumbbell } from 'lucide-react';
import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';

interface EditHotelBoxProps {
  item: EnrichedItineraryItem;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onSave?: (updates: HotelUpdates) => void;
  onDelete?: () => void;
  onClose?: () => void;
  className?: string;
}

interface HotelUpdates {
  checkInDate?: string;
  checkOutDate?: string;
  confirmationNumber?: string;
  nightStart?: number;
  nightEnd?: number;
  breakfastIncluded?: boolean;
  hasSpa?: boolean;
  hasPool?: boolean;
  hasGym?: boolean;
  notes?: string;
}

/**
 * EditHotelBox - Inline hotel editing component
 * Allows editing check-in/check-out dates, confirmation, amenities
 */
export default function EditHotelBox({
  item,
  tripStartDate,
  tripEndDate,
  onSave,
  onDelete,
  onClose,
  className = '',
}: EditHotelBoxProps) {
  const parsedNotes = item.parsedNotes || {};

  const [checkInDate, setCheckInDate] = useState(parsedNotes.checkInDate || '');
  const [checkOutDate, setCheckOutDate] = useState(parsedNotes.checkOutDate || '');
  const [confirmationNumber, setConfirmationNumber] = useState(parsedNotes.hotelConfirmation || parsedNotes.confirmationNumber || '');
  const [breakfastIncluded, setBreakfastIncluded] = useState(parsedNotes.breakfastIncluded || false);
  const [hasSpa, setHasSpa] = useState(parsedNotes.hasSpa || false);
  const [hasPool, setHasPool] = useState(parsedNotes.hasPool || false);
  const [hasGym, setHasGym] = useState(parsedNotes.hasGym || false);
  const [notes, setNotes] = useState(parsedNotes.notes || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get hotel image from parsedNotes or destination
  const hotelImage = parsedNotes.image || item.destination?.image || item.destination?.image_thumbnail;
  const hotelRating = parsedNotes.rating ?? item.destination?.rating;
  const hotelPriceLevel = parsedNotes.priceLevel ?? item.destination?.price_level;
  const hotelAddress = parsedNotes.address || item.destination?.formatted_address;
  const hotelPhone = parsedNotes.phone || item.destination?.phone_number;
  const hotelWebsite = parsedNotes.website || item.destination?.website;

  // Calculate nights
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return null;
    try {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : null;
    } catch {
      return null;
    }
  };

  const nights = calculateNights();

  const handleSave = async () => {
    if (!onSave) return;

    setSaving(true);

    // Calculate night numbers based on dates
    let nightStart: number | undefined;
    let nightEnd: number | undefined;

    if (tripStartDate && checkInDate) {
      const tripStart = new Date(tripStartDate);
      const checkIn = new Date(checkInDate);
      nightStart = Math.floor((checkIn.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    if (tripStartDate && checkOutDate) {
      const tripStart = new Date(tripStartDate);
      const checkOut = new Date(checkOutDate);
      nightEnd = Math.floor((checkOut.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24));
    }

    try {
      await onSave({
        checkInDate,
        checkOutDate,
        confirmationNumber,
        nightStart,
        nightEnd,
        breakfastIncluded,
        hasSpa,
        hasPool,
        hasGym,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`border border-stone-200 dark:border-gray-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hotel className="w-4 h-4 text-stone-400" />
          <h3 className="text-sm font-medium text-stone-900 dark:text-white">
            Edit Hotel
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Hotel Preview */}
        <div className="flex items-start gap-3">
          {hotelImage ? (
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={hotelImage}
                alt={item.title || 'Hotel'}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
              <Hotel className="w-6 h-6 text-stone-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-stone-900 dark:text-white">
              {item.title || parsedNotes.name || 'Accommodation'}
            </h4>
            {hotelAddress && (
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5 line-clamp-2 flex items-start gap-1">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {hotelAddress}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {hotelRating && (
                <span className="flex items-center gap-0.5 text-xs text-stone-500">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  {hotelRating}
                </span>
              )}
              {hotelPriceLevel && (
                <span className="text-xs text-stone-500">
                  {'$'.repeat(hotelPriceLevel)}
                </span>
              )}
              {hotelPhone && (
                <a href={`tel:${hotelPhone}`} className="text-stone-400 hover:text-stone-600">
                  <Phone className="w-3 h-3" />
                </a>
              )}
              {hotelWebsite && (
                <a href={hotelWebsite} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-600">
                  <Globe className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
              Check-in
            </label>
            <input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              min={tripStartDate || undefined}
              max={tripEndDate || undefined}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
              Check-out
            </label>
            <input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              min={checkInDate || tripStartDate || undefined}
              max={tripEndDate || undefined}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
            />
          </div>
        </div>

        {nights && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{nights} {nights === 1 ? 'night' : 'nights'}</span>
          </div>
        )}

        {/* Confirmation Number */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Confirmation Number
          </label>
          <input
            type="text"
            value={confirmationNumber}
            onChange={(e) => setConfirmationNumber(e.target.value)}
            placeholder="e.g. ABC123XYZ"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600"
          />
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-2">
            Amenities & Inclusions
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBreakfastIncluded(!breakfastIncluded)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                breakfastIncluded
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400'
              }`}
            >
              <Coffee className="w-3 h-3" />
              Breakfast
            </button>
            <button
              type="button"
              onClick={() => setHasPool(!hasPool)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                hasPool
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400'
              }`}
            >
              <Waves className="w-3 h-3" />
              Pool
            </button>
            <button
              type="button"
              onClick={() => setHasGym(!hasGym)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                hasGym
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400'
              }`}
            >
              <Dumbbell className="w-3 h-3" />
              Gym
            </button>
            <button
              type="button"
              onClick={() => setHasSpa(!hasSpa)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                hasSpa
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                  : 'bg-stone-100 dark:bg-gray-800 text-stone-500 dark:text-gray-400'
              }`}
            >
              <Bed className="w-3 h-3" />
              Spa
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-stone-500 dark:text-gray-400 mb-1.5">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Room preferences, special requests..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-stone-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 dark:focus:ring-gray-600 resize-none"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-full bg-stone-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>

        {/* Delete Section */}
        {onDelete && (
          <div className="pt-3 border-t border-stone-100 dark:border-gray-800">
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-xs text-stone-500 dark:text-gray-400">
                  Remove this hotel from the trip?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 rounded-full border border-stone-200 dark:border-gray-700 text-xs font-medium text-stone-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onDelete}
                    className="flex-1 py-2 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-xs text-red-500 hover:text-red-600 transition-colors py-2"
              >
                Remove Hotel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
