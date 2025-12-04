'use client';

import { useState } from 'react';
import {
  MapPin,
  Clock,
  Phone,
  Globe,
  DollarSign,
  ExternalLink,
  Navigation,
  ChevronDown,
  ChevronUp,
  Instagram,
  Calendar,
} from 'lucide-react';
import { PRICE_LEVEL } from '@/lib/constants';

interface OpeningHours {
  weekday_text?: string[];
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
}

interface StructuredInfoProps {
  address?: string | null;
  vicinity?: string | null;
  phone?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  priceLevel?: number | null;
  openingHours?: OpeningHours | null;
  latitude?: number | null;
  longitude?: number | null;
  bookingUrl?: string | null;
  resyUrl?: string | null;
  opentableUrl?: string | null;
}

export function StructuredInfo({
  address,
  vicinity,
  phone,
  website,
  instagramUrl,
  priceLevel,
  openingHours,
  latitude,
  longitude,
  bookingUrl,
  resyUrl,
  opentableUrl,
}: StructuredInfoProps) {
  const [showAllHours, setShowAllHours] = useState(false);

  const displayAddress = address || vicinity;
  const hasReservation = bookingUrl || resyUrl || opentableUrl;
  const hasContactInfo = phone || website || instagramUrl;
  const hasLocation = displayAddress || (latitude && longitude);

  if (!hasLocation && !hasContactInfo && !priceLevel && !openingHours && !hasReservation) {
    return null;
  }

  // Get current day status
  const getCurrentDayStatus = () => {
    if (!openingHours?.weekday_text) return null;
    const today = new Date().getDay();
    // weekday_text starts with Monday (index 0), but JS getDay() starts with Sunday (0)
    const dayIndex = today === 0 ? 6 : today - 1;
    const todayText = openingHours.weekday_text[dayIndex];
    if (!todayText) return null;

    const [, hours] = todayText.split(': ');
    return hours;
  };

  const todayHours = getCurrentDayStatus();
  const isOpen = openingHours?.open_now;

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
      {/* Grid of info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-800">
        {/* Location */}
        {hasLocation && (
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Location
                </h3>
                {displayAddress && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {displayAddress}
                  </p>
                )}
                {latitude && longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Navigation className="w-3 h-3" />
                    Get Directions
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Price Level */}
        {priceLevel && (
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Price Range
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">
                    {PRICE_LEVEL.LABELS[priceLevel as keyof typeof PRICE_LEVEL.LABELS]}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    {priceLevel === 1 && '(Budget-friendly)'}
                    {priceLevel === 2 && '(Moderate)'}
                    {priceLevel === 3 && '(Upscale)'}
                    {priceLevel === 4 && '(Fine Dining)'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Opening Hours */}
      {openingHours?.weekday_text && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Hours
                </h3>
                {typeof isOpen === 'boolean' && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isOpen
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isOpen ? 'Open now' : 'Closed'}
                  </span>
                )}
              </div>

              {/* Today's hours */}
              {todayHours && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="font-medium">Today:</span> {todayHours}
                </p>
              )}

              {/* Full schedule toggle */}
              <button
                onClick={() => setShowAllHours(!showAllHours)}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showAllHours ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide full schedule
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show full schedule
                  </>
                )}
              </button>

              {/* Full schedule */}
              {showAllHours && (
                <div className="mt-3 space-y-1.5">
                  {openingHours.weekday_text.map((day, idx) => {
                    const [dayName, hours] = day.split(': ');
                    const today = new Date().getDay();
                    const isToday = idx === (today === 0 ? 6 : today - 1);

                    return (
                      <div
                        key={idx}
                        className={`flex justify-between text-sm ${
                          isToday
                            ? 'font-medium text-gray-900 dark:text-white'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span>{dayName}</span>
                        <span>{hours}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact & Links */}
      {(hasContactInfo || hasReservation) && (
        <div className="border-t border-gray-200 dark:border-gray-800 p-5">
          <div className="flex flex-wrap gap-2">
            {/* Phone */}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}

            {/* Website */}
            {website && (
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Globe className="w-4 h-4" />
                Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Instagram */}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </a>
            )}

            {/* Reservation links */}
            {(bookingUrl || resyUrl || opentableUrl) && (
              <a
                href={resyUrl || opentableUrl || bookingUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Make Reservation
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
