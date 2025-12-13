'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Navigation,
  Trash2,
  Heart,
  Baby,
  Sun,
  Utensils,
  Camera,
  Star,
  ChevronDown,
  Check,
  Plane,
  Hotel,
  ImageOff,
} from 'lucide-react';
import {
  TripItem,
  ItemPriority,
  BookingStatus,
  ItemTag,
  useTripBuilder,
} from '@/contexts/TripBuilderContext';

// ============================================
// TYPES
// ============================================

interface ItemEditorProps {
  item: TripItem;
  onClose: () => void;
}

type CardType = 'place' | 'restaurant' | 'hotel' | 'flight';

// ============================================
// CONSTANTS
// ============================================

const PRIORITY_OPTIONS: { value: ItemPriority; label: string; color: string }[] = [
  { value: 'must_do', label: 'Must do', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'want_to', label: 'Want to', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
  { value: 'if_time', label: 'If time', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const BOOKING_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: 'not_set', label: 'Not set' },
  { value: 'booked', label: 'Booked' },
  { value: 'need_to_book', label: 'Need to book' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'waitlist', label: 'On waitlist' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

const TAG_OPTIONS: { value: ItemTag; label: string; icon: typeof Heart }[] = [
  { value: 'romantic', label: 'Romantic', icon: Heart },
  { value: 'kid_friendly', label: 'Kid-friendly', icon: Baby },
  { value: 'outdoor', label: 'Outdoor', icon: Sun },
  { value: 'foodie', label: 'Foodie', icon: Utensils },
  { value: 'photo_spot', label: 'Photo spot', icon: Camera },
  { value: 'local_favorite', label: 'Local favorite', icon: Star },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function detectCardType(item: TripItem): CardType {
  const category = (item.destination.category || '').toLowerCase();

  if (category.includes('hotel') || category.includes('resort') || category.includes('ryokan')) {
    return 'hotel';
  }
  if (category.includes('restaurant') || category.includes('dining') || category.includes('cafe')) {
    return 'restaurant';
  }
  // Check notes for flight data
  if (item.notes) {
    try {
      const parsed = JSON.parse(item.notes);
      if (parsed.type === 'flight') return 'flight';
    } catch {
      // Not JSON, continue
    }
  }
  return 'place';
}

function getTypeLabel(type: CardType): string {
  switch (type) {
    case 'hotel': return 'HOTEL';
    case 'restaurant': return 'RESTAURANT';
    case 'flight': return 'FLIGHT';
    default: return 'PLACE';
  }
}

function getTypeIcon(type: CardType) {
  switch (type) {
    case 'hotel': return Hotel;
    case 'flight': return Plane;
    default: return MapPin;
  }
}

// ============================================
// COMPONENTS
// ============================================

function PriorityPills({
  value,
  onChange,
}: {
  value?: ItemPriority;
  onChange: (priority: ItemPriority | undefined) => void;
}) {
  return (
    <div className="flex gap-2">
      {PRIORITY_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(isActive ? undefined : option.value)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium border transition-all
              ${isActive
                ? option.color
                : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function DurationSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (duration: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = DURATION_OPTIONS.find(opt => opt.value === value)
    || DURATION_OPTIONS.find(opt => opt.value === 60)!;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-20 top-full left-0 right-0 mt-1 py-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
          >
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                  ${option.value === value
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50'
                  }
                `}
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

function BookingSelect({
  value,
  onChange,
}: {
  value?: BookingStatus;
  onChange: (booking: BookingStatus | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = BOOKING_OPTIONS.find(opt => opt.value === value)
    || BOOKING_OPTIONS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white hover:border-gray-600 transition-colors"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-20 top-full left-0 right-0 mt-1 py-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl"
          >
            {BOOKING_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value === 'not_set' ? undefined : option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 text-sm transition-colors
                  ${option.value === (value || 'not_set')
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-700/50'
                  }
                `}
              >
                <span>{option.label}</span>
                {option.value === (value || 'not_set') && <Check className="w-4 h-4" />}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}

function TagPills({
  value = [],
  onChange,
}: {
  value?: ItemTag[];
  onChange: (tags: ItemTag[]) => void;
}) {
  const toggleTag = (tag: ItemTag) => {
    if (value.includes(tag)) {
      onChange(value.filter(t => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TAG_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value.includes(option.value);
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
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ItemEditor({ item, onClose }: ItemEditorProps) {
  const {
    updateItemTime,
    updateItemDuration,
    updateItemNotes,
    updateItemPriority,
    updateItemBooking,
    updateItemTags,
    removeFromTrip,
  } = useTripBuilder();

  // Local state for controlled inputs
  const [timeValue, setTimeValue] = useState(item.timeSlot || '');
  const [notesValue, setNotesValue] = useState(item.notes || '');

  // Sync with item changes
  useEffect(() => {
    setTimeValue(item.timeSlot || '');
    setNotesValue(item.notes || '');
  }, [item.timeSlot, item.notes]);

  const cardType = detectCardType(item);
  const TypeIcon = getTypeIcon(cardType);
  const destination = item.destination;

  // Handlers
  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    updateItemTime(item.id, newTime);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotesValue(newNotes);
    updateItemNotes(item.id, newNotes);
  };

  const handleRemove = () => {
    removeFromTrip(item.id);
    onClose();
  };

  const handleDirections = () => {
    if (destination.latitude && destination.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
      window.open(url, '_blank');
    } else if (destination.name && destination.city) {
      const query = encodeURIComponent(`${destination.name}, ${destination.city}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-gray-900"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gray-800">
            <TypeIcon className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {getTypeLabel(cardType)}
            </span>
            <h2 className="text-lg font-semibold text-white leading-tight">
              {destination.name}
            </h2>
            <p className="text-sm text-gray-400 capitalize">
              {destination.category?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div className="relative h-44 bg-gray-800">
          {destination.image || destination.image_thumbnail ? (
            <Image
              src={destination.image || destination.image_thumbnail || ''}
              alt={destination.name}
              fill
              className="object-cover"
              sizes="400px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="w-12 h-12 text-gray-600" />
            </div>
          )}
        </div>

        {/* Editor Sections */}
        <div className="p-4 space-y-6">
          {/* Priority */}
          <div>
            <PriorityPills
              value={item.priority}
              onChange={(priority) => updateItemPriority(item.id, priority)}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="time"
                  value={timeValue}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Duration
              </label>
              <DurationSelect
                value={item.duration}
                onChange={(duration) => updateItemDuration(item.id, duration)}
              />
            </div>
          </div>

          {/* Booking */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Booking
            </label>
            <BookingSelect
              value={item.booking}
              onChange={(booking) => updateItemBooking(item.id, booking)}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Tags
            </label>
            <TagPills
              value={item.tags}
              onChange={(tags) => updateItemTags(item.id, tags)}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Notes
            </label>
            <textarea
              value={notesValue}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDirections}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Directions
            </button>

            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove from itinerary
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
