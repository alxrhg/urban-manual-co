'use client';

import { useMemo } from 'react';
import {
  Plane,
  Building2,
  UtensilsCrossed,
  Landmark,
  Wine,
  Coffee,
  Calendar,
  MapPin,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ItineraryItem, ItineraryItemNotes } from '@/types/trip';
import type { Destination } from '@/types/destination';
import type { Flight, HotelBooking, TripSettings, ItemCategory, EnrichedItem } from './types';
import { getItemCategory } from './types';
import PanelHeader from './PanelHeader';
import FlightPanelContent from './FlightPanelContent';
import HotelPanelContent from './HotelPanelContent';
import RestaurantPanelContent from './RestaurantPanelContent';
import AttractionPanelContent from './AttractionPanelContent';

interface ItemDetailPanelProps {
  item: ItineraryItem;
  destination?: Destination;
  flight?: Flight;
  hotel?: HotelBooking;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<ItineraryItem>) => void;
  onUpdateFlight?: (updates: Partial<Flight>) => void;
  onUpdateHotel?: (updates: Partial<HotelBooking>) => void;
  onRemove: () => void;
  tripSettings: TripSettings;
}

/**
 * ItemDetailPanel - Container that wraps all panel types
 *
 * Renders the appropriate panel content based on item category:
 * - flight → FlightPanelContent
 * - hotel_overnight → HotelPanelContent
 * - restaurant → RestaurantPanelContent
 * - attraction → AttractionPanelContent
 * - others → Generic content
 */
export default function ItemDetailPanel({
  item,
  destination,
  flight,
  hotel,
  isOpen,
  onClose,
  onUpdate,
  onUpdateFlight,
  onUpdateHotel,
  onRemove,
  tripSettings,
}: ItemDetailPanelProps) {
  // Parse notes for category detection
  const parsedNotes: ItineraryItemNotes | null = useMemo(() => {
    if (!item.notes) return null;
    try {
      return JSON.parse(item.notes);
    } catch {
      return { raw: item.notes };
    }
  }, [item.notes]);

  // Create enriched item for category detection
  const enrichedItem: EnrichedItem = useMemo(
    () => ({
      ...item,
      parsedNotes,
      destination,
    }),
    [item, parsedNotes, destination]
  );

  // Determine item category
  const category = useMemo(() => getItemCategory(enrichedItem), [enrichedItem]);

  // Get header info based on category
  const headerInfo = useMemo(() => {
    switch (category) {
      case 'flight':
        return {
          icon: <Plane className="w-5 h-5" />,
          title: flight
            ? `${flight.airline} ${flight.flightNumber}`
            : parsedNotes?.airline
              ? `${parsedNotes.airline} ${parsedNotes.flightNumber || ''}`
              : item.title,
          subtitle: 'Flight',
        };
      case 'hotel_overnight':
        return {
          icon: <Building2 className="w-5 h-5" />,
          title: hotel?.name || destination?.name || item.title,
          subtitle: 'Hotel',
        };
      case 'restaurant':
        return {
          icon: <UtensilsCrossed className="w-5 h-5" />,
          title: destination?.name || item.title,
          subtitle: destination?.category || 'Restaurant',
        };
      case 'bar':
        return {
          icon: <Wine className="w-5 h-5" />,
          title: destination?.name || item.title,
          subtitle: destination?.category || 'Bar',
        };
      case 'cafe':
        return {
          icon: <Coffee className="w-5 h-5" />,
          title: destination?.name || item.title,
          subtitle: destination?.category || 'Cafe',
        };
      case 'attraction':
        return {
          icon: <Landmark className="w-5 h-5" />,
          title: destination?.name || item.title,
          subtitle: destination?.category || 'Attraction',
        };
      case 'event':
        return {
          icon: <Calendar className="w-5 h-5" />,
          title: item.title,
          subtitle: parsedNotes?.eventType || 'Event',
        };
      default:
        return {
          icon: <MapPin className="w-5 h-5" />,
          title: destination?.name || item.title,
          subtitle: destination?.category || 'Place',
        };
    }
  }, [category, flight, hotel, destination, item.title, parsedNotes]);

  // Handle edit action
  const handleEdit = () => {
    // For now, this could open an edit mode or drawer
    // Implementation depends on the editing UX pattern
    console.log('Edit item:', item.id);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <PanelHeader
        icon={headerInfo.icon}
        title={headerInfo.title}
        subtitle={headerInfo.subtitle}
        onEdit={handleEdit}
        onClose={onClose}
      />

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        {/* Category-specific content */}
        {category === 'flight' && flight && onUpdateFlight && (
          <FlightPanelContent
            flight={flight}
            onUpdate={onUpdateFlight}
            tripSettings={tripSettings}
          />
        )}

        {category === 'hotel_overnight' && hotel && onUpdateHotel && (
          <HotelPanelContent
            hotel={hotel}
            onUpdate={onUpdateHotel}
            tripSettings={tripSettings}
          />
        )}

        {category === 'restaurant' && (
          <RestaurantPanelContent
            item={item}
            destination={destination}
            onUpdate={onUpdate}
            tripSettings={tripSettings}
          />
        )}

        {(category === 'attraction' || category === 'event') && (
          <AttractionPanelContent
            item={item}
            destination={destination}
            onUpdate={onUpdate}
            tripSettings={tripSettings}
          />
        )}

        {/* Generic content for bar, cafe, custom */}
        {(category === 'bar' || category === 'cafe' || category === 'custom') && (
          <GenericPanelContent
            item={item}
            destination={destination}
            onUpdate={onUpdate}
            tripSettings={tripSettings}
          />
        )}

        {/* Remove Button */}
        <div className="p-4 pt-2">
          <Separator className="mb-4" />
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
            Remove from itinerary
          </Button>
        </div>
      </ScrollArea>
    </aside>
  );
}

/**
 * Generic panel content for categories without specialized panels
 */
interface GenericPanelContentProps {
  item: ItineraryItem;
  destination?: Destination;
  onUpdate: (updates: Partial<ItineraryItem>) => void;
  tripSettings: TripSettings;
}

function GenericPanelContent({
  item,
  destination,
  onUpdate,
  tripSettings,
}: GenericPanelContentProps) {
  // Parse notes
  const parsedNotes: ItineraryItemNotes = item.notes
    ? (() => {
        try {
          return JSON.parse(item.notes);
        } catch {
          return { raw: item.notes };
        }
      })()
    : {};

  const address = destination?.formatted_address || destination?.vicinity || parsedNotes.address;
  const phone = destination?.phone_number || destination?.international_phone_number;
  const website = destination?.website;
  const imageUrl = destination?.image || destination?.image_thumbnail || parsedNotes.image;

  const handleNotesChange = (value: string) => {
    const newNotes = { ...parsedNotes, notes: value };
    onUpdate({ notes: JSON.stringify(newNotes) });
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Image */}
      {imageUrl && (
        <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden -mt-4 -mx-4 w-[calc(100%+2rem)]">
          <img
            src={imageUrl}
            alt={item.title || destination?.name || 'Place'}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {destination?.name || item.title}
        </h2>
        {address && (
          <p className="flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-2">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {address}
          </p>
        )}
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {item.description}
          </p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label
          htmlFor="notes"
          className="text-sm font-medium text-gray-900 dark:text-white"
        >
          Notes
        </Label>
        <Textarea
          id="notes"
          value={parsedNotes.notes || parsedNotes.raw || ''}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes..."
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Quick Actions */}
      {(phone || website || address) && (
        <div className="space-y-2">
          {phone && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(`tel:${phone}`, '_self')}
            >
              Call
            </Button>
          )}
          {address && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                const query = encodeURIComponent(
                  address || item.title || destination?.name || ''
                );
                window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
              }}
            >
              Directions
            </Button>
          )}
          {website && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.open(website, '_blank')}
            >
              Website
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
