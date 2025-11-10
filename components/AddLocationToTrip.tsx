import React, { useState, useEffect } from 'react';
import { XIcon, SearchIcon, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Destination } from '@/types/destination';

interface TripLocation {
  id: number;
  name: string;
  city: string;
  category: string;
  image: string;
  time?: string;
  notes?: string;
}

interface AddLocationToTripProps {
  onAdd: (location: TripLocation) => void;
  onClose: () => void;
}

export function AddLocationToTrip({ onAdd, onClose }: AddLocationToTripProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchDestinations();
    } else {
      setDestinations([]);
    }
  }, [searchQuery]);

  const searchDestinations = async () => {
    setLoading(true);
    try {
      const supabaseClient = createClient();
      if (!supabaseClient) return;

      const { data, error } = await supabaseClient
        .from('destinations')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setDestinations((data || []) as Destination[]);
    } catch (error) {
      console.error('Error searching destinations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = (destination: Destination) => {
    const location: TripLocation = {
      id: destination.id || 0,
      name: destination.name,
      city: destination.city || '',
      category: destination.category || '',
      image: destination.image || '/placeholder-image.jpg',
    };
    onAdd(location);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden border border-neutral-200 flex flex-col">
        <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-[11px] text-neutral-400 tracking-[0.2em] uppercase">
            Add Location
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-900" />
          </button>
        </div>

        <div className="p-6 flex-shrink-0">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations..."
              className="w-full pl-10 pr-4 py-3 border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : destinations.length === 0 && searchQuery.trim().length >= 2 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-500">No destinations found</p>
            </div>
          ) : destinations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-neutral-400">Start typing to search destinations</p>
            </div>
          ) : (
            <div className="space-y-2">
              {destinations.map((destination) => (
                <button
                  key={destination.slug}
                  onClick={() => handleSelectDestination(destination)}
                  className="w-full flex items-center gap-4 p-4 border border-neutral-200 hover:border-neutral-300 transition-colors text-left group"
                >
                  {destination.image && (
                    <div className="w-16 h-16 flex-shrink-0 overflow-hidden bg-neutral-100">
                      <img
                        src={destination.image}
                        alt={destination.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-normal text-neutral-900 truncate">
                      {destination.name}
                    </h4>
                    <p className="text-[11px] text-neutral-500 tracking-wide">
                      {destination.category}
                      {destination.city && ` • ${destination.city}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

