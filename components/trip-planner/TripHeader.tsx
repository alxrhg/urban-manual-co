'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Settings, Map, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Trip } from '@/types/trip';
import type { PlannerWarning } from '@/lib/intelligence/types';

interface TripHeaderProps {
  trip: Trip;
  destinations: string[];
  warnings: PlannerWarning[];
  onSettingsClick: () => void;
  onMapClick: () => void;
  onDismissWarning: (id: string) => void;
}

export function TripHeader({
  trip,
  destinations,
  warnings,
  onSettingsClick,
  onMapClick,
  onDismissWarning,
}: TripHeaderProps) {
  const destinationsDisplay = destinations.join(', ') || 'No destination set';

  // Format date range
  const formatDateRange = () => {
    if (!trip.start_date) return null;
    const start = new Date(trip.start_date);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (!trip.end_date) return startStr;
    const end = new Date(trip.end_date);
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `${startStr} - ${endStr}`;
  };

  const criticalWarnings = warnings.filter(w => w.severity === 'high');
  const hasWarnings = warnings.length > 0;

  return (
    <div className="mb-6 sm:mb-8">
      {/* Navigation Row */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <Link
          href="/trips"
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Trips</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Warnings Popover */}
          {hasWarnings && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <AlertTriangle className={`w-5 h-5 ${criticalWarnings.length > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
                  {criticalWarnings.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {criticalWarnings.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Schedule Alerts</h4>
                  {warnings.map((warning) => (
                    <div
                      key={warning.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                    >
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        warning.severity === 'high' ? 'text-red-500' :
                        warning.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-gray-300">{warning.message}</p>
                        {warning.suggestion && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{warning.suggestion}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onDismissWarning(warning.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button variant="ghost" size="icon" onClick={onMapClick}>
            <Map className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSettingsClick}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Trip Info */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
          {trip.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {destinationsDisplay}
          </Badge>
          {formatDateRange() && (
            <Badge variant="outline" className="font-normal">
              {formatDateRange()}
            </Badge>
          )}
          <Badge
            variant="outline"
            className={`font-normal capitalize ${
              trip.status === 'ongoing' ? 'border-green-500 text-green-600 dark:text-green-400' :
              trip.status === 'upcoming' ? 'border-blue-500 text-blue-600 dark:text-blue-400' :
              trip.status === 'completed' ? 'border-gray-400 text-gray-500' :
              'border-gray-300 text-gray-500'
            }`}
          >
            {trip.status}
          </Badge>
        </div>
      </div>

      {/* Cover Image (if exists) */}
      {trip.cover_image && (
        <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden mt-4">
          <Image
            src={trip.cover_image}
            alt={trip.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}
    </div>
  );
}
