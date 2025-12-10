'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Check, MapPin } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

interface AddPlaceDropdownProps {
  onPlaceAdded?: () => void;
}

export function AddPlaceDropdown({ onPlaceAdded }: AddPlaceDropdownProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  // Search destinations
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('destinations')
          .select('slug, name, city, category, image')
          .or(`name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
          .limit(10);

        if (!error && data) {
          setResults(data);
        }
      } catch (error) {
        console.error('Error searching destinations:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddPlace = async (destination: any) => {
    if (!user) return;

    setAdding(destination.slug);
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('visited_places')
        .select('id')
        .eq('user_id', user.id)
        .eq('destination_slug', destination.slug)
        .maybeSingle();

      if (existing) {
        toast.info('You already marked this place as visited');
        setAdding(null);
        return;
      }

      // Add to visited
      const { error } = await (supabase
        .from('visited_places')
        .insert as any)({
          user_id: user.id,
          destination_slug: destination.slug,
          visited_at: new Date().toISOString()
        });

      if (error) throw error;

      // Success feedback
      setSearchQuery('');
      setResults([]);
      setIsOpen(false);

      if (onPlaceAdded) {
        onPlaceAdded();
      }
    } catch (error) {
      console.error('Error adding place:', error);
      toast.error('Failed to add place. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const capitalizeCity = (city: string) => {
    return city
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button className="rounded-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Place
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search places..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="p-8 text-center">
                <Spinner className="size-6 mx-auto text-gray-400" />
                <p className="text-xs text-gray-500 mt-2">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>
                {searchQuery ? 'No places found' : 'Start typing to search'}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((destination) => (
                  <CommandItem
                    key={destination.slug}
                    value={destination.slug}
                    onSelect={() => handleAddPlace(destination)}
                    disabled={adding === destination.slug}
                    className="flex items-center gap-3 p-2"
                  >
                    {/* Image */}
                    <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                      {destination.image ? (
                        <Image
                          src={destination.image}
                          alt={destination.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {destination.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {capitalizeCity(destination.city)} · {destination.category}
                      </div>
                    </div>

                    {/* Add Icon */}
                    {adding === destination.slug ? (
                      <Spinner className="size-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-gray-400 flex-shrink-0 opacity-0 group-aria-selected:opacity-100" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
